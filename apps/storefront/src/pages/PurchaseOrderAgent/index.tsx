import { Box, CircularProgress } from '@mui/material';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- install with: pnpm add @takeshape/purchase-order-chat
import { PurchaseOrderAgent } from '@takeshape/purchase-order-chat';

import { useAppSelector } from '@/store';
import { BigCommerceStorefrontAPIBaseURL, channelId, platform } from '@/utils/basicConfig';

/**
 * The agent creates carts and drives checkout through the BigCommerce GraphQL
 * Storefront API, so it has to run in the same context as the signed-in buyer.
 *
 * On a BigCommerce storefront that means using the storefront token the buyer
 * portal already mints for this session (`company.tokens.bcGraphqlToken`, issued
 * with the page origin in `allowed_cors_origins`) and talking to the store's own
 * same-origin `/graphql`. The shopper session cookie then rides along and the cart
 * belongs to the signed-in customer.
 *
 * Routing this through a proxy with a static, anonymous token instead produces a
 * guest cart (`customer_id: null`). BigCommerce cannot hand a guest cart to a
 * signed-in session, so checkout lands on an empty cart. The env vars below are
 * kept only as a fallback for non-BigCommerce/headless hosting, where there is no
 * shopper session to inherit.
 */
function PurchaseOrderAgentPage() {
  const bcGraphqlToken = useAppSelector(({ company }) => company.tokens.bcGraphqlToken);
  const b2bToken = useAppSelector(({ company }) => company.tokens.B2BToken);

  const isOnBigCommerceStorefront = platform === 'bigcommerce';
  const storefrontToken = isOnBigCommerceStorefront
    ? bcGraphqlToken
    : import.meta.env.VITE_STOREFRONT_TOKEN || '';
  const endpoint = isOnBigCommerceStorefront
    ? `${BigCommerceStorefrontAPIBaseURL}/graphql`
    : import.meta.env.VITE_BC_GRAPHQL_ENDPOINT ||
      `https://store-${import.meta.env.VITE_STORE_HASH}.mybigcommerce.com/graphql`;

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
