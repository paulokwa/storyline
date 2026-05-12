const PRODUCTION_AUTH_CALLBACK_URL = 'https://storyline-paulokwa-v2.netlify.app/api/auth/callback'

function isLocalOrigin(origin: string) {
  try {
    const url = new URL(origin)
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
  } catch {
    return false
  }
}

export function getOAuthCallbackUrl(currentOrigin?: string) {
  const origin = currentOrigin ?? (typeof window !== 'undefined' ? window.location.origin : '')

  if (origin && isLocalOrigin(origin)) {
    return `${new URL(origin).origin}/api/auth/callback`
  }

  return PRODUCTION_AUTH_CALLBACK_URL
}

// Backward-compatible alias kept for existing Google OAuth callers.
export function getGoogleOAuthCallbackUrl(currentOrigin?: string) {
  return getOAuthCallbackUrl(currentOrigin)
}

export const LOCAL_FIRST_AUTH_REASSURANCE =
  'Signing in does not automatically upload local projects. Local projects stay on this device unless you enable Cloud Sync.'
