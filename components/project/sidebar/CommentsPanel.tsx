'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useComments } from '@/components/project/CommentsContext'
import { useProjectActions } from '@/components/project/ProjectContext'
import { 
    MessageSquare, 
    Send, 
    CheckCircle2, 
    Circle, 
    Reply, 
    Trash2, 
    Edit3, 
    User,
    Clock,
    Filter,
    X,
    MessageCircle,
    AlertCircle,
    GripVertical,
    Target
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, getUserColor } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase/client'

export default function CommentsPanel({ 
    projectId, 
    activeNodeId, 
    onSelectNode 
}: { 
    projectId: string, 
    activeNodeId: string | null,
    onSelectNode?: (id: string) => void
}) {
    const { 
        comments, 
        isLoading, 
        addComment, 
        updateComment, 
        deleteComment, 
        resolveComment,
        activeCommentId,
        setActiveCommentId,
        typingUsers,
        sendTypingIndicator,
        detachedCommentIds,
        jumpToComment,
        reorderComments
    } = useComments()
    const { role } = useProjectActions()
    
    const [filterByNode, setFilterByNode] = useState(true)
    const [showResolved, setShowResolved] = useState(false)
    const [newCommentText, setNewCommentText] = useState('')
    const [replyToId, setReplyToId] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editText, setEditText] = useState('')
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const supabaseClient = createClient()
    
    useEffect(() => {
        supabaseClient.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null))
    }, [])

    const handleTyping = (threadId: string | null) => {
        sendTypingIndicator(threadId)
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        
        typingTimeoutRef.current = setTimeout(() => {
            sendTypingIndicator(null)
            typingTimeoutRef.current = null
        }, 3000)
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

    const filteredComments = useMemo(() => {
        let list = comments.filter(c => !c.parent_id)
        
        // Rule: Viewers can only see their own threads 
        // (threads they started)
        if (role === 'viewer') {
            list = list.filter(c => c.author_id === currentUserId)
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
    }, [comments, activeNodeId, filterByNode, showResolved, currentUserId, role])

    // Meta-counts for UI feedback
    const resolvedCount = useMemo(() => 
        comments.filter(c => !c.parent_id && c.status === 'resolved').length, 
    [comments])
    
    const allProjectCount = useMemo(() => 
        comments.filter(c => !c.parent_id).length, 
    [comments])

    const currentSceneCount = useMemo(() => 
        comments.filter(c => !c.parent_id && c.node_id === activeNodeId).length, 
    [comments, activeNodeId])

    async function handleAddComment() {
        if (!newCommentText.trim()) return
        try {
            await addComment({
                project_id: projectId,
                node_id: activeNodeId || undefined,
                content: newCommentText.trim()
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
        if (!replyText.trim()) return
        try {
            await addComment({
                project_id: projectId,
                node_id: activeNodeId || undefined,
                content: replyText.trim(),
                parent_id: parentId
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
        <div className="flex flex-col h-full bg-white">
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
                        <TooltipContent side="bottom">{showResolved ? "Hide resolved items" : "Show resolved items"}</TooltipContent>
                    </Tooltip>
                </div>
            </div>

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
                                {filterByNode ? "No feedback for this scene yet." : "No project feedback yet."}
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
                                        <Draggable key={comment.id} draggableId={comment.id} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                >
                                                    <CommentThread 
                                                        comment={comment}
                                                        replies={comments.filter(c => c.parent_id === comment.id)}
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
                                                        onDelete={deleteComment}
                                                        onResolve={resolveComment}
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
                                                        dragHandleProps={role !== 'viewer' ? provided.dragHandleProps : null}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            </ScrollArea>

            {/* Input Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <div className="relative" suppressHydrationWarning>
                    <textarea
                        placeholder="Add a thought..."
                        value={newCommentText}
                        onChange={(e) => {
                            setNewCommentText(e.target.value)
                            handleTyping(null)
                        }}
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
                        disabled={!newCommentText.trim()}
                        className="absolute right-3 bottom-3 h-8 w-8 rounded-xl sanctuary-btn-primary shadow-lg"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                    CMD + Enter to send
                </div>
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
    onSelectNode,
    role,
    isActive,
    onActivate,
    typingUsers,
    onTypingChange,
    onJumpTo,
    dragHandleProps,
    isDetached
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
                    onReply={() => onReply(comment.id)}
                    isEditing={editingId === comment.id}
                    onEdit={() => onEdit(comment.id, comment.content)}
                    editText={editText}
                    setEditText={setEditText}
                    onUpdate={() => onUpdate(comment.id)}
                    onCancelEdit={onCancelEdit}
                    onDelete={() => onDelete(comment.id)}
                    onResolve={() => onResolve(comment.id, comment.status === 'open')}
                    onSelectNode={onSelectNode}
                    onJumpTo={onJumpTo}
                    isActive={isActive}
                    onActivate={onActivate}
                    isDetached={isDetached}
                    dragHandleProps={dragHandleProps}
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
                            />
                        ))}
                    </div>
                )}

                {isReplying && (
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
    onSelectNode,
    onJumpTo,
    isActive,
    onActivate,
    isDetached,
    dragHandleProps,
    isReply,
    role
}: any) {
    const supabase = createClient()
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null))
    }, [])

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
                                        : "bg-blue-100/50 text-blue-600 border-blue-200/50"
                                )}>
                                    {comment.anchor_data?.type === 'inline' ? 'Inline' : 'Scene'}
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
                            {(isAuthor || role === 'owner') && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/5" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Delete</TooltipContent>
                                </Tooltip>
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
