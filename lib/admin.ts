const ADMIN_EMAILS = ['skytra7@gmail.com', 'mwake.dev@gmail.com'] as const

/**
 * Early User / Grandfathering Cutoff Date
 * - If null: All users are considered "Early Users" (Beta ongoing)
 * - If set (e.g., '2024-05-01'): Users created before this date are "Early Users"
 */
export const BETA_CUTOFF_DATE: string | null = null

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? ''
}

export const APPROVED_ADMIN_EMAILS = [...ADMIN_EMAILS]

export function isAdminEmail(email: string | null | undefined) {
  return ADMIN_EMAILS.includes(normalizeEmail(email) as (typeof ADMIN_EMAILS)[number])
}
