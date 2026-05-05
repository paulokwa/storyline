'use client'

import React, { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SanctuarySelect } from '@/components/ui/sanctuary-select'
import { Bookmark, Loader2, CheckCircle2 } from 'lucide-react'
import { saveAiResponse } from '@/lib/persistence/ai-feedback'
import { useTheme } from '@/components/providers/ThemeProvider'
import { cn } from '@/lib/utils'

interface SaveAiResponseModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    projectId: string
    prompt: string
    response: string
    sourceSceneId?: string
    sourceNodeId?: string
    sourceLabel?: string
    model?: string
    action?: string
    linkedEntities?: any
    contextSnapshot?: string
}

const RESPONSE_TYPES = [
    { value: 'analysis', label: 'Analysis' },
    { value: 'rewrite', label: 'Rewrite' },
    { value: 'brainstorm', label: 'Brainstorm' },
    { value: 'continuation', label: 'Continuation' },
    { value: 'custom', label: 'Custom' },
]

export default function SaveAiResponseModal({
    open,
    onOpenChange,
    projectId,
    prompt,
    response,
    sourceSceneId,
    sourceNodeId,
    sourceLabel,
    model,
    action,
    linkedEntities = {},
    contextSnapshot,
    onSuccess,
}: SaveAiResponseModalProps) {
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const [title, setTitle] = useState('')
    const [autoTitle, setAutoTitle] = useState('')
    const [type, setType] = useState('custom')
    const [isSaving, setIsSaving] = useState(false)
    const [isSaved, setIsSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Auto-title generation logic
    useEffect(() => {
        if (open && !title) {
            let generatedTitle = ''
            
            // 1. derive from prompt/question if strong and concise
            if (prompt && prompt.length > 5 && prompt.length < 50) {
                generatedTitle = prompt.charAt(0).toUpperCase() + prompt.slice(1)
            } 
            // 2. else derive from the response first meaningful sentence
            else if (response) {
                const firstLine = response.split('\n')[0].trim()
                const sentences = firstLine.split(/[.!?]/)
                if (sentences[0] && sentences[0].length > 5) {
                    let firstSentence = sentences[0].trim()
                    if (firstSentence.length > 50) {
                        firstSentence = firstSentence.substring(0, 47) + '...'
                    }
                    generatedTitle = firstSentence
                }
            }
            
            // 3. Fallbacks
            if (!generatedTitle) {
                if (sourceLabel) {
                    generatedTitle = `Response for ${sourceLabel}`
                } else {
                    generatedTitle = 'Saved Response'
                }
            }

            setAutoTitle(generatedTitle)
            setTitle(generatedTitle)
            
            // Intelligent type defaulting
            if (action?.includes('review') || action?.includes('analyze')) setType('analysis')
            else if (action?.includes('brainstorm') || action?.includes('suggest')) setType('brainstorm')
            else if (action?.includes('continue')) setType('continuation')
            else if (action?.includes('rewrite') || action?.includes('improve') || action?.includes('conflict')) setType('rewrite')
            else setType('custom')
        }
    }, [open, prompt, response, sourceLabel, action])

    const handleSave = async () => {
        if (!title.trim() && !autoTitle) return
        
        setIsSaving(true)
        setError(null)
        try {
            const { error: saveError } = await saveAiResponse({
                project_id: projectId,
                title: (title || autoTitle).trim(),
                auto_title: autoTitle,
                prompt: prompt || 'N/A',
                response: response,
                type,
                source_scene_id: sourceSceneId || null,
                source_node_id: sourceNodeId || null,
                source_label: sourceLabel,
                model,
                action,
                linked_entities: linkedEntities,
                context_snapshot: contextSnapshot,
            })

            if (saveError) throw saveError

            onOpenChange(false)
            onSuccess?.()
            setTitle('') // Reset for next time
        } catch (err: any) {
            console.error('Save error:', err)
            setError(err.message || 'Failed to save response')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "sm:max-w-[500px] rounded-[2rem] p-8 border-none shadow-2xl overflow-hidden",
                isMidnight ? "bg-slate-800" : "bg-white"
            )}>
                <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={cn("p-2 rounded-xl", isMidnight ? "bg-indigo-500/20" : "bg-indigo-50")}>
                                    <Bookmark className={cn("w-5 h-5", isMidnight ? "text-indigo-400" : "text-indigo-500")} />
                                </div>
                                <div className="space-y-0.5">
                                    <DialogTitle className={cn("text-2xl font-serif text-left", isMidnight ? "text-slate-100" : "text-slate-800")}>Save Response</DialogTitle>
                                    <DialogDescription className={cn("font-medium text-left", isMidnight ? "text-slate-400" : "text-slate-500")}>
                                        Archive this AI output for later reference.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6 py-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className={cn("text-sm font-semibold ml-1 flex justify-between", isMidnight ? "text-slate-300" : "text-slate-700")}>
                                    <span>Response Title</span>
                                    {autoTitle && title !== autoTitle && (
                                        <button 
                                            onClick={() => setTitle(autoTitle)}
                                            className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold uppercase tracking-wider"
                                        >
                                            Reset to Auto
                                        </button>
                                    )}
                                </Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={autoTitle || "Enter a title..."}
                                    className={cn(
                                        "rounded-2xl transition-all h-12 font-medium",
                                        isMidnight
                                            ? "border-slate-600/40 bg-slate-700/60 focus:bg-slate-700 text-slate-200 placeholder:text-slate-500"
                                            : "border-slate-100 bg-slate-50 focus:bg-white text-slate-800"
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type" className={cn("text-sm font-semibold ml-1", isMidnight ? "text-slate-300" : "text-slate-700")}>Archive Category</Label>
                                <SanctuarySelect
                                    id="type"
                                    value={type}
                                    onValueChange={setType}
                                    options={RESPONSE_TYPES}
                                    triggerClassName={cn(
                                        "text-sm font-medium",
                                        isMidnight
                                            ? "border-slate-600/40 bg-slate-700/60 text-slate-200 focus-visible:ring-slate-500/30"
                                            : "border-slate-100 bg-slate-50 text-slate-700 focus-visible:ring-indigo-100"
                                    )}
                                />
                            </div>

                            {(sourceLabel || model) && (
                                <div className={cn(
                                    "p-4 rounded-2xl space-y-2 border",
                                    isMidnight ? "bg-slate-700/40 border-slate-600/30" : "bg-slate-50 border-slate-100/50"
                                )}>
                                    <p className={cn("text-[10px] font-bold uppercase tracking-[0.1em]", isMidnight ? "text-slate-500" : "text-slate-400")}>Provenance Metadata</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        {sourceLabel && (
                                            <div>
                                                <p className={cn("text-[10px] italic", isMidnight ? "text-slate-500" : "text-slate-400")}>Source</p>
                                                <p className={cn("text-xs font-medium truncate", isMidnight ? "text-slate-300" : "text-slate-600")}>{sourceLabel}</p>
                                            </div>
                                        )}
                                        {model && (
                                            <div>
                                                <p className={cn("text-[10px] italic", isMidnight ? "text-slate-500" : "text-slate-400")}>Model</p>
                                                <p className={cn("text-xs font-medium truncate", isMidnight ? "text-slate-300" : "text-slate-600")}>{model}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <p className="text-xs text-red-500 font-medium px-1">
                                    {error}
                                </p>
                            )}
                        </div>

                        <DialogFooter className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSaving}
                                className={cn(
                                    "flex-1 rounded-full h-11 font-medium",
                                    isMidnight
                                        ? "border-slate-600 text-slate-400 hover:bg-slate-700/60"
                                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || (!title.trim() && !autoTitle)}
                                className={cn(
                                    "flex-[1.5] rounded-full h-11 transition-all active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold",
                                    isMidnight ? "shadow-lg shadow-indigo-900/30" : "shadow-lg shadow-indigo-100"
                                )}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Response'
                                )}
                            </Button>
                        </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
