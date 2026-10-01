const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const storeHash = process.env.VITE_STORE_HASH;
  const channelId = process.env.VITE_CHANNEL_ID;

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
