import { describe, expect, it } from 'vitest';

import { resolveProductUrl } from './productUrl';

const ORIGIN = 'https://store-abc.mybigcommerce.com';
const CHANNEL_ORIGIN = 'https://my-custom-storefront.com';

describe('resolveProductUrl', () => {
  it('resolves a canonical path against the storefront origin', () => {
    expect(resolveProductUrl('/product-slug/', ORIGIN)).toBe(`${ORIGIN}/product-slug/`);
  });

  it('keeps an overridden channel URL on its own domain', () => {
    expect(resolveProductUrl(`${CHANNEL_ORIGIN}/product-slug/`, ORIGIN)).toBe(
      `${CHANNEL_ORIGIN}/product-slug/`,
    );
  });

  it('does not concatenate the origin onto an absolute URL', () => {
    // The regression this exists to prevent: `https://store...https://my-custom-storefront.com/...`
    expect(resolveProductUrl(`${CHANNEL_ORIGIN}/product-slug/`, ORIGIN)).not.toContain(
      `${ORIGIN}https://`,
    );
  });

  it('resolves a protocol-relative URL against the origin protocol', () => {
    expect(resolveProductUrl('//my-custom-storefront.com/product-slug/', ORIGIN)).toBe(
      `${CHANNEL_ORIGIN}/product-slug/`,
    );
  });

  it('preserves query strings and fragments', () => {
    expect(resolveProductUrl('/product-slug/?variant=2#tab', ORIGIN)).toBe(
      `${ORIGIN}/product-slug/?variant=2#tab`,
    );
  });

  it('resolves a relative path without a leading slash', () => {
    expect(resolveProductUrl('product-slug/', ORIGIN)).toBe(`${ORIGIN}/product-slug/`);
  });

  it.each([undefined, null, '', '   '])('returns an empty string for %p', (value) => {
    expect(resolveProductUrl(value, ORIGIN)).toBe('');
  });

  // eslint-disable-next-line no-script-url -- the point of the test is to reject this
  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'mailto:a@b.com'])(
    'refuses the non-navigable protocol in %p',
    (value) => {
      expect(resolveProductUrl(value, ORIGIN)).toBe('');
    },
  );
});
