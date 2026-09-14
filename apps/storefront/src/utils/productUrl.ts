// Only these can be handed to window.location.href. Accepting absolute URLs means the value is no
// longer guaranteed to be a same-origin path, so a `javascript:` payload would otherwise execute.
const NAVIGABLE_PROTOCOLS = ['http:', 'https:'];

/**
 * Resolves a product URL from B2B GraphQL into an absolute, navigable URL.
 *
 * The API returns either a canonical path (`/product-slug/`) or, for a channel with a storefront
 * URL override, a fully-qualified URL on that channel's own domain. Callers used to build links by
 * concatenating the current origin onto the value, which is correct for a path but corrupts an
 * absolute URL into `https://store.comhttps://channel.example.com/product-slug/` — the storefront
 * answers those with a 500.
 *
 * Returns an empty string when there is nothing safe to navigate to, so callers can skip the
 * navigation rather than assigning `''` to `location.href` and reloading the current page.
 */
function resolveBase(origin?: string): string | undefined {
  if (origin) return origin;

  // window.location.origin is missing in some test environments, where jsdom's Location
  // accessors live on the prototype and so are lost by a `{ ...window.location }` spread.
  if (typeof document !== 'undefined' && document.baseURI) return document.baseURI;

  return undefined;
}

export function resolveProductUrl(
  productUrl: string | null | undefined,
  origin: string = typeof window === 'undefined' ? '' : window.location.origin,
): string {
  const value = productUrl?.trim();

  if (!value) return '';

  let url: URL;

  try {
    // An absolute or protocol-relative value resolves to its own origin and ignores the base;
    // a path resolves against the storefront origin.
    url = new URL(value, resolveBase(origin));
  } catch (_error: unknown) {
    return '';
  }

  if (!NAVIGABLE_PROTOCOLS.includes(url.protocol)) return '';

  return url.toString();
}
