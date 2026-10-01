import { PLATFORM } from '@/constants/platform';

export const {
  store_hash: storeHash,
  channel_id: channelId,
  disable_logout_button: disableLogoutButton,
  platform = PLATFORM.CUSTOM,
} = window.B3.setting;

export const isBigCommercePlatform = (value: string = platform) => value === PLATFORM.BIGCOMMERCE;

export const isCatalystPlatform = (value: string = platform) => value === PLATFORM.CATALYST;

// `channel_id` is typed as a number but arrives at runtime from `window.B3.setting`,
// so a string `'1'` would slip past a strict compare and build `store-<hash>-1`,
// which is not the default channel's host. Coerce before comparing.
const generateBcStorefrontAPIBaseUrl = () => {
  if (isBigCommercePlatform()) return window.origin;

  const channel = Number(channelId);

  if (!channel || channel === 1) return `https://store-${storeHash}.mybigcommerce.com`;

  return `https://store-${storeHash}-${channel}.mybigcommerce.com`;
};

export const BigCommerceStorefrontAPIBaseURL = generateBcStorefrontAPIBaseUrl();
