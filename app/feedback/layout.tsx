import { requireVerifiedUser } from '@/lib/supabase/auth'

export default async function FeedbackLayout({ children }: { children: React.ReactNode }) {
  await requireVerifiedUser()

  return children
}
