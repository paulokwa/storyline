// Feature flags read from NEXT_PUBLIC_* env vars at build time.
// Default is OFF when the var is absent or not exactly 'true'.
export const featureFlags = {
    appleOAuth: process.env.NEXT_PUBLIC_ENABLE_APPLE_OAUTH === 'true',
} as const
