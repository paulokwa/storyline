const ADMIN_EMAILS = ['skytra7@gmail.com', 'mwake.dev@gmail.com'] as const

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? ''
}

export const APPROVED_ADMIN_EMAILS = [...ADMIN_EMAILS]

export function isAdminEmail(email: string | null | undefined) {
  return ADMIN_EMAILS.includes(normalizeEmail(email) as (typeof ADMIN_EMAILS)[number])
}
