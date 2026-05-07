function isLocalhost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function isNetlifyHost(hostname: string) {
  return hostname.endsWith('.netlify.app');
}

function parseUrl(value?: string | null) {
  if (!value) return null;

  try {
    return new URL(value.includes('http') ? value : `https://${value}`);
  } catch {
    return null;
  }
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`;
}

export const getURL = (currentOrigin?: string) => {
  const currentUrl = parseUrl(currentOrigin);
  const configuredSiteUrl = parseUrl(process?.env?.NEXT_PUBLIC_SITE_URL);
  const vercelUrl = parseUrl(process?.env?.NEXT_PUBLIC_VERCEL_URL);

  if (currentUrl && isLocalhost(currentUrl.hostname)) {
    return ensureTrailingSlash(currentUrl.origin);
  }

  if (
    configuredSiteUrl &&
    currentUrl &&
    isNetlifyHost(currentUrl.hostname) &&
    currentUrl.hostname !== configuredSiteUrl.hostname
  ) {
    return ensureTrailingSlash(configuredSiteUrl.origin);
  }

  if (currentUrl) {
    return ensureTrailingSlash(currentUrl.origin);
  }

  if (configuredSiteUrl) {
    return ensureTrailingSlash(configuredSiteUrl.origin);
  }

  if (vercelUrl) {
    return ensureTrailingSlash(vercelUrl.origin);
  }

  return 'http://localhost:3000/';
};
