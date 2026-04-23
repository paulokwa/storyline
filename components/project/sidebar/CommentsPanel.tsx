'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useComments } from '@/components/project/CommentsContext'
import { useProjectActions } from '@/components/project/ProjectContext'
import { useRouter } from 'next/navigation'
import { 
    MessageSquare, 
    Send, 
    CheckCircle2, 
    Reply, 
    Trash2, 
    Edit3, 
    Clock,
    Filter,
    X,
    MessageCircle,
    AlertCircle,
    GripVertical,
    Target,
    BrainCircuit,
    Check,
    Loader2,
    Globe,
    Lock,
    Eye,
    EyeOff
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, getUserColor } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'
import { getUserSafely } from '@/lib/supabase/client-auth'
import { toast } from 'sonner'

function getAiLinkMode(link: any): 'single' | 'thread' {
    return link?.mode === 'thread' ? 'thread' : 'single'
}

function buildFeedbackIdeaContent({
    rootComment,
    threadComments,
    mode,
}: {
    rootComment: any
    threadComments: any[]
    mode: 'single' | 'thread'
}) {
    const referenceText = rootComment.anchor_data?.text

    if (mode === 'single') {
        return rootComment.content
    }

    const transcript = threadComments
        .map((item, index) => {
            const author = item.author_email || 'Collaborator'
            const label = index === 0 ? 'Original Feedback' : `Reply ${index}`
            return `${label} (${author}):\n${item.content}`
        })
        .join('\n\n')

    return [
        referenceText ? `Original Reference Text:\n${referenceText}` : null,
        'Feedback Thread Discussion:',
        transcript,
    ].filter(Boolean).join('\n\n')
}

export default function CommentsPanel({ 
    projectId, 
    projectOwnerId,
    shareOwnerFeedback = false,
    allowViewerFeedback = false,
    activeNodeId, 
    activeSceneId,
    onSelectNode,
    onClose
}: { 
    projectId: string, 
    projectOwnerId: string,
    shareOwnerFeedback?: boolean,
    allowViewerFeedback?: boolean,
    activeNodeId: string | null,
    activeSceneId?: string,
    onSelectNode?: (id: string) => void,
    onClose?: () => void
}) {
    const router = useRouter()
    const { 
        comments, 
        setComments,
        isLoading, 
        addComment, 
        updateComment, 
        deleteComment, 
        resolveComment,
        setCommentSharing,
        activeCommentId,
        setActiveCommentId,
        typingUsers,
        sendTypingIndicator,
        detachedCommentIds,
        jumpToComment,
        reorderComments
    } = useComments()
    const { role } = useProjectActions()
    const supabase = createClient()
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    useEffect(() => {
        void getUserSafely(supabase)
            .then(({ user }) => setCurrentUserId(user?.id || null))
            .catch((error) => {
                console.error('Failed to load current comment user:', error)
                setCurrentUserId(null)
            })
    }, [supabase])
    
    const [filterByNode, setFilterByNode] = useState(true)
    const [showResolved, setShowResolved] = useState(false)
    const [authorFilter, setAuthorFilter] = useState<'new' | 'all' | 'mine' | 'collaborators' | 'ai' | 'hidden'>('all')
    const [newCommentText, setNewCommentText] = useState('')
    const [replyToId, setReplyToId] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editText, setEditText] = useState('')
    const [addingIdeaId, setAddingIdeaId] = useState<string | null>(null)
    const [addingThreadIdeaId, setAddingThreadIdeaId] = useState<string | null>(null)
    const [removingIdeaId, setRemovingIdeaId] = useState<string | null>(null)
    const [linkedAiIdeaIds, setLinkedAiIdeaIds] = useState<Set<string>>(new Set())
    const [hiddenThreadIds, setHiddenThreadIds] = useState<Set<string>>(new Set())
    const [unreadNotificationCommentIds, setUnreadNotificationCommentIds] = useState<Set<string>>(new Set())
    const sessionStartedAtRef = useRef(new Date())
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        let cancelled = false

        async function refreshLinkedAiIdeas() {
            if (!activeSceneId) {
                if (!cancelled) setLinkedAiIdeaIds(new Set())
                return
            }

            const { data, error } = await supabase
                .from('scene_ideas')
                .select('idea_id')
                .eq('scene_id', activeSceneId)

            if (cancelled) return
            if (error) {
                console.error('Failed to load AI-linked idea ids:', error)
                setLinkedAiIdeaIds(new Set())
                return
            }

            setLinkedAiIdeaIds(new Set((data ?? []).map((row: any) => row.idea_id)))
        }

        refreshLinkedAiIdeas()

        return () => {
            cancelled = true
        }
    }, [activeSceneId, supabase])

    useEffect(() => {
        let cancelled = false

        async function loadThreadPreferences() {
            if (!currentUserId) return

            const { data, error } = await (supabase as any)
                .from('project_comment_thread_preferences')
                .select('root_comment_id, hidden_at')
                .eq('project_id', projectId)
                .eq('user_id', currentUserId)
                .not('hidden_at', 'is', null)

            if (cancelled) return
            if (error) {
                console.error('Failed to load comment thread preferences:', error)
                return
            }

            setHiddenThreadIds(new Set((data ?? []).map((row: any) => row.root_comment_id)))
        }

        loadThreadPreferences()

        return () => {
            cancelled = true
        }
    }, [currentUserId, projectId, supabase])

    useEffect(() => {
        if (!currentUserId) {
            setUnreadNotificationCommentIds(new Set())
            return
        }

        const userId = currentUserId
        let cancelled = false

        async function loadUnreadFeedbackNotifications() {
            const { data, error } = await supabase
                .from('notifications')
                .select('comment_id')
                .eq('user_id', userId)
                .eq('project_id', projectId)
                .eq('type', 'collaborator_feedback')
                .is('read_at', null)
                .not('comment_id', 'is', null)

            if (cancelled) return
            if (error) {
                console.error('Failed to load unread feedback notifications:', error)
                return
            }

            setUnreadNotificationCommentIds(new Set(
                (data ?? [])
                    .map((row: any) => row.comment_id)
                    .filter((commentId: unknown): commentId is string => typeof commentId === 'string' && commentId.length > 0)
            ))
        }

        void loadUnreadFeedbackNotifications()

        const channel = supabase
            .channel(`comment-notifications:${projectId}:${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            }, () => {
                void loadUnreadFeedbackNotifications()
            })
            .subscribe()

        return () => {
            cancelled = true
            void channel.unsubscribe()
        }
    }, [currentUserId, projectId, supabase])

    const addedCommentIds = useMemo(() => {
        if (!activeSceneId || linkedAiIdeaIds.size === 0) return new Set<string>()

        return new Set(
            comments
                .filter(comment => {
                    const links = Array.isArray(comment.anchor_data?.aiLinkedIdeas) ? comment.anchor_data.aiLinkedIdeas : []
                    return links.some((link: any) =>
                        link?.sceneId === activeSceneId &&
                        linkedAiIdeaIds.has(link?.ideaId) &&
                        getAiLinkMode(link) === 'single'
                    )
                })
                .map(comment => comment.id)
        )
    }, [comments, activeSceneId, linkedAiIdeaIds])

    const addedThreadCommentIds = useMemo(() => {
        if (!activeSceneId || linkedAiIdeaIds.size === 0) return new Set<string>()

        return new Set(
            comments
                .filter(comment => !comment.parent_id)
                .filter(comment => {
                    const links = Array.isArray(comment.anchor_data?.aiLinkedIdeas) ? comment.anchor_data.aiLinkedIdeas : []
                    return links.some((link: any) =>
                        link?.sceneId === activeSceneId &&
                        linkedAiIdeaIds.has(link?.ideaId) &&
                        getAiLinkMode(link) === 'thread'
                    )
                })
                .map(comment => comment.id)
        )
    }, [comments, activeSceneId, linkedAiIdeaIds])

    const handleTyping = (threadId: string | null) => {
        sendTypingIndicator(threadId)
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        
        typingTimeoutRef.current = setTimeout(() => {
            sendTypingIndicator(null)
            typingTimeoutRef.current = null
        }, 3000)
    }

    const handleAddAsIdea = async (comment: any, mode: 'single' | 'thread' = 'single') => {
        if (!projectId || !comment.content) return
        if (mode === 'single' && addedCommentIds.has(comment.id)) return
        if (mode === 'thread' && addedThreadCommentIds.has(comment.id)) return

        if (mode === 'thread') {
            setAddingThreadIdeaId(comment.id)
        } else {
            setAddingIdeaId(comment.id)
        }
        
        try {
            const threadComments = mode === 'thread'
                ? [
                    comment,
                    ...comments
                        .filter(reply => reply.parent_id === comment.id)
                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                ]
                : [comment]

            // 1. Create the idea
            const content = buildFeedbackIdeaContent({
                rootComment: comment,
                threadComments,
                mode,
            })
            const referenceText = comment.anchor_data?.text
            
            // If it's inline feedback and content is just the placeholder, use the reference text for the title
            let titleSource = comment.content
            if (referenceText && (comment.content === 'Add your feedback...' || !comment.content)) {
                titleSource = referenceText
            }

            const truncated = titleSource.length > 10 ? titleSource.slice(0, 10) + '...' : titleSource
            const { data: idea, error: ideaError } = await (supabase as any)
                .from('ideas')
                .insert({
                    project_id: projectId,
                    title: mode === 'thread' ? `Feedback Thread: ${truncated}` : `Feedback: ${truncated}`,
                    content: content,
                    order_index: 0
                })
                .select()
                .single()

            if (ideaError) throw ideaError

            // 2. Link to scene if possible
            if (activeSceneId) {
                const { error: linkError } = await supabase
                    .from('scene_ideas')
                    .insert({
                        scene_id: activeSceneId,
                        idea_id: idea.id
                    })
                
                if (linkError) {
                    console.error('Failed to link idea to scene:', linkError)
                }
            }

            const existingLinks = Array.isArray(comment.anchor_data?.aiLinkedIdeas)
                ? comment.anchor_data.aiLinkedIdeas
                : []
            const nextAnchorData = {
                ...(comment.anchor_data && typeof comment.anchor_data === 'object' ? comment.anchor_data : {}),
                aiLinkedIdeas: [
                    ...existingLinks,
                    { ideaId: idea.id, sceneId: activeSceneId ?? null, mode }
                ]
            }

            const { error: commentLinkError } = await supabase
                .from('project_comments')
                .update({ anchor_data: nextAnchorData })
                .eq('id', comment.id)

            if (commentLinkError) {
                throw commentLinkError
            }

            setComments(prev => prev.map(currentComment =>
                currentComment.id === comment.id
                    ? { ...currentComment, anchor_data: nextAnchorData }
                    : currentComment
            ))

            toast.success('Added as Project Idea', {
                description: activeSceneId 
                    ? mode === 'thread'
                        ? 'This feedback thread is now linked to the AI Assistant context.'
                        : 'This feedback is now linked to the AI Assistant context.'
                    : 'This feedback was saved as a project idea.'
            })
            if (idea?.id) {
                setLinkedAiIdeaIds(prev => new Set(prev).add(idea.id))
            }
            router.refresh()
        } catch (err: any) {
            console.error('Failed to add comment as idea:', err)
            toast.error('Failed to link to extension')
        } finally {
            if (mode === 'thread') {
                setAddingThreadIdeaId(null)
            } else {
                setAddingIdeaId(null)
            }
        }
    }

    const handleRemoveFromAssistant = async (comment: any, mode: 'single' | 'thread' = 'single') => {
        if (!activeSceneId) return

        const existingLinks = Array.isArray(comment.anchor_data?.aiLinkedIdeas)
            ? comment.anchor_data.aiLinkedIdeas
            : []
        const linksForCurrentScene = existingLinks.filter((link: any) =>
            link?.sceneId === activeSceneId &&
            link?.ideaId &&
            getAiLinkMode(link) === mode
        )

        if (linksForCurrentScene.length === 0) return

        setRemovingIdeaId(comment.id)

        try {
            const ideaIds = linksForCurrentScene.map((link: any) => link.ideaId)

            const { error: unlinkError } = await supabase
                .from('scene_ideas')
                .delete()
                .eq('scene_id', activeSceneId)
                .in('idea_id', ideaIds)

            if (unlinkError) throw unlinkError

            const nextAnchorData = {
                ...(comment.anchor_data && typeof comment.anchor_data === 'object' ? comment.anchor_data : {}),
                aiLinkedIdeas: existingLinks.filter((link: any) =>
                    !(link?.sceneId === activeSceneId && link?.ideaId && getAiLinkMode(link) === mode)
                ),
            }

            const { error: commentUpdateError } = await supabase
                .from('project_comments')
                .update({ anchor_data: nextAnchorData })
                .eq('id', comment.id)

            if (commentUpdateError) throw commentUpdateError

            setComments(prev => prev.map(currentComment =>
                currentComment.id === comment.id
                    ? { ...currentComment, anchor_data: nextAnchorData }
                    : currentComment
            ))

            setLinkedAiIdeaIds(prev => {
                const next = new Set(prev)
                ideaIds.forEach((ideaId: string) => next.delete(ideaId))
                return next
            })

            toast.success('Removed from AI Context', {
                description: mode === 'thread'
                    ? 'This feedback thread is no longer linked to the AI Assistant context.'
                    : 'This feedback is no longer linked to the AI Assistant context.'
            })
            router.refresh()
        } catch (err: any) {
            console.error('Failed to unlink feedback from AI context:', err)
            toast.error('Failed to remove from AI context')
        } finally {
            setRemovingIdeaId(null)
        }
    }

    async function handleDeleteComment(commentId: string) {
        try {
            await deleteComment(commentId)
            router.refresh()
        } catch (error) {
            console.error('Failed to delete comment:', error)
            toast.error('Failed to delete feedback')
        }
    }

    const onDragEnd = (result: any) => {
        if (!result.destination) return

        const items = Array.from(filteredComments)
        const [reorderedItem] = items.splice(result.source.index, 1)
        items.splice(result.destination.index, 0, reorderedItem)

        // Only update if order actually changed
        if (result.destination.index !== result.source.index) {
            reorderComments(items.map(i => i.id))
        }
    }

    const canReorderComments = role !== 'viewer'

    const canViewerLeaveFeedback = role !== 'viewer' || allowViewerFeedback
    const canReplyToComments = role === 'owner' || role === 'editor'
    const canAddFeedbackToAssistant = role === 'owner' || role === 'editor'
    const commentById = useMemo(() => {
        const map = new Map<string, any>()
        comments.forEach(comment => map.set(comment.id, comment))
        return map
    }, [comments])

    const rootCommentIdByCommentId = useMemo(() => {
        const map = new Map<string, string>()

        const resolveRootId = (comment: any): string => {
            const cached = map.get(comment.id)
            if (cached) return cached
            if (!comment.parent_id) {
                map.set(comment.id, comment.id)
                return comment.id
            }

            const parentComment = commentById.get(comment.parent_id)
            const rootId = parentComment ? resolveRootId(parentComment) : comment.id
            map.set(comment.id, rootId)
            return rootId
        }

        comments.forEach(comment => {
            resolveRootId(comment)
        })

        return map
    }, [commentById, comments])

    const canUserSeeComment = useMemo(() => {
        const canSeeRecursive = (comment: any): boolean => {
            if (role === 'owner' || role === 'editor') return true
            if (comment.author_id === currentUserId) return true
            if (comment.is_shared) return true
            if (shareOwnerFeedback && comment.author_id === projectOwnerId) return true
            if (comment.parent_id) {
                const parentComment = commentById.get(comment.parent_id)
                if (parentComment) {
                    return canSeeRecursive(parentComment)
                }
            }
            return false
        }

        return canSeeRecursive
    }, [commentById, currentUserId, projectOwnerId, role, shareOwnerFeedback])
    const canFilterByAuthor = !!currentUserId

    const getVisibleReplies = useMemo(() => {
        return (parentId: string) => comments.filter(c => {
            if (c.parent_id !== parentId) return false
            return canUserSeeComment(c)
        })
    }, [canUserSeeComment, comments])

    const visibleTopLevelComments = useMemo(() => {
        return comments.filter(comment => !comment.parent_id && canUserSeeComment(comment))
    }, [canUserSeeComment, comments])

    const visibleCommentsByHiddenState = useMemo(() => {
        const visible = visibleTopLevelComments.filter(comment => !hiddenThreadIds.has(comment.id))
        const hidden = visibleTopLevelComments.filter(comment => hiddenThreadIds.has(comment.id))
        return { visible, hidden }
    }, [hiddenThreadIds, visibleTopLevelComments])

    const sessionNewCommentIds = useMemo(() => {
        if (!currentUserId) return new Set<string>()

        const sessionStart = sessionStartedAtRef.current.getTime()
        const activeThreadIds = new Set<string>()

        comments.forEach(comment => {
            if (!canUserSeeComment(comment)) return
            if (comment.author_id === currentUserId) return

            const rootId = rootCommentIdByCommentId.get(comment.id)
            if (!rootId || hiddenThreadIds.has(rootId)) return

            const createdAt = new Date(comment.created_at).getTime()
            const updatedAt = new Date(comment.updated_at).getTime()

            if (Math.max(createdAt, updatedAt) >= sessionStart) {
                activeThreadIds.add(rootId)
            }
        })

        return activeThreadIds
    }, [canUserSeeComment, comments, currentUserId, hiddenThreadIds, rootCommentIdByCommentId])

    const unreadNotificationThreadIds = useMemo(() => {
        const threadIds = new Set<string>()

        unreadNotificationCommentIds.forEach(commentId => {
            const rootId = rootCommentIdByCommentId.get(commentId)
            if (!rootId || hiddenThreadIds.has(rootId)) return
            threadIds.add(rootId)
        })

        return threadIds
    }, [hiddenThreadIds, rootCommentIdByCommentId, unreadNotificationCommentIds])

    const newThreadIds = useMemo(() => {
        const threadIds = new Set<string>(sessionNewCommentIds)
        unreadNotificationThreadIds.forEach(threadId => threadIds.add(threadId))
        return threadIds
    }, [sessionNewCommentIds, unreadNotificationThreadIds])

    const filteredComments = useMemo(() => {
        let list = authorFilter === 'hidden'
            ? [...visibleCommentsByHiddenState.hidden]
            : [...visibleCommentsByHiddenState.visible]

        if (authorFilter === 'new') {
            list = list.filter(c => newThreadIds.has(c.id))
        }

        if (authorFilter === 'mine' && currentUserId) {
            list = list.filter(c => c.author_id === currentUserId)
        }

        if (authorFilter === 'collaborators' && currentUserId) {
            list = list.filter(c => c.author_id !== currentUserId)
        }

        if (authorFilter === 'ai') {
            list = list.filter(c => c.anchor_data?.type === 'ai-analysis')
        }
        
        if (filterByNode && activeNodeId) {
            list = list.filter(c => c.node_id === activeNodeId)
        }
        
        if (!showResolved) {
            list = list.filter(c => c.status !== 'resolved')
        }
        
        // Primary sort by order_index, fallback to created_at
        return list.sort((a, b) => {
            if ((a.order_index || 0) !== (b.order_index || 0)) {
                return (a.order_index || 0) - (b.order_index || 0)
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
    }, [authorFilter, visibleCommentsByHiddenState, newThreadIds, activeNodeId, currentUserId, filterByNode, showResolved])

    // Meta-counts for UI feedback
    const resolvedCount = useMemo(() =>
        visibleCommentsByHiddenState.visible.filter(c => c.status === 'resolved').length,
    [visibleCommentsByHiddenState.visible])
    
    const allProjectCount = useMemo(() => 
        visibleCommentsByHiddenState.visible.length,
    [visibleCommentsByHiddenState.visible])

    const currentSceneCount = useMemo(() => 
        visibleCommentsByHiddenState.visible.filter(c => c.node_id === activeNodeId).length,
    [visibleCommentsByHiddenState.visible, activeNodeId])

    const mineCount = useMemo(() => {
        if (!currentUserId) return 0

        return visibleCommentsByHiddenState.visible.filter(c => c.author_id === currentUserId).length
    }, [visibleCommentsByHiddenState.visible, currentUserId])

    const collaboratorCount = useMemo(() => {
        if (!currentUserId) return 0

        return visibleCommentsByHiddenState.visible.filter(c => c.author_id !== currentUserId).length
    }, [visibleCommentsByHiddenState.visible, currentUserId])

    const aiCount = useMemo(() =>
        visibleCommentsByHiddenState.visible.filter(c => c.anchor_data?.type === 'ai-analysis').length,
    [visibleCommentsByHiddenState.visible])

    const hiddenCount = useMemo(() =>
        visibleCommentsByHiddenState.hidden.length,
    [visibleCommentsByHiddenState.hidden])

    const newCount = useMemo(() =>
        visibleCommentsByHiddenState.visible.filter(comment => newThreadIds.has(comment.id)).length,
    [newThreadIds, visibleCommentsByHiddenState.visible])

    async function handleSetThreadHidden(rootCommentId: string, hidden: boolean) {
        if (!currentUserId) return

        const nextHiddenIds = new Set(hiddenThreadIds)
        if (hidden) {
            nextHiddenIds.add(rootCommentId)
        } else {
            nextHiddenIds.delete(rootCommentId)
        }
        setHiddenThreadIds(nextHiddenIds)

        const payload = {
            project_id: projectId,
            root_comment_id: rootCommentId,
            user_id: currentUserId,
            hidden_at: hidden ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
        }

        const { error } = await (supabase as any)
            .from('project_comment_thread_preferences')
            .upsert(payload, { onConflict: 'root_comment_id,user_id' })

        if (error) {
            console.error('Failed to update hidden thread state:', error)
            setHiddenThreadIds(new Set(hiddenThreadIds))
            toast.error('Failed to update hidden feedback')
        }
    }

    async function handleAddComment() {
        if (!canViewerLeaveFeedback) return
        if (!newCommentText.trim()) return
        try {
            await addComment({
                project_id: projectId,
                node_id: activeNodeId || undefined,
                content: newCommentText.trim(),
                is_shared: false,
            })
            setNewCommentText('')
        } catch (e: any) {
            console.error('Failed to add comment:', {
                message: e?.message || 'Unknown error',
                details: e?.details,
                hint: e?.hint,
                code: e?.code
            })
        }
    }

    async function handleAddReply(parentId: string) {
        if (role === 'viewer') return
        if (!replyText.trim()) return
        try {
            const parentComment = comments.find(comment => comment.id === parentId)
            await addComment({
                project_id: projectId,
                node_id: activeNodeId || undefined,
                content: replyText.trim(),
                parent_id: parentId,
                is_shared: parentComment?.is_shared ?? false,
            })
            setReplyText('')
            setReplyToId(null)
        } catch (e: any) {
            console.error('Failed to add reply:', {
                message: e?.message || 'Unknown error',
                details: e?.details,
                hint: e?.hint,
                code: e?.code
            })
        }
    }

    async function handleUpdate(id: string) {
        if (!editText.trim()) return
        try {
            await updateComment(id, editText.trim())
            setEditingId(null)
            setEditText('')
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className="comments-panel flex flex-col h-full min-h-0 bg-white">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <MessageSquare className="w-4 h-4" />
                    </div>
                    <h3 className="font-serif italic font-bold text-slate-800">Feedback</h3>
                </div>
                <div className="flex items-center gap-1.5">
                    <Tooltip>
                        <TooltipTrigger>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className={cn("h-8 px-2 w-auto min-w-[32px] rounded-lg gap-1.5", filterByNode ? "text-primary bg-primary/5" : "text-slate-400")}
                                onClick={() => setFilterByNode(!filterByNode)}
                            >
                                <Filter className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">{filterByNode ? currentSceneCount : allProjectCount}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{filterByNode ? "Switch to: All Project Feedback" : "Switch to: Current Scene Only"}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className={cn("h-8 px-2 w-auto min-w-[32px] rounded-lg gap-1.5", showResolved ? "text-emerald-500 bg-emerald-50" : "text-slate-400")}
                                onClick={() => setShowResolved(!showResolved)}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {resolvedCount > 0 && (
                                    <span className="text-[10px] font-bold">{resolvedCount}</span>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{showResolved ? "Hide Resolved" : "Show Resolved"}</TooltipContent>
                    </Tooltip>
                    {onClose && (
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    )}
                    {onClose && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            onClick={onClose}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {canFilterByAuthor && (
                <div className="border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <button
                            type="button"
                            onClick={() => setAuthorFilter('new')}
                            className={cn(
                                "rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors",
                                authorFilter === 'new'
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                            )}
                        >
                            New {newCount}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthorFilter('all')}
                            className={cn(
                                "rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors",
                                authorFilter === 'all'
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                            )}
                        >
                            All {allProjectCount}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthorFilter('mine')}
                            className={cn(
                                "rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors",
                                authorFilter === 'mine'
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                            )}
                        >
                            Mine {mineCount}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthorFilter('collaborators')}
                            className={cn(
                                "rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors",
                                authorFilter === 'collaborators'
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                            )}
                        >
                            Collaborators {collaboratorCount}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthorFilter('ai')}
                            className={cn(
                                "rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors",
                                authorFilter === 'ai'
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                            )}
                        >
                            AI {aiCount}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAuthorFilter('hidden')}
                            className={cn(
                                "rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors",
                                authorFilter === 'hidden'
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                            )}
                        >
                            Hidden {hiddenCount}
                        </button>
                    </div>
                </div>
            )}

            {/* Global Typing Indicator (outside thread) */}
            {typingUsers.some(u => !u.threadId) && (
                <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex gap-0.5">
                         <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                         <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                         <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {typingUsers.filter(u => !u.threadId).length === 1 
                            ? `${typingUsers.find(u => !u.threadId)?.userEmail} is typing...` 
                            : `${typingUsers.filter(u => !u.threadId).length} people are typing...`}
                    </span>
                </div>
            )}

            {/* List Area */}
            <ScrollArea className="flex-1 px-4 py-6">
                <div className="space-y-6 pb-20">
                    {filteredComments.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200">
                                <MessageCircle className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-serif italic text-slate-400">
                                {authorFilter === 'ai'
                                    ? (filterByNode ? "No AI feedback for this scene yet." : "No AI feedback saved yet.")
                                    : (filterByNode ? "No feedback for this scene yet." : "No project feedback yet.")}
                            </p>
                        </div>
                    )}

                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="comments-list">
                            {(provided) => (
                                <div 
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-6 pb-20"
                                >
                                    {filteredComments.map((comment, index) => (
                                        canReorderComments ? (
                                            <Draggable key={comment.id} draggableId={comment.id} index={index}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                    >
                                                        <CommentThread 
                                                            comment={comment}
                                                            replies={getVisibleReplies(comment.id)}
                                                            onReply={(id: string) => { setReplyToId(id); setReplyText('') }}
                                                            isReplying={replyToId === comment.id}
                                                            replyText={replyText}
                                                            setReplyText={setReplyText}
                                                            onAddReply={() => handleAddReply(comment.id)}
                                                            onCancelReply={() => setReplyToId(null)}
                                                            editingId={editingId}
                                                            onEdit={(id: string, text: string) => { setEditingId(id); setEditText(text) }}
                                                            editText={editText}
                                                            setEditText={setEditText}
                                                            onUpdate={handleUpdate}
                                                            onCancelEdit={() => setEditingId(null)}
                                                            onDelete={handleDeleteComment}
                                                            onResolve={resolveComment}
                                                            onToggleShare={setCommentSharing}
                                                            onSelectNode={onSelectNode}
                                                            onJumpTo={() => {
                                                                if (comment.node_id) onSelectNode?.(comment.node_id)
                                                                jumpToComment(comment.id)
                                                            }}
                                                            role={role}
                                                            isActive={activeCommentId === comment.id}
                                                            onActivate={() => setActiveCommentId(comment.id)}
                                                            typingUsers={typingUsers.filter(u => u.threadId === comment.id)}
                                                            onTypingChange={(isTyping: boolean) => sendTypingIndicator(isTyping ? comment.id : null)}
                                                            dragHandleProps={provided.dragHandleProps}
                                                            onAddToAssistant={handleAddAsIdea}
                                                            onAddThreadToAssistant={handleAddAsIdea}
                                                            onRemoveFromAssistant={handleRemoveFromAssistant}
                                                            onSetHidden={handleSetThreadHidden}
                                                            addingIdeaId={addingIdeaId}
                                                            addingThreadIdeaId={addingThreadIdeaId}
                                                            removingIdeaId={removingIdeaId}
                                                            addedCommentIds={addedCommentIds}
                                                            addedThreadCommentIds={addedThreadCommentIds}
                                                            activeSceneId={activeSceneId}
                                                            isHidden={hiddenThreadIds.has(comment.id)}
                                                            canHideThread={comment.author_id !== currentUserId}
                                                            canReply={canReplyToComments}
                                                            canShareWithGroup={true}
                                                            canAddToAssistant={canAddFeedbackToAssistant}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ) : (
                                            <CommentThread 
                                                key={comment.id}
                                                comment={comment}
                                                replies={getVisibleReplies(comment.id)}
                                                onReply={(id: string) => { setReplyToId(id); setReplyText('') }}
                                                isReplying={replyToId === comment.id}
                                                replyText={replyText}
                                                setReplyText={setReplyText}
                                                onAddReply={() => handleAddReply(comment.id)}
                                                onCancelReply={() => setReplyToId(null)}
                                                editingId={editingId}
                                                onEdit={(id: string, text: string) => { setEditingId(id); setEditText(text) }}
                                                editText={editText}
                                                setEditText={setEditText}
                                                onUpdate={handleUpdate}
                                                onCancelEdit={() => setEditingId(null)}
                                                onDelete={handleDeleteComment}
                                                onResolve={resolveComment}
                                                onToggleShare={setCommentSharing}
                                                onSelectNode={onSelectNode}
                                                onJumpTo={() => {
                                                    if (comment.node_id) onSelectNode?.(comment.node_id)
                                                    jumpToComment(comment.id)
                                                }}
                                                role={role}
                                                isActive={activeCommentId === comment.id}
                                                onActivate={() => setActiveCommentId(comment.id)}
                                                typingUsers={typingUsers.filter(u => u.threadId === comment.id)}
                                                onTypingChange={(isTyping: boolean) => sendTypingIndicator(isTyping ? comment.id : null)}
                                                dragHandleProps={null}
                                                onAddToAssistant={handleAddAsIdea}
                                                onAddThreadToAssistant={handleAddAsIdea}
                                                onRemoveFromAssistant={handleRemoveFromAssistant}
                                                onSetHidden={handleSetThreadHidden}
                                                addingIdeaId={addingIdeaId}
                                                addingThreadIdeaId={addingThreadIdeaId}
                                                removingIdeaId={removingIdeaId}
                                                addedCommentIds={addedCommentIds}
                                                addedThreadCommentIds={addedThreadCommentIds}
                                                activeSceneId={activeSceneId}
                                                isHidden={hiddenThreadIds.has(comment.id)}
                                                canHideThread={comment.author_id !== currentUserId}
                                                canReply={canReplyToComments}
                                                canShareWithGroup={true}
                                                canAddToAssistant={canAddFeedbackToAssistant}
                                            />
                                        )
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            </ScrollArea>

            {/* Input Footer */}
            <div className="p-4 pb-24 md:pb-4 border-t border-slate-100 bg-slate-50/50">
                <div className="relative" suppressHydrationWarning>
                    <textarea
                        placeholder={canViewerLeaveFeedback ? "Add a thought..." : "The owner has not enabled viewer feedback for this project."}
                        value={newCommentText}
                        onChange={(e) => {
                            setNewCommentText(e.target.value)
                            handleTyping(null)
                        }}
                        disabled={!canViewerLeaveFeedback}
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px] resize-none font-sans"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                handleAddComment()
                            }
                        }}
                        suppressHydrationWarning
                    />
                    <Button 
                        size="icon" 
                        onClick={handleAddComment}
                        disabled={!canViewerLeaveFeedback || !newCommentText.trim()}
                        className="absolute right-3 bottom-3 h-8 w-8 rounded-xl sanctuary-btn-primary shadow-lg"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                {!canViewerLeaveFeedback && role === 'viewer' && (
                    <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">
                        Viewer feedback is currently disabled by the owner.
                    </p>
                )}
            </div>
        </div>
    )
}

function CommentThread({ 
    comment, 
    replies, 
    onReply, 
    isReplying, 
    replyText, 
    setReplyText, 
    onAddReply, 
    onCancelReply,
    editingId,
    onEdit,
    editText,
    setEditText,
    onUpdate,
    onCancelEdit,
    onDelete,
    onResolve,
    onToggleShare,
    onSelectNode,
    role,
    isActive,
    onActivate,
    typingUsers,
    onTypingChange,
    onJumpTo,
    dragHandleProps,
    isDetached,
    onAddToAssistant,
    onAddThreadToAssistant,
    onRemoveFromAssistant,
    onSetHidden,
    addingIdeaId,
    addingThreadIdeaId,
    removingIdeaId,
    addedCommentIds,
    addedThreadCommentIds,
    activeSceneId,
    isHidden,
    canHideThread,
    canReply,
    canShareWithGroup,
    canAddToAssistant
}: any) {
    const isOwnerOrEditor = role === 'owner' || role === 'editor'
    const isResolved = comment.status === 'resolved'
    
    return (
        <div className={cn(
            "transition-all duration-300 rounded-[18px] sm:rounded-[24px] border border-transparent overflow-hidden",
            isActive && "bg-white border-primary/20 shadow-xl shadow-primary/5 ring-1 ring-primary/10",
            !isActive && "hover:border-slate-200"
        )}>
            <div className={cn(
                "p-3 sm:p-4 space-y-3 sm:space-y-4",
                isResolved && "opacity-60 bg-slate-50/30"
            )}>
                <CommentItem 
                    comment={comment} 
                    isOwnerOrEditor={isOwnerOrEditor}
                    role={role}
                    onReply={canReply ? (() => onReply(comment.id)) : undefined}
                    isEditing={editingId === comment.id}
                    onEdit={() => onEdit(comment.id, comment.content)}
                    editText={editText}
                    setEditText={setEditText}
                    onUpdate={() => onUpdate(comment.id)}
                    onCancelEdit={onCancelEdit}
                    onDelete={() => onDelete(comment.id)}
                    onResolve={() => onResolve(comment.id, comment.status === 'open')}
                    onToggleShare={(isShared: boolean) => onToggleShare(comment.id, isShared)}
                    onSelectNode={onSelectNode}
                    onJumpTo={onJumpTo}
                    isActive={isActive}
                    onActivate={onActivate}
                    isDetached={isDetached}
                    replies={replies}
                    dragHandleProps={dragHandleProps}
                    onAddToAssistant={onAddToAssistant}
                    onAddThreadToAssistant={onAddThreadToAssistant}
                    onRemoveFromAssistant={onRemoveFromAssistant}
                    onSetHidden={onSetHidden}
                    addingIdeaId={addingIdeaId}
                    addingThreadIdeaId={addingThreadIdeaId}
                    removingIdeaId={removingIdeaId}
                    addedCommentIds={addedCommentIds}
                    addedThreadCommentIds={addedThreadCommentIds}
                    activeSceneId={activeSceneId}
                    isHidden={isHidden}
                    canHideThread={canHideThread}
                    canShareWithGroup={canShareWithGroup}
                    canAddToAssistant={canAddToAssistant}
                />
                
                {replies.length > 0 && (
                    <div className="ml-4 sm:ml-7 border-l-2 border-slate-100/80 pl-3 sm:pl-4 space-y-3 sm:space-y-4 pt-1 sm:pt-2">
                        {replies.map((reply: any) => (
                            <CommentItem 
                                key={reply.id}
                                comment={reply}
                                isOwnerOrEditor={isOwnerOrEditor}
                                role={role}
                                isEditing={editingId === reply.id}
                                onEdit={() => onEdit(reply.id, reply.content)}
                                editText={editText}
                                setEditText={setEditText}
                                onUpdate={() => onUpdate(reply.id)}
                                onCancelEdit={onCancelEdit}
                                onDelete={() => onDelete(reply.id)}
                                isReply
                                onToggleShare={(isShared: boolean) => onToggleShare(reply.id, isShared)}
                                onAddToAssistant={onAddToAssistant}
                                onAddThreadToAssistant={onAddThreadToAssistant}
                                onRemoveFromAssistant={onRemoveFromAssistant}
                                addingIdeaId={addingIdeaId}
                                addingThreadIdeaId={addingThreadIdeaId}
                                removingIdeaId={removingIdeaId}
                                addedCommentIds={addedCommentIds}
                                addedThreadCommentIds={addedThreadCommentIds}
                                activeSceneId={activeSceneId}
                                canShareWithGroup={canShareWithGroup}
                                canAddToAssistant={canAddToAssistant}
                            />
                        ))}
                    </div>
                )}

                {isReplying && canReply && (
                    <div className="ml-4 sm:ml-7 border-l-2 border-slate-100/80 pl-3 sm:pl-4">
                        <div className="relative">
                            <textarea
                                autoFocus
                                placeholder="Write a reply..."
                                value={replyText}
                                onChange={(e) => {
                                    setReplyText(e.target.value)
                                    onTypingChange(true)
                                }}
                                className="w-full bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 pr-10 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] sm:min-h-[100px] resize-none font-sans"
                            />
                            <div className="flex justify-end gap-2 mt-2 sm:mt-3">
                                 <Button variant="ghost" size="sm" className="h-7 sm:h-8 text-[10px] uppercase tracking-widest font-bold rounded-xl" onClick={onCancelReply}>Cancel</Button>
                                 <Button size="sm" className="h-7 sm:h-8 px-3 sm:px-4 text-[10px] uppercase tracking-widest font-bold rounded-xl sanctuary-btn-primary shadow-lg" onClick={onAddReply}>Reply</Button>
                            </div>
                        </div>
                    </div>
                )}

                {typingUsers.length > 0 && !isReplying && (
                    <div className="ml-7 border-l-2 border-slate-100/80 pl-4 py-2 flex items-center gap-2 animate-in fade-in transition-all duration-500">
                        <div className="flex gap-0.5">
                             <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                             <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                             <div className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic animate-pulse">
                            Someone is writing a reply...
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

function CommentItem({ 
    comment, 
    isOwnerOrEditor, 
    onReply, 
    isEditing, 
    onEdit, 
    editText, 
    setEditText, 
    onUpdate, 
    onCancelEdit,
    onDelete,
    onResolve,
    onToggleShare,
    onSelectNode,
    onJumpTo,
    isActive,
    onActivate,
    isDetached,
    replies = [],
    dragHandleProps,
    isReply,
    role,
    onAddToAssistant,
    onAddThreadToAssistant,
    onRemoveFromAssistant,
    onSetHidden,
    addingIdeaId,
    addingThreadIdeaId,
    removingIdeaId,
    addedCommentIds,
    addedThreadCommentIds,
    activeSceneId,
    isHidden,
    canHideThread,
    canShareWithGroup,
    canAddToAssistant
}: any) {
    const supabase = createClient()
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    
    useEffect(() => {
        void getUserSafely(supabase)
            .then(({ user }) => setCurrentUserId(user?.id || null))
            .catch((error) => {
                console.error('Failed to load comment item user:', error)
                setCurrentUserId(null)
            })
    }, [supabase])

    const isAuthor = currentUserId === comment.author_id

    return (
        <div 
            className={cn(
                "group transition-all cursor-pointer relative",
                isReply && "py-0.5 sm:py-1",
                !isReply && "bg-slate-50/50 rounded-2xl p-3 sm:p-4 border border-transparent hover:bg-white hover:border-slate-200 hover:shadow-md",
                isActive && !isReply && "bg-white border-primary/20 shadow-xl shadow-primary/5 ring-1 ring-primary/10",
                comment.status === 'resolved' && "bg-emerald-50/10"
            )}
            onClick={() => {
                onActivate?.()
                if (comment.node_id) onSelectNode?.(comment.node_id)
            }}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    {dragHandleProps && (
                        <div {...dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1 -ml-2">
                            <GripVertical className="w-3.5 h-3.5" />
                        </div>
                    )}
                    <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm transition-all border border-white",
                        getUserColor(comment.author_email || '')
                    )}>
                        {comment.author_email?.[0]?.toUpperCase() || '?' }
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">
                                {comment.author_email}
                            </span>
                            {!isReply && (
                                <Badge variant="outline" className={cn(
                                    "px-1.5 h-4 text-[7px] font-bold uppercase tracking-[0.1em] rounded-md",
                                    comment.anchor_data?.type === 'inline'
                                        ? "bg-amber-100/50 text-amber-600 border-amber-200/50"
                                        : comment.anchor_data?.type === 'ai-analysis'
                                            ? "bg-violet-100/70 text-violet-600 border-violet-200/70"
                                            : "bg-blue-100/50 text-blue-600 border-blue-200/50"
                                )}>
                                    {comment.anchor_data?.type === 'inline'
                                        ? 'Inline'
                                        : comment.anchor_data?.type === 'ai-analysis'
                                            ? 'AI'
                                            : 'Scene'}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(comment.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>

            {isEditing ? (
                <div className="space-y-2 mt-2">
                    <textarea
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
                    />
                    <div className="flex justify-end gap-2">
                         <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase tracking-widest font-bold" onClick={onCancelEdit}>Cancel</Button>
                         <Button size="sm" className="h-7 px-3 text-[10px] uppercase tracking-widest font-bold sanctuary-btn-primary" onClick={onUpdate}>Save</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {comment.anchor_data?.type === 'inline' && (
                        <div className={cn(
                            "bg-slate-100/50 border-l-2 border-slate-200 px-3 py-2 rounded-r-xl mb-3 relative overflow-hidden",
                            isDetached && "bg-amber-50/80 border-amber-300"
                        )}>
                             <div className="flex items-center justify-between mb-1.5">
                                 <p className={cn(
                                    "text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                                    isDetached ? "text-amber-600" : "text-slate-400"
                                 )}>
                                    {isDetached ? <AlertCircle className="w-2.5 h-2.5" /> : null}
                                    {isDetached ? 'Missing Anchor' : 'Referenced Text'}
                                 </p>
                             </div>
                             <p className={cn(
                                "text-xs italic leading-relaxed",
                                isDetached ? "text-amber-700/60" : "text-slate-500 line-clamp-2"
                             )}>
                                "{comment.anchor_data.text}"
                             </p>
                             {isDetached && (
                                <div className="mt-2 pt-2 border-t border-amber-100/50">
                                    <span className="text-[10px] text-amber-700/80 font-medium">The highlighted text was deleted or significantly moved.</span>
                                </div>
                             )}
                        </div>
                    )}
                    <p className={cn(
                        "text-sm text-slate-600 font-sans leading-relaxed whitespace-pre-wrap",
                        comment.status === 'resolved' && "line-through text-slate-400/80 italic"
                    )}>
                        {comment.content}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100/50 flex items-center justify-between">
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            {onJumpTo && !isReply && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5" 
                                            onClick={(e) => { e.stopPropagation(); onJumpTo(); }}
                                        >
                                            <Target className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Jump to position</TooltipContent>
                                </Tooltip>
                            )}
                            {!isReply && onReply && comment.status !== 'resolved' && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5" onClick={(e) => { e.stopPropagation(); onReply(); }}>
                                    <Reply className="w-4 h-4" />
                                </Button>
                            )}
                            {isAuthor && canShareWithGroup && !isReply && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={cn(
                                                "h-7 w-7 rounded-lg transition-all",
                                                comment.is_shared
                                                    ? "text-sky-600 bg-sky-50 hover:bg-sky-100"
                                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onToggleShare?.(!comment.is_shared)
                                            }}
                                        >
                                            {comment.is_shared ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        {comment.is_shared ? 'Shared with collaborators who can access this thread' : 'Private to you only'}
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {!isReply && onResolve && isOwnerOrEditor && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className={cn(
                                                "h-7 w-7 rounded-lg transition-all",
                                                comment.status === 'resolved' 
                                                    ? "text-emerald-500 bg-emerald-50" 
                                                    : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50"
                                            )}
                                            onClick={(e) => { e.stopPropagation(); onResolve(); }}
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{comment.status === 'resolved' ? "Reopen" : "Resolve"}</TooltipContent>
                                </Tooltip>
                            )}
                            {isAuthor && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                                            <Edit3 className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Edit</TooltipContent>
                                </Tooltip>
                            )}
                            {!isReply && canHideThread && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onSetHidden?.(comment.id, !isHidden)
                                            }}
                                        >
                                            {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        {isHidden ? 'Show this thread again' : 'Hide this thread for you'}
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {isAuthor && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/5" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Delete</TooltipContent>
                                </Tooltip>
                            )}

                            {activeSceneId && canAddToAssistant && (
                                <>
                                    <div className="w-[1px] h-3 bg-slate-200/50 mx-1" />
                                    {addedCommentIds.has(comment.id) ? (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 rounded-lg bg-emerald-50 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-emerald-600 hover:bg-emerald-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onRemoveFromAssistant(comment, 'single')
                                                    }}
                                                    disabled={removingIdeaId !== null}
                                                >
                                                    {removingIdeaId === comment.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Check className="w-3 h-3" />
                                                    )}
                                                    AI
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Remove from AI Assistant</TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all group/brain" 
                                                    onClick={(e) => { e.stopPropagation(); onAddToAssistant(comment, 'single'); }}
                                                    disabled={addingIdeaId !== null || addingThreadIdeaId !== null}
                                                >
                                                    {addingIdeaId === comment.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <BrainCircuit className="w-3.5 h-3.5 group-hover/brain:scale-110 transition-transform" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">Add to AI Assistant</TooltipContent>
                                        </Tooltip>
                                    )}
                                    {!isReply && replies.length > 0 && (
                                        addedThreadCommentIds.has(comment.id) ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 rounded-lg bg-indigo-50 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-indigo-600 hover:bg-indigo-100"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onRemoveFromAssistant(comment, 'thread')
                                                        }}
                                                        disabled={removingIdeaId !== null}
                                                    >
                                                        {removingIdeaId === comment.id ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Check className="w-3 h-3" />
                                                        )}
                                                        Thread
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">Remove thread from AI Assistant</TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 rounded-lg px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onAddThreadToAssistant(comment, 'thread')
                                                        }}
                                                        disabled={addingIdeaId !== null || addingThreadIdeaId !== null}
                                                    >
                                                        {addingThreadIdeaId === comment.id ? (
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <MessageCircle className="w-3 h-3" />
                                                        )}
                                                        Thread
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">Add thread to AI Assistant</TooltipContent>
                                            </Tooltip>
                                        )
                                    )}
                                </>
                            )}
                        </div>

                        {comment.status === 'resolved' && comment.resolved_at ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold uppercase tracking-wider text-[9px]">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Resolved</span>
                            </div>
                        ) : (
                            <div className="text-[10px] text-slate-300 font-medium italic">
                                ID: {comment.id.slice(0, 4)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
