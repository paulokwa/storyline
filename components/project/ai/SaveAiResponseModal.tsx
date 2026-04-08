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
import { Bookmark, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
        const supabase = createClient()

        try {
            const { error: saveError } = await (supabase
                .from('ai_responses') as any)
                .insert({
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
            <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-8 border-none shadow-2xl bg-white overflow-hidden">
                <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-indigo-50 rounded-xl">
                                    <Bookmark className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div className="space-y-0.5">
                                    <DialogTitle className="text-2xl font-serif text-slate-800 text-left">Save Response</DialogTitle>
                                    <DialogDescription className="text-slate-500 font-medium text-left">
                                        Archive this AI output for later reference.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className="space-y-6 py-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-sm font-semibold text-slate-700 ml-1 flex justify-between">
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
                                    className="rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all h-12 text-slate-800 font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type" className="text-sm font-semibold text-slate-700 ml-1">Archive Category</Label>
                                <div className="relative">
                                    <select 
                                        id="type"
                                        value={type} 
                                        onChange={(e) => setType(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all h-12 px-4 appearance-none text-sm font-medium text-slate-700"
                                    >
                                        {RESPONSE_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                    </div>
                                </div>
                            </div>

                            {(sourceLabel || model) && (
                                <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100/50">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Provenance Metadata</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        {sourceLabel && (
                                            <div>
                                                <p className="text-[10px] text-slate-400 italic">Source</p>
                                                <p className="text-xs text-slate-600 font-medium truncate">{sourceLabel}</p>
                                            </div>
                                        )}
                                        {model && (
                                            <div>
                                                <p className="text-[10px] text-slate-400 italic">Model</p>
                                                <p className="text-xs text-slate-600 font-medium truncate">{model}</p>
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
                                className="flex-1 rounded-full h-11 border-slate-200 text-slate-500 hover:bg-slate-50 font-medium"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || (!title.trim() && !autoTitle)}
                                className="flex-[1.5] rounded-full h-11 transition-all active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-100"
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
