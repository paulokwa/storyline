import { requireVerifiedUser } from '@/lib/supabase/auth'
import AppNav from '@/components/app/AppNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const user = await requireVerifiedUser()

    return (
        <div className="app-shell-viewport bg-slate-50 flex min-h-0 flex-col overflow-hidden">
            <AppNav user={user} />
            <main className="app-shell-main flex min-h-0 flex-col overflow-hidden">
                {children}
            </main>
        </div>
    )
}
