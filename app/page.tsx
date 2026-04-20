import { redirect } from 'next/navigation'
import Showcase from '@/components/marketing/Showcase'
import { getVerifiedUser } from '@/lib/supabase/auth'

export default async function Home() {
  const user = await getVerifiedUser()

  if (user) {
    redirect('/library')
  }

  return <Showcase />
}
