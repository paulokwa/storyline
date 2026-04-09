'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Comment {
    id: string
    project_id: string
    node_id: string | null
    author_id: string
    parent_id: string | null
    content: string
    status: 'open' | 'resolved'
    anchor_data: any
    created_at: string
    updated_at: string
    resolved_at: string | null
    resolved_by: string | null
    author_email?: string
}

interface TypingState {
    userEmail: string
    threadId: string | null
}

interface CommentsContextType {
    comments: Comment[]
    isLoading: boolean
    fetchComments: (projectId: string) => Promise<void>
    addComment: (data: { project_id: string; node_id?: string; content: string; parent_id?: string }) => Promise<void>
    updateComment: (id: string, content: string) => Promise<void>
    deleteComment: (id: string) => Promise<void>
    resolveComment: (id: string, resolved: boolean) => Promise<void>
    commentsPanelOpen: boolean
    setCommentsPanelOpen: (open: boolean) => void
    activeCommentId: string | null
    setActiveCommentId: (id: string | null) => void
    typingUsers: TypingState[]
    sendTypingIndicator: (threadId: string | null) => void
    detachedCommentIds: Set<string>
    setDetachedCommentIds: (ids: Set<string>) => void
}

const CommentsContext = createContext<CommentsContextType | undefined>(undefined)

export function CommentsProvider({ projectId, children }: { projectId: string, children: React.ReactNode }) {
    const [comments, setComments] = useState<Comment[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [commentsPanelOpen, setCommentsPanelOpen] = useState(false)
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
    const [typingUsers, setTypingUsers] = useState<TypingState[]>([])
    const [detachedCommentIds, setDetachedCommentIds] = useState<Set<string>>(new Set())
    
    const supabase = createClient()
    const channelRef = useRef<any>(null)

    const fetchSingleExtended = async (id: string) => {
        // Use a simple selection for the extended info for now
        // In a real app, you might have another RPC for a single comment,
        // but for now we can just re-fetch the list or use a select with join if possible
        const { data } = await supabase
            .from('project_comments')
            .select(`
                *,
                author:author_id(email)
            `)
            .eq('id', id)
            .single()
        
        if (data) {
            return {
                ...data,
                author_email: (data as any).author?.email
            } as Comment
        }
        return null
    }

    const fetchComments = useCallback(async (p_id: string) => {
        setIsLoading(true)
        const { data, error } = await supabase
            .rpc('get_project_comments_extended', { project_id_arg: p_id })

        if (error) {
            console.error('Error fetching comments details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            })
            console.error('Full error object:', JSON.stringify(error))
        } else {
            setComments(data as Comment[])
        }
        setIsLoading(false)
    }, [])

    // Realtime setup
    useEffect(() => {
        if (!projectId) return

        const channel = supabase.channel(`comments:${projectId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'project_comments',
                filter: `project_id=eq.${projectId}`
            }, async (payload) => {
                if (payload.eventType === 'INSERT') {
                    const extended = await fetchSingleExtended(payload.new.id)
                    if (extended) {
                        setComments(prev => {
                            if (prev.some(c => c.id === extended.id)) return prev
                            return [...prev, extended]
                        })
                    }
                } else if (payload.eventType === 'UPDATE') {
                    setComments(prev => prev.map(c => 
                        c.id === payload.new.id ? { ...c, ...payload.new } : c
                    ))
                } else if (payload.eventType === 'DELETE') {
                    setComments(prev => prev.filter(c => c.id !== payload.old.id && c.parent_id !== payload.old.id))
                }
            })
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                setTypingUsers(prev => {
                    const filtered = prev.filter(u => u.userEmail !== payload.email)
                    if (payload.typing) {
                        return [...filtered, { userEmail: payload.email, threadId: payload.threadId }]
                    }
                    return filtered
                })
            })
            .subscribe()

        channelRef.current = channel

        return () => {
            channel.unsubscribe()
        }
    }, [projectId])

    const sendTypingIndicator = useCallback(async (threadId: string | null) => {
        if (!channelRef.current) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { email: user.email, threadId, typing: !!threadId }
        })
    }, [])

    const addComment = async ({ project_id, node_id, content, parent_id, anchor_data }: any) => {
        const { data, error } = await supabase
            .from('project_comments')
            .insert({
                project_id,
                node_id,
                content,
                parent_id,
                anchor_data,
                status: 'open'
            })
            .select()
            .single()
        
        if (error) throw error
        // Realtime will handle the update for us, but we return the data for the editor
        return data as Comment
    }

    const updateComment = async (id: string, content: string) => {
        const { error } = await supabase
            .from('project_comments')
            .update({ content })
            .eq('id', id)
        
        if (error) throw error
    }

    const deleteComment = async (id: string) => {
        const { error } = await supabase
            .from('project_comments')
            .delete()
            .eq('id', id)
        
        if (error) throw error
    }

    const resolveComment = async (id: string, resolved: boolean) => {
        const { error } = await supabase
            .from('project_comments')
            .update({ status: resolved ? 'resolved' : 'open' })
            .eq('id', id)
        
        if (error) throw error
    }

    return (
        <CommentsContext.Provider value={{ 
            comments, 
            isLoading, 
            fetchComments, 
            addComment, 
            updateComment, 
            deleteComment, 
            resolveComment,
            commentsPanelOpen,
            setCommentsPanelOpen,
            activeCommentId,
            setActiveCommentId,
            typingUsers,
            sendTypingIndicator,
            detachedCommentIds,
            setDetachedCommentIds
        }}>
            {children}
        </CommentsContext.Provider>
    )
}

export function useComments() {
    const context = useContext(CommentsContext)
    if (context === undefined) {
        throw new Error('useComments must be used within a CommentsProvider')
    }
    return context
}
