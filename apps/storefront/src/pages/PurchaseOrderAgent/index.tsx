import { Box, CircularProgress } from '@mui/material';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- install with: pnpm add @takeshape/purchase-order-chat
import { PurchaseOrderAgent } from '@takeshape/purchase-order-chat';

import { useAppSelector } from '@/store';
import {
  BigCommerceStorefrontAPIBaseURL,
  channelId,
  isBigCommercePlatform,
} from '@/utils/basicConfig';

/**
 * The agent creates carts and drives checkout through the BigCommerce GraphQL
 * Storefront API, so it has to run in the same context as the signed-in buyer.
 *
 * On a Stencil storefront that works: the portal mints a storefront token for the
 * session (`company.tokens.bcGraphqlToken`, issued with the page origin in
 * `allowed_cors_origins`) and talks to the store's own same-origin `/graphql`. The
 * shopper session cookie rides along and the cart belongs to the signed-in customer.
 *
 * Off Stencil there is no such token: `getBCGraphqlToken` early-returns `undefined`
 * unless `isBigCommercePlatform()`, so `bcGraphqlToken` is never populated. The only
 * credential available is the static `VITE_STOREFRONT_TOKEN`, which is anonymous, so
 * carts it creates have `customer_id: null`. BigCommerce cannot hand a guest cart to
 * a signed-in session, which is why checkout lands on an empty cart. Binding the cart
 * to the buyer needs a customer-impersonation token held server-side (see
 * `netlify/functions/bc-graphql.mjs`); it must never be shipped to the browser.
 *
 * Whichever branch is taken, the endpoint must be the buyer's own channel. Products
 * are assigned per channel, so querying the default channel returns no matches rather
 * than an error -- the agent reports "found 0 products" for a catalogue that is fine.
 * `BigCommerceStorefrontAPIBaseURL` is already channel-aware; the env override must be
 * too (the Netlify proxy derives it from `VITE_CHANNEL_ID`).
 */
function PurchaseOrderAgentPage() {
  const bcGraphqlToken = useAppSelector(({ company }) => company.tokens.bcGraphqlToken);
  const b2bToken = useAppSelector(({ company }) => company.tokens.B2BToken);

  const isOnBigCommerceStorefront = isBigCommercePlatform();
  const storefrontToken = isOnBigCommerceStorefront
    ? bcGraphqlToken
    : import.meta.env.VITE_STOREFRONT_TOKEN || '';
  const endpoint = isOnBigCommerceStorefront
    ? `${BigCommerceStorefrontAPIBaseURL}/graphql`
    : import.meta.env.VITE_BC_GRAPHQL_ENDPOINT || `${BigCommerceStorefrontAPIBaseURL}/graphql`;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        height: '100%',
        '& > *': { flex: 1, width: '100%' },
      }}
    >
      {storefrontToken ? (
        <PurchaseOrderAgent
          takeshape={{
            projectId: import.meta.env.VITE_PROJECT_ID || '',
            apiKey: import.meta.env.VITE_TAKESHAPE_API_KEY || '',
          }}
          bigcommerce={{
            endpoint,
            storefrontToken,
            channelId: Number(channelId) || Number(import.meta.env.VITE_CHANNEL_ID) || 1,
            // Lets the agent read the buyer's company addresses from B2B Edition.
            getB2BJwt: async () => b2bToken || null,
          }}
          productPath="/product/:sku"
          checkoutUrl={import.meta.env.VITE_CHECKOUT_URL || ''}
        />
      ) : (
        // `bcGraphqlToken` is fetched during app bootstrap; building the client
        // before it lands would fire unauthenticated requests at BigCommerce.
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}

export default PurchaseOrderAgentPage;
