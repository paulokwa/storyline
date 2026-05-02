'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isAdminEmail } from '@/lib/admin'
import { 
    PenLine, LogOut, Settings as SettingsIcon, 
    Download, Users, Settings2, BarChart3, Mail, Shield, ArchiveRestore, HelpCircle,
    Save, FilePlus
} from 'lucide-react'
import { formatDistanceToNow } from '@/lib/time'
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
import { useTheme } from '@/components/providers/ThemeProvider'
import NotificationBell from '@/components/notifications/NotificationBell'
import { cn } from '@/lib/utils'

export default function AppNav({ user }: { user: User }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const canAccessAdmin = isAdminEmail(user.email)
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const [hasCollaboratorCluster, setHasCollaboratorCluster] = useState(false)

    useEffect(() => {
        const target = document.getElementById('app-nav-portal')
        if (!target) return

        const updateState = () => {
            setHasCollaboratorCluster(target.childElementCount > 0)
        }

        updateState()

        const observer = new MutationObserver(() => {
            updateState()
        })

        observer.observe(target, { childList: true, subtree: true })

        return () => observer.disconnect()
    }, [pathname])

    async function handleSignOut() {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const displayName = (user.user_metadata?.display_name as string) || user.email?.split('@')[0] || 'Writer'
    const { 
        exportAction, 
        saveAction,
        saveAsAction,
        restoreAction, 
        shareAction, 
        settingsAction, 
        statsAction, 
        canShare, 
        canExport, 
        exportDisabledReason,
        linkedFileName,
        lastFileSaveAt
    } = useProjectActionsStore()

    return (
        <nav className={`app-nav-shell sticky top-0 z-40 shrink-0 px-4 sm:px-6 lg:px-10 ${
            isMidnight
                ? 'bg-[#182237]/88 backdrop-blur-xl border-b border-slate-500/20 shadow-[0_10px_30px_rgba(2,6,23,0.18)]'
                : 'bg-white/80 backdrop-blur-sm border-b border-slate-200'
        }`}>
            <div className={`app-nav-inner max-w-[1440px] mx-auto h-14 flex items-center justify-between gap-6 ${
                isMidnight ? 'border-b border-white/0' : ''
            }`}>
                <Link href="/library" className="app-nav-brand flex items-center gap-2 group">
                    <div className={`app-nav-mark w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                        isMidnight
                            ? 'bg-gradient-to-br from-[#65745f] to-[#556452] shadow-[0_14px_28px_rgba(3,8,20,0.26)]'
                            : 'bg-[#546354] shadow-lg shadow-[#546354]/10'
                    }`}>
                        <PenLine className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col -gap-1">
                        <span className={`app-nav-title font-serif italic text-lg leading-none ${
                            isMidnight ? 'text-[#edf3ff]' : 'text-slate-800'
                        }`}>Storyline</span>
                        <span className={`app-nav-subtitle text-[9px] font-bold tracking-[0.2em] uppercase ${
                            isMidnight ? 'text-[#abc0ad]/70' : 'text-[#546354]/40'
                        }`}>Beta Sanctuary</span>
                    </div>
                </Link>

                <div className="flex items-center gap-2 sm:gap-4">
                    <NotificationBell />

                    <div
                        id="app-nav-portal"
                        className={hasCollaboratorCluster ? cn(
                            "flex items-center rounded-full px-1.5 py-1",
                            isMidnight
                                ? "bg-white/6 border border-white/8"
                                : "bg-slate-50/90 border border-slate-200/80"
                        ) : "flex items-center"}
                    />

                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <div className={`app-nav-avatar-trigger relative h-10 w-10 flex items-center justify-center rounded-full cursor-pointer ${
                                isMidnight ? 'hover:bg-white/6' : 'hover:bg-black/5'
                            }`}>
                                <Avatar className={`app-nav-avatar h-9 w-9 border-2 shadow-sm transition-transform active:scale-90 ${
                                    isMidnight ? 'border-white/12 shadow-[0_10px_22px_rgba(2,6,23,0.24)]' : 'border-white'
                                }`}>
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
                        <DropdownMenuContent className={`w-64 mt-2 rounded-2xl p-2 shadow-xl ${
                            isMidnight
                                ? 'border-slate-600/30 bg-[#182239]/96 text-slate-100 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl'
                                : 'border-slate-200 bg-white'
                        }`} align="end">
                            <div className={`px-3 py-3 mb-1 border-b ${isMidnight ? 'border-slate-700/60' : 'border-slate-100'}`}>
                                <div className="flex flex-col space-y-1">
                                    <p className={`text-sm font-bold leading-none ${isMidnight ? 'text-slate-100' : 'text-slate-900'}`}>{displayName}</p>
                                    <p className="text-[11px] leading-none text-slate-400 truncate tracking-wide">{user.email}</p>
                                </div>
                            </div>
                            
                            {/* Project-specific items managed via state */}
                            {exportAction && (
                                <>
                                    {/* Local Disk Saving */}
                                    {saveAction && (
                                        <DropdownMenuItem 
                                            onClick={saveAction}
                                            className={`rounded-xl px-3 py-2.5 cursor-pointer gap-3 transition-all ${
                                                isMidnight ? 'text-slate-300 focus:text-indigo-200 focus:bg-white/8' : 'text-slate-600 focus:text-indigo-600 focus:bg-indigo-50'
                                            }`}
                                        >
                                            <Save className="w-4 h-4" />
                                            <div className="flex flex-col overflow-hidden">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm">Save Project</span>
                                                    <span className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Ctrl+S</span>
                                                </div>
                                                {linkedFileName && (
                                                    <span className="text-[10px] opacity-60 truncate max-w-[180px]">
                                                        Linked: {linkedFileName}
                                                    </span>
                                                )}
                                                {lastFileSaveAt && (
                                                    <span className="text-[9px] opacity-40 italic">
                                                        Saved {formatDistanceToNow(lastFileSaveAt)}
                                                    </span>
                                                )}
                                            </div>
                                        </DropdownMenuItem>
                                    )}

                                    {saveAsAction && (
                                        <DropdownMenuItem 
                                            onClick={saveAsAction}
                                            className={`rounded-xl px-3 py-2.5 cursor-pointer gap-3 transition-all ${
                                                isMidnight ? 'text-slate-300 focus:text-indigo-200 focus:bg-white/8' : 'text-slate-600 focus:text-indigo-600 focus:bg-indigo-50'
                                            }`}
                                        >
                                            <FilePlus className="w-4 h-4" />
                                            <span className="font-semibold text-sm">Save As...</span>
                                        </DropdownMenuItem>
                                    )}

                                    <DropdownMenuItem 
                                        onClick={exportAction}
                                        disabled={!canExport}
                                        className={`rounded-xl px-3 py-2.5 cursor-pointer gap-3 transition-all ${
                                            !canExport
                                                ? 'pointer-events-none opacity-50'
                                                : isMidnight ? 'text-slate-300 focus:text-indigo-200 focus:bg-white/8' : 'text-slate-600 focus:text-indigo-600 focus:bg-indigo-50'
                                        }`}
                                        title={!canExport ? (exportDisabledReason ?? 'Export is currently disabled.') : undefined}
                                    >
                                        <Download className="w-4 h-4" />
                                        <span className="font-semibold text-sm">
                                            {canExport ? 'Export Manuscript...' : 'Export Disabled by Owner'}
                                        </span>
                                    </DropdownMenuItem>
                                    
                                    {canShare && shareAction && (
                                        <DropdownMenuItem 
                                            onClick={shareAction}
                                            className={`rounded-xl px-3 py-2.5 cursor-pointer gap-3 transition-all ${
                                                isMidnight ? 'text-slate-300 focus:text-indigo-200 focus:bg-white/8' : 'text-slate-600 focus:text-indigo-600 focus:bg-indigo-50'
                                            }`}
                                        >
                                            <Users className="w-4 h-4" />
                                            <span className="font-semibold text-sm">Share Project</span>
                                        </DropdownMenuItem>
                                    )}

                                    {settingsAction && (
                                        <DropdownMenuItem 
                                            onClick={settingsAction}
                                            className={`rounded-xl px-3 py-2.5 cursor-pointer gap-3 transition-all ${
                                                isMidnight ? 'text-slate-300 focus:text-indigo-200 focus:bg-white/8' : 'text-slate-600 focus:text-indigo-600 focus:bg-indigo-50'
                                            }`}
                                        >
                                            <Settings2 className="w-4 h-4" />
                                            <span className="font-semibold text-sm">Project Settings</span>
                                        </DropdownMenuItem>
                                    )}

                                    {statsAction && (
                                        <DropdownMenuItem 
                                            onClick={statsAction}
                                            className={`rounded-xl px-3 py-2.5 cursor-pointer gap-3 transition-all ${
                                                isMidnight ? 'text-slate-300 focus:text-indigo-200 focus:bg-white/8' : 'text-slate-600 focus:text-indigo-600 focus:bg-indigo-50'
                                            }`}
                                        >
                                            <BarChart3 className="w-4 h-4" />
                                            <span className="font-semibold text-sm">Project Stats</span>
                                        </DropdownMenuItem>
                                    )}

                                    {restoreAction && (
                                        <DropdownMenuItem 
                                            onClick={restoreAction}
                                            className={`rounded-xl px-3 py-2.5 cursor-pointer gap-3 transition-all ${
                                                isMidnight ? 'text-slate-300 focus:text-amber-200 focus:bg-amber-900/20' : 'text-slate-600 focus:text-amber-700 focus:bg-amber-50'
                                            }`}
                                        >
                                            <ArchiveRestore className="w-4 h-4" />
                                            <span className="font-semibold text-sm">Restore from Backup</span>
                                        </DropdownMenuItem>
                                    )}
                                    
                                    <DropdownMenuSeparator className={`my-1.5 ${isMidnight ? 'bg-slate-700/60' : 'bg-slate-100'}`} />
                                </>
                            )}

                            <DropdownMenuItem 
                                onClick={() => router.push('/help')}
                                className={`rounded-xl px-3 py-2.5 cursor-pointer gap-3 transition-all ${
                                    isMidnight ? 'text-slate-300 focus:text-[#dbe5ff] focus:bg-white/8' : 'text-slate-600 focus:text-[#546354] focus:bg-[#546354]/5'
                                }`}
                            >
                                <HelpCircle className="w-4 h-4" />
                                <span className="font-semibold text-sm">Help Center</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                                onClick={() => router.push('/settings')}
                                className={`rounded-xl px-3 py-2.5 cursor-pointer gap-3 transition-all ${
                                    isMidnight ? 'text-slate-300 focus:text-[#dbe5ff] focus:bg-white/8' : 'text-slate-600 focus:text-[#546354] focus:bg-[#546354]/5'
                                }`}
                            >
                                <SettingsIcon className="w-4 h-4" />
                                <span className="font-semibold text-sm">Account Settings</span>
                            </DropdownMenuItem>

                            {canAccessAdmin && (
                                <DropdownMenuItem 
                                    onClick={() => router.push('/admin')}
                                    className={`rounded-xl px-3 py-2.5 cursor-pointer gap-3 transition-all ${
                                        isMidnight ? 'text-slate-300 focus:text-[#dbe5ff] focus:bg-white/8' : 'text-slate-600 focus:text-[#546354] focus:bg-[#546354]/5'
                                    }`}
                                >
                                    <Shield className="w-4 h-4" />
                                    <span className="font-semibold text-sm">Admin</span>
                                </DropdownMenuItem>
                            )}

                            <DropdownMenuItem 
                                onClick={() => {
                                    const currentPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
                                    router.push(`/feedback?from=${encodeURIComponent(currentPath)}`)
                                }}
                                className={`rounded-xl px-3 py-2.5 cursor-pointer gap-3 transition-all ${
                                    isMidnight ? 'text-slate-300 focus:text-[#dbe5ff] focus:bg-white/8' : 'text-slate-600 focus:text-[#546354] focus:bg-[#546354]/5'
                                }`}
                            >
                                <Mail className="w-4 h-4" />
                                <span className="font-semibold text-sm">Support & Feedback</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator className={`my-1.5 ${isMidnight ? 'bg-slate-700/60' : 'bg-slate-100'}`} />

                            
                            <DropdownMenuItem 
                                onClick={handleSignOut}
                                className={`rounded-xl px-3 py-2.5 cursor-pointer gap-3 transition-all ${
                                    isMidnight ? 'text-red-400 focus:text-red-300 focus:bg-red-500/10' : 'text-red-500 focus:text-red-600 focus:bg-red-50'
                                }`}
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
