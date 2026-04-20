'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
    UserPlus, 
    Trash2, 
    ShieldCheck, 
    Loader2,
    Mail,
    AlertCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useProjectActions } from '@/components/project/ProjectContext'

interface Member {
    id: string
    user_id: string
    email: string
    role: 'owner' | 'editor' | 'viewer'
    created_at: string
}

const COLLABORATOR_ROLES = ['editor', 'viewer'] as const

function isCollaboratorRole(value: string): value is (typeof COLLABORATOR_ROLES)[number] {
    return COLLABORATOR_ROLES.includes(value as (typeof COLLABORATOR_ROLES)[number])
}

export default function ShareModal({
    open,
    onOpenChange,
    projectId,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    projectId: string
}) {
    const { theme } = useTheme()
    const { role: currentRole } = useProjectActions()
    const isMidnight = theme === 'midnight'
    const canManageMembers = currentRole === 'owner'
    const [members, setMembers] = useState<Member[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer')
    const [isInviting, setIsInviting] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)
    const [memberPendingRemoval, setMemberPendingRemoval] = useState<Member | null>(null)
    const [error, setError] = useState<string | null>(null)

    const supabase = useMemo(() => createClient(), [])

    const fetchMembers = useCallback(async () => {
        setIsLoading(true)
        const { data, error } = await supabase.rpc('get_project_members_extended', { project_id_arg: projectId })
        if (error) {
            console.error('Error fetching members details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            })
        } else {
            setMembers((data as Member[]) || [])
        }
        setIsLoading(false)
    }, [projectId, supabase])

    useEffect(() => {
        if (!open) return

        const frame = window.requestAnimationFrame(() => {
            setError(null)
            void fetchMembers()
        })

        return () => window.cancelAnimationFrame(frame)
    }, [open, fetchMembers])

    async function handleAddMember() {
        if (!inviteEmail.trim()) return

        setIsInviting(true)
        setError(null)

        const { error } = await supabase.rpc('add_project_member_by_email', {
            p_id: projectId,
            p_email: inviteEmail.trim().toLowerCase(),
            p_role: inviteRole
        })

        if (error) {
            setError(error.message)
        } else {
            setInviteEmail('')
            fetchMembers()
        }
        setIsInviting(false)
    }

    async function handleUpdateRole(userId: string, newRole: 'editor' | 'viewer') {
        const { error } = await supabase.rpc('update_project_member_role', {
            p_id: projectId,
            p_user_id: userId,
            p_role: newRole
        })

        if (error) {
            setError(error.message)
        } else {
            fetchMembers()
        }
    }

    async function handleRemoveMember(userId: string) {
        const member = members.find((entry) => entry.user_id === userId)
        if (!member) return

        setMemberPendingRemoval(member)
    }

    async function confirmRemoveMember() {
        if (!memberPendingRemoval) return

        setIsRemoving(true)

        const { error } = await supabase.rpc('remove_project_member', {
            p_id: projectId,
            p_user_id: memberPendingRemoval.user_id
        })

        if (error) {
            setError(error.message)
        } else {
            setMemberPendingRemoval(null)
            fetchMembers()
        }

        setIsRemoving(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "share-project-modal w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:max-w-[500px] p-0 overflow-hidden rounded-3xl shadow-2xl !opacity-100 backdrop-blur-none",
                isMidnight
                    ? "border border-slate-600/30 bg-[#10192b]"
                    : "border border-slate-200/50 bg-[#fbf9f5]"
            )}>
                <DialogHeader className={cn(
                    "p-8 border-b",
                    isMidnight ? "bg-[#182239]/88 border-slate-700/60" : "bg-white/50 border-[#f0eee9]"
                )}>
                    <DialogTitle className="text-3xl font-serif text-foreground flex items-center gap-3">
                        <UserPlus className="w-8 h-8 text-primary" strokeWidth={1.5} />
                        Share Project
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium">
                        Invite collaborators to your story.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-5 sm:p-8 space-y-8">
                    {/* Add Member Form */}
                    <div className="space-y-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 ml-1 pb-1">Invite Collaborator</label>
                        <div className="flex flex-col gap-3">
                            <div className="relative flex-1">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="friend@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="pl-11 h-12 rounded-2xl border-border bg-muted/50 focus:bg-card focus:ring-primary/20 transition-all text-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative">
                                    <select 
                                        value={inviteRole} 
                                        onChange={(e) => {
                                            if (isCollaboratorRole(e.target.value)) {
                                                setInviteRole(e.target.value)
                                            }
                                        }}
                                        className="h-12 w-full px-4 pr-10 rounded-2xl border border-border bg-muted/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none min-w-[110px] sm:w-auto"
                                    >
                                        <option value="editor">Editor</option>
                                        <option value="viewer">Viewer</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                    </div>
                                </div>
                                <Button 
                                    onClick={handleAddMember} 
                                    disabled={isInviting || !inviteEmail.trim()}
                                    className="h-12 rounded-2xl sanctuary-btn-primary px-6 transition-all active:scale-95 shadow-lg shadow-primary/20 sm:min-w-[120px]"
                                >
                                    {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invite'}
                                </Button>
                            </div>
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-xs text-rose-500 font-medium px-4 py-3 bg-rose-50 rounded-xl animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Members List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Current Members</label>
                            <span className="text-[10px] font-bold text-slate-300 px-2 py-0.5 border border-slate-100 rounded-full">
                                {members.length} Total
                            </span>
                        </div>
                        
                        <div className="space-y-2 max-h-[280px] overflow-y-auto px-1 custom-scrollbar">
                            {isLoading ? (
                                <div className="flex flex-col gap-3 py-12 items-center text-slate-300">
                                    <Loader2 className="w-8 h-8 animate-spin" strokeWidth={1.5} />
                                    <span className="text-xs font-medium tracking-wide">Fetching team...</span>
                                </div>
                            ) : (
                                members.map((member) => (
                                <div 
                                    key={member.user_id} 
                                    className="flex flex-col gap-3 p-4 bg-muted/30 rounded-[1.25rem] border border-border group hover:bg-muted/50 transition-colors sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex min-w-0 flex-1 flex-col pr-0 sm:pr-4">
                                        <span className="text-sm font-semibold text-foreground break-all sm:truncate">
                                            {member.email}
                                        </span>
                                    </div>
                                        
                                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                                            {member.role === 'owner' ? (
                                                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10 border-none px-3 py-1 pointer-events-none gap-1.5 h-8 rounded-xl font-bold text-[10px] uppercase tracking-wider">
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    Owner
                                                </Badge>
                                            ) : (
                                                <>
                                                    <div className="relative">
                                                        <select
                                                            value={member.role}
                                                            onChange={(e) => {
                                                                if (isCollaboratorRole(e.target.value)) {
                                                                    handleUpdateRole(member.user_id, e.target.value)
                                                                }
                                                            }}
                                                            disabled={!canManageMembers}
                                                            className="h-8 w-full min-w-[110px] px-3 pr-8 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-[11px] font-bold uppercase tracking-tight appearance-none disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                                        >
                                                            <option value="editor">Editor</option>
                                                            <option value="viewer">Viewer</option>
                                                        </select>
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                                        </div>
                                                    </div>
                                                    {canManageMembers && (
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleRemoveMember(member.user_id)}
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                                                                    aria-label={`Remove ${member.email}`}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">Remove member</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </>
                                            )}
                                    </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className={cn(
                    "p-6 flex justify-end",
                    isMidnight ? "bg-[#182239]/88 border-slate-700/60" : "bg-white border-[#f0eee9]"
                )}>
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)} 
                        className="rounded-full px-8 h-12 font-semibold text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-all"
                    >
                        Close
                    </Button>
                </DialogFooter>

                {memberPendingRemoval && (
                    <div className={cn(
                        "absolute inset-0 z-20 flex items-end justify-center bg-slate-950/20 p-3 backdrop-blur-[2px] sm:items-center sm:p-6",
                        isMidnight ? "bg-slate-950/35" : "bg-slate-900/18"
                    )}>
                        <div className={cn(
                            "w-full max-w-sm rounded-[2rem] border p-6 shadow-2xl",
                            isMidnight
                                ? "border-slate-600/40 bg-[#142033] text-slate-100 shadow-[0_24px_60px_rgba(2,6,23,0.55)]"
                                : "border-white/70 bg-[#fffdfa] text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
                        )}>
                            <div className="flex items-start gap-4">
                                <div className={cn(
                                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                                    isMidnight
                                        ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
                                        : "border-rose-200 bg-rose-50 text-rose-500"
                                )}>
                                    <Trash2 className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                    <h3 className="font-serif text-2xl leading-none">Remove collaborator?</h3>
                                    <p className={cn(
                                        "text-sm leading-relaxed",
                                        isMidnight ? "text-slate-300" : "text-slate-600"
                                    )}>
                                        <span className="font-semibold break-all">{memberPendingRemoval.email}</span> will lose access to this project immediately.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    variant="ghost"
                                    onClick={() => setMemberPendingRemoval(null)}
                                    disabled={isRemoving}
                                    className={cn(
                                        "h-11 rounded-full px-5",
                                        isMidnight
                                            ? "text-slate-300 hover:bg-white/8 hover:text-white"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    )}
                                >
                                    Keep member
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={confirmRemoveMember}
                                    disabled={isRemoving}
                                    className="h-11 rounded-full px-5"
                                >
                                    {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remove'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
