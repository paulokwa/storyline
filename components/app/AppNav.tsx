'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PenLine, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function AppNav({ user }: { user: User }) {
    const router = useRouter()
    const pathname = usePathname()

    async function handleSignOut() {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const displayName = (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'Writer'

    return (
        <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
                <Link href="/library" className="flex items-center gap-2 text-slate-800 hover:text-indigo-600 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                        <PenLine className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-lg">Storyline</span>
                </Link>

                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 hidden sm:block">Hi, {displayName}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSignOut}
                        className="text-slate-500 hover:text-slate-800 gap-1.5"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Sign out</span>
                    </Button>
                </div>
            </div>
        </nav>
    )
}
