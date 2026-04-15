import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Showcase from '@/components/marketing/Showcase'

export default async function Home() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect('/library')
  }

  return <Showcase />
}
