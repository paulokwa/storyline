'use client'

import { useState, useEffect } from 'react'
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
    Check,
    Loader2,
    Mail,
    AlertCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils'

interface Member {
    id: string
    user_id: string
    email: string
    role: 'owner' | 'editor' | 'viewer'
    created_at: string
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
    const [members, setMembers] = useState<Member[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer')
    const [isInviting, setIsInviting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const supabase = createClient() as any

    useEffect(() => {
        if (open) {
            fetchMembers()
            setError(null)
        }
    }, [open, projectId])

    async function fetchMembers() {
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
            setMembers(data as Member[] || [])
        }
        setIsLoading(false)
    }

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
        if (!confirm('Are you sure you want to remove this member?')) return

        const { error } = await supabase.rpc('remove_project_member', {
            p_id: projectId,
            p_user_id: userId
        })

        if (error) {
            setError(error.message)
        } else {
            fetchMembers()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-3xl border border-slate-200/50 shadow-2xl bg-[#fbf9f5] !opacity-100 backdrop-blur-none">
                <DialogHeader className="bg-white/50 p-8 border-b border-[#f0eee9]">
                    <DialogTitle className="text-3xl font-serif text-foreground flex items-center gap-3">
                        <UserPlus className="w-8 h-8 text-primary" strokeWidth={1.5} />
                        Share Project
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium">
                        Invite collaborators to your story.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8 space-y-8">
                    {/* Add Member Form */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Invite Collaborator</label>
                        <div className="flex flex-col sm:flex-row gap-3">
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
                            <div className="flex gap-2">
                                <div className="relative">
                                    <select 
                                        value={inviteRole} 
                                        onChange={(e) => setInviteRole(e.target.value as any)}
                                        className="h-12 px-4 pr-10 rounded-2xl border border-border bg-muted/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm appearance-none min-w-[110px]"
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
                                    className="h-12 rounded-2xl sanctuary-btn-primary px-6 transition-all active:scale-95 shadow-lg shadow-primary/20"
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
                                        className="flex items-center justify-between p-4 bg-muted/30 rounded-[1.25rem] border border-border group hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex flex-col min-w-0 pr-4">
                                            <span className="text-sm font-semibold text-foreground truncate">
                                                {member.email}
                                            </span>
                                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                                                Joined {new Date(member.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 shrink-0">
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
                                                            onChange={(e) => handleUpdateRole(member.user_id, e.target.value as any)}
                                                            className="h-8 px-3 pr-8 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-[11px] font-bold uppercase tracking-tight appearance-none min-w-[90px]"
                                                        >
                                                            <option value="editor">Editor</option>
                                                            <option value="viewer">Viewer</option>
                                                        </select>
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                                        </div>
                                                    </div>
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveMember(member.user_id)}
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">Remove member</TooltipContent>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-white border-t border-[#f0eee9] flex justify-end">
                    <Button 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)} 
                        className="rounded-full px-8 h-12 font-semibold text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-all"
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
