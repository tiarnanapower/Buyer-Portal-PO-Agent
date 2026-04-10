const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const storeHash = process.env.VITE_STORE_HASH;

  // Forward headers but strip origin/host so BigCommerce doesn't reject the JWT
  const forwardHeaders = Object.fromEntries(
    Object.entries(event.headers).filter(
      ([key]) => !['origin', 'host'].includes(key.toLowerCase()),
    ),
  );

  const response = await fetch(
    `https://store-${storeHash}.mybigcommerce.com/graphql`,
    {
      method: 'POST',
      headers: forwardHeaders,
      body: event.body,
    },
  );

  const data = await response.text();

  return {
    statusCode: response.status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: data,
  };
};
