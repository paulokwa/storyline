import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppNav from '@/components/app/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    return (
        <div className="app-shell-viewport bg-slate-50 flex min-h-0 flex-col overflow-hidden">
            <AppNav user={user} />
            <main className="app-shell-main flex min-h-0 flex-col overflow-hidden">
                {children}
            </main>
        </div>
    )
}
