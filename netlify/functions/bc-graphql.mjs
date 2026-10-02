import { createHash } from 'node:crypto';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${b2bToken}`,
    },
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

const cachedCustomerId = async (b2bToken) => {
  const key = createHash('sha256').update(b2bToken).digest('hex');
  const hit = identityCache.get(key);

  if (hit && hit.expiresAt > Date.now()) return hit.bcId;

  const bcId = await resolveCustomerId(b2bToken);

  identityCache.set(key, { bcId, expiresAt: Date.now() + IDENTITY_TTL_MS });

  return bcId;
};

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
  const FORWARDED_HEADERS = ['authorization', 'content-type', 'accept'];
  const forwardHeaders = Object.fromEntries(
    Object.entries(event.headers).filter(([key]) =>
      FORWARDED_HEADERS.includes(key.toLowerCase()),
    ),
  );

  const bearer = Object.entries(event.headers)
    .find(([key]) => key.toLowerCase() === 'authorization')?.[1]
    ?.replace(/^Bearer\s+/i, '');

  // A B2B token identifies the buyer but cannot talk to the Storefront API. Swap
  // it for the impersonation token and tell BigCommerce who the cart belongs to;
  // without this the cart is created with `customer_id: null` and checkout hands
  // the buyer a guest cart with no company pricing or saved addresses.
  if (bearer && !isBigCommerceStorefrontToken(decodeJwtPayload(bearer))) {
    const bcId = impersonationToken ? await cachedCustomerId(bearer) : null;

    if (bcId) {
      forwardHeaders.authorization = `Bearer ${impersonationToken}`;
      forwardHeaders['x-bc-customer-id'] = String(bcId);
    } else if (anonymousToken) {
      // Not signed in, token rejected, or impersonation not configured. Fall back
      // to anonymous rather than failing: the agent still works, as a guest.
      forwardHeaders.authorization = `Bearer ${anonymousToken}`;
      delete forwardHeaders['x-bc-customer-id'];
    }
  }

  const response = await fetch(`${storefrontOrigin(storeHash, channelId)}/graphql`, {
    method: 'POST',
    headers: forwardHeaders,
    body: event.body,
  });

  const data = await response.text();

  return {
    statusCode: response.status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: data,
  };
};
