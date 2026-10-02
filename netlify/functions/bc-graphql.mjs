import { createHash } from 'node:crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Expose-Headers': 'X-Po-Auth-Mode',
};

const B2B_GRAPHQL_URL = 'https://api-b2b.bigcommerce.com/graphql';

// Canonical storefront host for a channel. Channel 1 is the store's default
// storefront and has no suffix; every other channel is `-<channelId>`.
//
// Getting this wrong is silent rather than loud: BigCommerce answers happily on
// the wrong channel, it just answers about a catalogue the buyer cannot see, so
// product lookups come back empty instead of erroring.
const storefrontOrigin = (storeHash, channelId) =>
  !channelId || Number(channelId) === 1
    ? `https://store-${storeHash}.mybigcommerce.com`
    : `https://store-${storeHash}-${Number(channelId)}.mybigcommerce.com`;

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

// BigCommerce storefront tokens are issued by `BC` and carry the channels they
// cover in `cid`. Anything else reaching us is a B2B storefront token, which we
// exchange for the buyer's identity below.
const isBigCommerceStorefrontToken = (claims) =>
  claims?.iss === 'BC' && Array.isArray(claims?.cid);

/**
 * Resolve a B2B storefront token to the BigCommerce customer it belongs to.
 *
 * The B2B API is the authority here: we send it the token and it tells us whose
 * it is. That is the whole security model -- the customer id is never taken from
 * anything the browser said, only from what B2B Edition confirms. A forged or
 * expired token simply fails to resolve and the request falls back to anonymous.
 */
const resolveCustomerId = async (b2bToken) => {
  const response = await fetch(B2B_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${b2bToken}` },
    body: JSON.stringify({ query: '{ currentUser { bcId } }' }),
  });

  if (!response.ok) return null;

  const body = await response.json().catch(() => null);
  if (body?.errors?.length) return null;

  const bcId = body?.data?.currentUser?.bcId;

  return typeof bcId === 'number' && bcId > 0 ? bcId : null;
};

// The agent issues many GraphQL calls per conversation and the identity behind a
// token does not change, so resolving it once per token is worth a short cache.
// Netlify reuses a warm instance's memory; a cold start just re-resolves.
// Tokens are hashed rather than stored so the cache never holds a credential.
const IDENTITY_TTL_MS = 60_000;
const identityCache = new Map();

const identityKey = (token) => createHash('sha256').update(token).digest('hex');

const lookUpIdentity = async (b2bToken) => {
  const key = identityKey(b2bToken);
  const hit = identityCache.get(key);

  if (hit && hit.expiresAt > Date.now()) return hit;

  const entry = { bcId: await resolveCustomerId(b2bToken), rejected: false };
  entry.expiresAt = Date.now() + IDENTITY_TTL_MS;
  identityCache.set(key, entry);

  return entry;
};

/**
 * A `bcId` that B2B Edition recognises is not automatically one the storefront
 * will accept -- the customer may not exist on this channel. BigCommerce rejects
 * the whole request when that happens rather than degrading, so every query in
 * the conversation fails and the agent reports "0 products found" and "failed to
 * add to cart" for a catalogue and cart that are both fine.
 *
 * Detect that specific rejection so the request can be retried as a guest.
 */
const isCustomerRejection = (status, body) =>
  status === 403 ||
  /Failed retrieving customer|Invalid customer ID|X-Bc-Customer-Id/i.test(body);

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const storeHash = process.env.VITE_STORE_HASH;
  const channelId = process.env.VITE_CHANNEL_ID;

  // Server-side only, and deliberately not VITE_-prefixed: Vite inlines VITE_*
  // into the browser bundle, and an impersonation token can act as ANY customer
  // in the store. It must never leave this function.
  const impersonationToken = process.env.BC_CUSTOMER_IMPERSONATION_TOKEN;
  const anonymousToken = process.env.VITE_STOREFRONT_TOKEN;

  // Forward only what BigCommerce needs. An allowlist rather than a blocklist:
  //  - `origin`/`host` must go, or BigCommerce rejects the storefront JWT.
  //  - `cookie` must go too. If BigCommerce sees a SHOP_SESSION_TOKEN it scopes the
  //    request to that shopper session and ignores the bearer token, which makes
  //    token-created carts and checkouts invisible ("Checkout does not exist.",
  //    null redirectUrls). It also avoids relaying shopper cookies to a third party.
  const FORWARDED_HEADERS = ['content-type', 'accept'];
  const baseHeaders = Object.fromEntries(
    Object.entries(event.headers).filter(([key]) =>
      FORWARDED_HEADERS.includes(key.toLowerCase()),
    ),
  );

  const bearer = Object.entries(event.headers)
    .find(([key]) => key.toLowerCase() === 'authorization')?.[1]
    ?.replace(/^Bearer\s+/i, '');

  const url = `${storefrontOrigin(storeHash, channelId)}/graphql`;
  const call = async (headers) => {
    const response = await fetch(url, { method: 'POST', headers, body: event.body });
    return { status: response.status, body: await response.text() };
  };

  const asGuest = () =>
    call({ ...baseHeaders, authorization: `Bearer ${anonymousToken ?? bearer ?? ''}` });

  let mode = 'passthrough';
  let result;

  const claims = bearer ? decodeJwtPayload(bearer) : null;
  const identity =
    bearer && impersonationToken && !isBigCommerceStorefrontToken(claims)
      ? await lookUpIdentity(bearer)
      : null;

  if (identity?.bcId && !identity.rejected) {
    mode = 'impersonated';
    result = await call({
      ...baseHeaders,
      authorization: `Bearer ${impersonationToken}`,
      'x-bc-customer-id': String(identity.bcId),
    });

    // The buyer is real to B2B Edition but not to this storefront channel. Serve
    // them as a guest rather than failing the whole conversation, and remember so
    // the rest of the session skips straight past impersonation.
    if (isCustomerRejection(result.status, result.body)) {
      identity.rejected = true;
      mode = 'impersonation-rejected';
      result = await asGuest();
    }
  } else if (bearer && !isBigCommerceStorefrontToken(claims)) {
    // A B2B token cannot talk to the Storefront API on its own.
    mode = identity ? 'identity-unresolved' : 'impersonation-not-configured';
    result = await asGuest();
  } else {
    result = await call({ ...baseHeaders, authorization: `Bearer ${bearer ?? ''}` });
  }

  return {
    statusCode: result.status,
    headers: { 'Content-Type': 'application/json', 'X-Po-Auth-Mode': mode, ...CORS_HEADERS },
    body: result.body,
  };
};
