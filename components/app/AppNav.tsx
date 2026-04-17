'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
    PenLine, LogOut, Settings as SettingsIcon, 
    User as UserIcon, Download, Users, 
    Settings2, BarChart3, HelpCircle, Mail 
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useProjectActionsStore } from '@/lib/store/projectActionsStore'

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
    const { exportAction, shareAction, settingsAction, statsAction, canShare } = useProjectActionsStore()

    return (
        <nav className="sticky top-0 z-40 shrink-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1440px] mx-auto h-14 flex items-center justify-between">
                <Link href="/library" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-[#546354] flex items-center justify-center shadow-lg shadow-[#546354]/10 transition-transform group-hover:scale-110">
                        <PenLine className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col -gap-1">
                        <span className="font-serif italic text-lg text-slate-800 leading-none">Storyline</span>
                        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#546354]/40">Beta Sanctuary</span>
                    </div>
                </Link>

                <div className="flex items-center gap-2 sm:gap-4">
                    <div id="app-nav-portal" className="flex items-center" />
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <div className="relative h-10 w-10 flex items-center justify-center rounded-full hover:bg-black/5 cursor-pointer">
                                <Avatar className="h-9 w-9 border-2 border-white shadow-sm transition-transform active:scale-90">
                                    {user.user_metadata?.avatar_url && (
                                        <img 
                                            src={user.user_metadata.avatar_url} 
                                            alt={displayName}
                                            className="h-full w-full object-cover rounded-full"
                                        />
                                    )}
                                    <AvatarFallback className="bg-[#546354] text-white text-xs font-bold uppercase overflow-hidden">
                                        {displayName.includes(' ') 
                                            ? displayName.split(' ').map(n => n[0]).join('').slice(0, 2) 
                                            : displayName.slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64 mt-2 rounded-2xl p-2 shadow-xl border-slate-200 bg-white" align="end">
                            <div className="px-3 py-3 mb-1 border-b border-slate-100">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-bold leading-none text-slate-900">{displayName}</p>
                                    <p className="text-[11px] leading-none text-slate-400 truncate tracking-wide">{user.email}</p>
                                </div>
                            </div>
                            
                            {/* Project-specific items managed via state */}
                            {exportAction && (
                                <>
                                    <DropdownMenuItem 
                                        onClick={exportAction}
                                        className="rounded-xl px-3 py-2.5 text-slate-600 focus:text-indigo-600 focus:bg-indigo-50 cursor-pointer gap-3 transition-all"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span className="font-semibold text-sm">Export Project</span>
                                    </DropdownMenuItem>
                                    
                                    {canShare && shareAction && (
                                        <DropdownMenuItem 
                                            onClick={shareAction}
                                            className="rounded-xl px-3 py-2.5 text-slate-600 focus:text-indigo-600 focus:bg-indigo-50 cursor-pointer gap-3 transition-all"
                                        >
                                            <Users className="w-4 h-4" />
                                            <span className="font-semibold text-sm">Share Project</span>
                                        </DropdownMenuItem>
                                    )}

                                    {settingsAction && (
                                        <DropdownMenuItem 
                                            onClick={settingsAction}
                                            className="rounded-xl px-3 py-2.5 text-slate-600 focus:text-indigo-600 focus:bg-indigo-50 cursor-pointer gap-3 transition-all"
                                        >
                                            <Settings2 className="w-4 h-4" />
                                            <span className="font-semibold text-sm">Project Settings</span>
                                        </DropdownMenuItem>
                                    )}

                                    {statsAction && (
                                        <DropdownMenuItem 
                                            onClick={statsAction}
                                            className="rounded-xl px-3 py-2.5 text-slate-600 focus:text-indigo-600 focus:bg-indigo-50 cursor-pointer gap-3 transition-all"
                                        >
                                            <BarChart3 className="w-4 h-4" />
                                            <span className="font-semibold text-sm">Project Stats</span>
                                        </DropdownMenuItem>
                                    )}
                                    
                                    <DropdownMenuSeparator className="my-1.5 bg-slate-100" />
                                </>
                            )}

                            <DropdownMenuItem 
                                onClick={() => router.push('/settings')}
                                className="rounded-xl px-3 py-2.5 text-slate-600 focus:text-[#546354] focus:bg-[#546354]/5 cursor-pointer gap-3 transition-all"
                            >
                                <SettingsIcon className="w-4 h-4" />
                                <span className="font-semibold text-sm">Account Settings</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                                onClick={() => window.open('mailto:mwake.dev@gmail.com', '_blank')}
                                className="rounded-xl px-3 py-2.5 text-slate-600 focus:text-[#546354] focus:bg-[#546354]/5 cursor-pointer gap-3 transition-all"
                            >
                                <Mail className="w-4 h-4" />
                                <span className="font-semibold text-sm">Support & Feedback</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator className="my-1.5 bg-slate-100" />

                            <div className="px-3 py-1 mb-1">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-300">Legal</p>
                            </div>

                            <DropdownMenuItem 
                                onClick={() => router.push('/terms')}
                                className="rounded-xl px-3 py-2.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer gap-3"
                            >
                                <span className="text-sm">Terms of Service</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                                onClick={() => router.push('/privacy')}
                                className="rounded-xl px-3 py-2.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer gap-3"
                            >
                                <span className="text-sm">Privacy Policy</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                                onClick={() => router.push('/ai-disclaimer')}
                                className="rounded-xl px-3 py-2.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer gap-3"
                            >
                                <span className="text-sm">AI Disclaimer</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator className="my-1.5 bg-slate-100" />
                            
                            <DropdownMenuItem 
                                onClick={handleSignOut}
                                className="rounded-xl px-3 py-2.5 text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer gap-3 transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="font-semibold text-sm">Sign out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    )
}
