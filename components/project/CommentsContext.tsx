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
    order_index: number
    is_shared?: boolean
}

interface TypingState {
    userEmail: string
    threadId: string | null
}

interface CommentsContextType {
    comments: Comment[]
    setComments: React.Dispatch<React.SetStateAction<Comment[]>>
    isLoading: boolean
    fetchComments: (projectId: string) => Promise<void>
    addComment: (data: { project_id: string; node_id?: string; content: string; parent_id?: string, anchor_data?: any, is_shared?: boolean }) => Promise<Comment>
    updateComment: (id: string, content: string) => Promise<void>
    deleteComment: (id: string) => Promise<void>
    resolveComment: (id: string, resolved: boolean) => Promise<void>
    setCommentSharing: (id: string, isShared: boolean) => Promise<void>
    commentsPanelOpen: boolean
    setCommentsPanelOpen: (open: boolean) => void
    activeCommentId: string | null
    setActiveCommentId: (id: string | null) => void
    typingUsers: TypingState[]
    sendTypingIndicator: (threadId: string | null) => void
    detachedCommentIds: Set<string>
    setDetachedCommentIds: (ids: Set<string>) => void
    scrollTrigger: number
    jumpToComment: (id: string) => void
    reorderComments: (orderedIds: string[]) => Promise<void>
}

const CommentsContext = createContext<CommentsContextType | undefined>(undefined)

export function CommentsProvider({ projectId, children }: { projectId: string, children: React.ReactNode }) {
    const [comments, setComments] = useState<Comment[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [commentsPanelOpen, setCommentsPanelOpen] = useState(false)
    const [activeCommentId, setActiveCommentId] = useState<string | null>(null)
    const [typingUsers, setTypingUsers] = useState<TypingState[]>([])
    const [detachedCommentIds, setDetachedCommentIds] = useState<Set<string>>(new Set())
    const [scrollTrigger, setScrollTrigger] = useState(0)
    const [currentUser, setCurrentUser] = useState<{ id: string, email: string } | null>(null)
    
    const supabase = createClient() as any
    const channelRef = useRef<any>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }: any) => {
            if (data.user) {
                setCurrentUser({ id: data.user.id, email: data.user.email || '' })
            }
        })
    }, [])

    const fetchSingleExtended = async (id: string) => {
        const { data, error } = await supabase.rpc('get_comment_details', { comment_id_arg: id })
        if (error) {
            console.error('Error fetching single comment details:', error)
            return null
        }
        return data as Comment
    }

    const getAiLinkedIdeas = (anchorData: any): { ideaId: string; sceneId: string | null }[] => {
        const links = anchorData?.aiLinkedIdeas
        if (!Array.isArray(links)) return []

        return links
            .filter((link): link is { ideaId: string; sceneId: string | null } =>
                !!link &&
                typeof link === 'object' &&
                typeof link.ideaId === 'string'
            )
            .map(link => ({
                ideaId: link.ideaId,
                sceneId: typeof link.sceneId === 'string' ? link.sceneId : null
            }))
    }

    const buildFeedbackIdeaTitle = (comment: Comment) => {
        const referenceText = comment.anchor_data?.text
        let titleSource = comment.content

        if (referenceText && (comment.content === 'Add your feedback...' || !comment.content)) {
            titleSource = referenceText
        }

        const truncated = titleSource.length > 10 ? `${titleSource.slice(0, 10)}...` : titleSource
        return `Feedback: ${truncated}`
    }

    const resolveSceneIdForComment = async (comment: Comment) => {
        const storedSceneId = getAiLinkedIdeas(comment.anchor_data)[0]?.sceneId
        if (storedSceneId) return storedSceneId
        if (!comment.node_id) return null

        const { data, error } = await supabase
            .from('scenes')
            .select('id')
            .eq('node_id', comment.node_id)
            .maybeSingle()

        if (error) {
            console.error('Error resolving scene for comment delete:', error)
            return null
        }

        return data?.id ?? null
    }

    const unlinkAiFeedbackForComment = async (comment: Comment) => {
        const linkedIdeas = getAiLinkedIdeas(comment.anchor_data)

        if (linkedIdeas.length > 0) {
            const linksByScene = new Map<string, string[]>()

            linkedIdeas.forEach(({ ideaId, sceneId }) => {
                if (!sceneId) return

                const ids = linksByScene.get(sceneId) ?? []
                ids.push(ideaId)
                linksByScene.set(sceneId, ids)
            })

            await Promise.all(
                Array.from(linksByScene.entries()).map(async ([sceneId, ideaIds]) => {
                    const uniqueIdeaIds = [...new Set(ideaIds)]
                    const { error } = await supabase
                        .from('scene_ideas')
                        .delete()
                        .eq('scene_id', sceneId)
                        .in('idea_id', uniqueIdeaIds)

                    if (error) {
                        throw error
                    }
                })
            )

            return
        }

        const sceneId = await resolveSceneIdForComment(comment)
        if (!sceneId) return

        const expectedTitle = buildFeedbackIdeaTitle(comment)
        const { data, error } = await supabase
            .from('scene_ideas')
            .select('idea_id, ideas!inner(id, title, content)')
            .eq('scene_id', sceneId)

        if (error) {
            throw error
        }

        const fallbackIdeaIds = (data ?? [])
            .filter((row: any) => {
                const idea = Array.isArray(row.ideas) ? row.ideas[0] : row.ideas
                if (!idea) return false

                return idea.title === expectedTitle && idea.content === comment.content
            })
            .map((row: any) => row.idea_id)

        if (fallbackIdeaIds.length === 0) return

        const { error: unlinkError } = await supabase
            .from('scene_ideas')
            .delete()
            .eq('scene_id', sceneId)
            .in('idea_id', [...new Set(fallbackIdeaIds)])

        if (unlinkError) {
            throw unlinkError
        }
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
            // Ensure data is sorted by order_index
            const sortedData = (data as Comment[]).sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            setComments(sortedData)
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
            }, async (payload: any) => {
                if (payload.eventType === 'INSERT') {
                    const extended = await fetchSingleExtended(payload.new.id)
                    if (extended) {
                        setComments(prev => {
                            if (prev.some(c => c.id === extended.id)) return prev
                            const next = [extended, ...prev]
                            return next.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                        })
                    }
                } else if (payload.eventType === 'UPDATE') {
                    setComments(prev => prev.map(c => 
                        c.id === payload.new.id ? { ...c, ...payload.new } : c
                    ))
                } else if (payload.eventType === 'DELETE') {
                    const deletedId = payload.old?.id
                    if (deletedId) {
                        setComments(prev => prev.filter(c => c.id !== deletedId && c.parent_id !== deletedId))
                    }
                }
            })
            .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
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

    const addComment = async ({ project_id, node_id, content, parent_id, anchor_data, is_shared = false }: any) => {
        const { data, error } = await supabase
            .from('project_comments')
            .insert({
                project_id,
                node_id,
                content,
                parent_id,
                anchor_data,
                status: 'open',
                order_index: comments.length > 0 ? Math.min(...comments.map(c => c.order_index || 0)) - 1 : 1,
                is_shared,
            })
            .select()
            .single()
        
        if (error) {
            console.error('Supabase AddComment Error:', {
                message: (error as any)?.message,
                details: (error as any)?.details,
                hint: (error as any)?.hint,
                code: (error as any)?.code,
                raw: error,
            })
            throw error
        }
        
        const newComment = {
            ...data,
            author_email: currentUser?.email,
            is_shared,
        } as Comment

        // Optimistic UI update: Add to list immediately
        setComments(prev => {
            if (prev.some(c => c.id === newComment.id)) return prev
            const next = [newComment, ...prev]
            return next.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        })

        return newComment
    }

    const updateComment = async (id: string, content: string) => {
        // Optimistic update
        setComments(prev => prev.map(c => 
            c.id === id ? { ...c, content, updated_at: new Date().toISOString() } : c
        ))

        const { error } = await supabase
            .from('project_comments')
            .update({ content, updated_at: new Date().toISOString() })
            .eq('id', id)
        
        if (error) {
            console.error('Error updating comment:', error)
            // Revert or re-fetch on error if needed
            fetchComments(projectId)
            throw error
        }
    }

    const deleteComment = async (id: string) => {
        console.log('Attempting to delete comment:', id)

        const commentsToDelete = comments.filter(c => c.id === id || c.parent_id === id)
        
        // Optimistic update
        setComments(prev => prev.filter(c => c.id !== id && c.parent_id !== id))
        if (activeCommentId === id) setActiveCommentId(null)

        try {
            await Promise.all(commentsToDelete.map(unlinkAiFeedbackForComment))

            const { error } = await supabase
                .from('project_comments')
                .delete()
                .eq('id', id)
            
            if (error) {
                throw error
            }
        } catch (error) {
            console.error('Error deleting comment:', error)
            await fetchComments(projectId)
            throw error
        }

        console.log('Successfully deleted comment:', id)
    }

    const jumpToComment = useCallback((id: string) => {
        setActiveCommentId(id)
        setScrollTrigger(prev => prev + 1)
    }, [])

    const reorderComments = async (orderedIds: string[]) => {
        // Optimistic UI update
        const idToIndex = new Map(orderedIds.map((id, index) => [id, index]))
        
        setComments(prev => {
            const next = prev.map(c => ({
                ...c,
                order_index: idToIndex.has(c.id) ? idToIndex.get(c.id)! : c.order_index
            }))
            return next.sort((a, b) => a.order_index - b.order_index)
        })

        // Persistence
        const updates = orderedIds.map((id, index) => ({
            id,
            order_index: index
        }))

        // Supabase doesn't support bulk update with different values easily without RPC 
        // to avoid complexity, we can do them in parallel or use an RPC if needed.
        // Actually we can use upsert if we provide ID and order_index
        const { error } = await supabase
            .from('project_comments')
            .upsert(updates, { onConflict: 'id' })
        
        if (error) {
            console.error('Error persisting reorder:', error)
            // Revert or fetch? For now just log
        }
    }

    const resolveComment = async (id: string, resolved: boolean) => {
        const timestamp = resolved ? new Date().toISOString() : null
        
        // Optimistic update
        setComments(prev => prev.map(c => 
            c.id === id ? { ...c, status: resolved ? 'resolved' : 'open', resolved_at: timestamp } : c
        ))

        const { error } = await supabase
            .from('project_comments')
            .update({ 
                status: resolved ? 'resolved' : 'open',
                resolved_at: timestamp,
                resolved_by: resolved ? (await supabase.auth.getUser()).data.user?.id : null
            })
            .eq('id', id)
        
        if (error) {
            console.error('Error resolving comment:', error)
            fetchComments(projectId)
            throw error
        }
    }

    const setCommentSharing = async (id: string, isShared: boolean) => {
        setComments(prev => prev.map(c =>
            c.id === id ? { ...c, is_shared: isShared } : c
        ))

        const { error } = await supabase
            .from('project_comments')
            .update({ is_shared: isShared, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (error) {
            console.error('Error updating comment sharing:', error)
            fetchComments(projectId)
            throw error
        }
    }

    return (
        <CommentsContext.Provider value={{ 
            comments, 
            setComments,
            isLoading, 
            fetchComments, 
            addComment, 
            updateComment, 
            deleteComment, 
            resolveComment,
            setCommentSharing,
            commentsPanelOpen,
            setCommentsPanelOpen,
            activeCommentId,
            setActiveCommentId,
            typingUsers,
            sendTypingIndicator,
            detachedCommentIds,
            setDetachedCommentIds,
            scrollTrigger,
            jumpToComment,
            reorderComments
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
