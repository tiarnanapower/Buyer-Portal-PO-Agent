import { Box } from '@mui/material';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- install with: pnpm add @takeshape/purchase-order-chat
import { PurchaseOrderAgent } from '@takeshape/purchase-order-chat';

import { PageProps } from '@/pages/PageProps';

function PurchaseOrderAgentPage(_props: PageProps) {
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
      <PurchaseOrderAgent
        takeshape={{
          projectId: import.meta.env.VITE_PROJECT_ID || '',
          apiKey: import.meta.env.VITE_TAKESHAPE_API_KEY || '',
        }}
        bigcommerce={{
          endpoint: import.meta.env.VITE_BC_GRAPHQL_ENDPOINT ||
            `https://store-${import.meta.env.VITE_STORE_HASH}.mybigcommerce.com/graphql`,
          storefrontToken: import.meta.env.VITE_STOREFRONT_TOKEN || '',
          channelId: Number(import.meta.env.VITE_CHANNEL_ID) || 1,
        }}
        productPath="/product/:sku"
        checkoutUrl={import.meta.env.VITE_CHECKOUT_URL || ''}
      />
    </Box>
  );
}

export default PurchaseOrderAgentPage;
