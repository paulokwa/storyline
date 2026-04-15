'use client'

import React from 'react'
import { ContextSizingResult } from '@/lib/ai/config'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { AlertCircle, Maximize2, Send, Database, Package, Sparkles } from 'lucide-react'
import { estimateTokensApprox } from '@/lib/ai/config'

function extractTextFromJson(content: any): string {
    if (typeof content === 'string') return content
    if (!content) return ''
    if (content.content && Array.isArray(content.content)) {
        return content.content.map((c: any) => extractTextFromJson(c)).join('\n')
    }
    if (content.type === 'text') return content.text || ''
    if (Array.isArray(content)) {
        return content.map((c: any) => extractTextFromJson(c)).join(' ')
    }
    return ''
}

interface AiSafeguardDialogsProps {
    preflight: ContextSizingResult | null
    isConfirmingCost: boolean
    setIsConfirmingCost: (val: boolean) => void
    isExtremeContext: boolean
    setIsExtremeContext: (val: boolean) => void
    onConfirm: () => void
    onCancel: () => void
    provider: string
    isOverridingProjectContext?: boolean
    setIsOverridingProjectContext?: (val: boolean) => void
    projectContextMode?: 'default' | 'expanded' | 'full'
    setProjectContextMode?: (val: 'default' | 'expanded' | 'full') => void
    allScenes?: any[]
}

export function AiSafeguardDialogs({ 
    preflight, 
    isConfirmingCost, 
    setIsConfirmingCost, 
    isExtremeContext, 
    setIsExtremeContext, 
    onConfirm, 
    onCancel,
    provider,
    isOverridingProjectContext,
    setIsOverridingProjectContext,
    projectContextMode,
    setProjectContextMode,
    allScenes
}: AiSafeguardDialogsProps) {
    const fullStats = React.useMemo(() => {
        if (!allScenes) return { chars: 0, words: 0, tokens: 0 }
        const text = allScenes.map(s => extractTextFromJson(s.content)).join(' ')
        const chars = text.length
        return {
            chars,
            words: Math.floor(chars / 6), // average word length
            tokens: estimateTokensApprox(text)
        }
    }, [allScenes])

    if (!preflight) return null

    return (
        <>
            {/* Cost Confirmation Dialog */}
            <Dialog open={isConfirmingCost} onOpenChange={setIsConfirmingCost}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-indigo-500" />
                            Confirm AI Request Cost
                        </DialogTitle>
                        <DialogDescription className="font-serif italic text-slate-500">
                            This request uses a large amount of context and may incur significant costs on your paid AI plan.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Characters</p>
                                <p className="text-sm font-bold text-slate-700">{preflight.charCount.toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Est. Tokens</p>
                                <p className="text-sm font-bold text-slate-700">{preflight.estimatedTokens.toLocaleString()}</p>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-indigo-400 font-bold mb-1">Estimated Input Cost</p>
                                <p className="text-xl font-bold text-indigo-600">
                                    {preflight.estimatedCost !== null ? `$${preflight.estimatedCost.toFixed(3)}` : "Unavailable"}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <Package className="w-5 h-5 text-indigo-400" />
                            </div>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 leading-relaxed italic text-center px-4">
                            {preflight.estimatedCost !== null 
                                ? `Rates are based on current ${provider} pricing for the selected model.`
                                : `Specific pricing for this model variant is unknown. Standard rates may apply.`
                            }
                        </p>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={onCancel} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2"
                            onClick={onConfirm}
                        >
                            Confirm & Send
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Extreme Context Dialog */}
            <Dialog open={isExtremeContext} onOpenChange={setIsExtremeContext}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Maximize2 className="w-5 h-5 text-amber-500" />
                            Extreme Context Size
                        </DialogTitle>
                        <DialogDescription className="font-serif italic text-slate-500">
                            The text you're sending is exceptionally large ({preflight.charCount.toLocaleString()} chars). How would you like to proceed?
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-2 space-y-3">
                        <button 
                            onClick={onConfirm}
                            className="w-full p-4 text-left bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <Send className="w-4 h-4 text-indigo-500" />
                                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600">Proceed with Full Context</span>
                            </div>
                            <p className="text-[10px] text-slate-400 italic pl-7">
                                Send everything to the AI. May be slow and expensive
                                {preflight.estimatedCost !== null ? ` (Est. $${preflight.estimatedCost.toFixed(2)}+)` : ""}.
                            </p>
                        </button>

                        <button 
                            onClick={() => {
                                // For now we still just confirm since chunking is a placeholder
                                onConfirm();
                            }}
                            className="w-full p-4 text-left bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group opacity-80"
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <Database className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-bold text-slate-700">Smart Chunking (Coming Soon)</span>
                            </div>
                            <p className="text-[10px] text-slate-400 italic pl-7">Will analyze sections relevant to your query to save costs. </p>
                        </button>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={onCancel} className="rounded-xl w-full">
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Entire Project Override Dialog */}
            <Dialog 
                open={isOverridingProjectContext || false} 
                onOpenChange={setIsOverridingProjectContext}
            >
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Maximize2 className="w-5 h-5 text-indigo-500" />
                            Use more project context?
                        </DialogTitle>
                        <DialogDescription className="font-serif italic text-slate-500">
                            Sending more of your project may improve project-wide analysis, but it can increase token usage, cost, and response time.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-2 space-y-3">
                        {/* Default Option */}
                        <button 
                            onClick={() => {
                                setProjectContextMode?.('default');
                                setIsOverridingProjectContext?.(false);
                            }}
                            className={`w-full p-4 text-left border rounded-2xl transition-all group ${
                                projectContextMode === 'default' 
                                    ? 'bg-white border-slate-300 shadow-sm' 
                                    : 'bg-white border-slate-100 hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                                    <span className="text-sm font-bold text-slate-700">Default (Balanced)</span>
                                </div>
                                {projectContextMode === 'default' && <span className="text-[9px] font-black uppercase text-slate-400">Current</span>}
                            </div>
                            <p className="text-[10px] text-slate-400 italic mb-2">Loads the first 10 scenes. Fastest and most cost-efficient.</p>
                            <div className="flex gap-3">
                                <span className="text-[9px] text-slate-400 border border-slate-100 rounded-md px-1.5 py-0.5">10 SCENES</span>
                                <span className="text-[9px] text-emerald-500 font-bold uppercase">Impact: Low</span>
                            </div>
                        </button>

                        {/* Expanded Option */}
                        <button 
                            onClick={() => {
                                setProjectContextMode?.('expanded');
                                setIsOverridingProjectContext?.(false);
                            }}
                            className={`w-full p-4 text-left border rounded-2xl transition-all group ${
                                projectContextMode === 'expanded' 
                                    ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                                    : 'bg-white border-slate-100 hover:border-indigo-200'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                                    <span className="text-sm font-bold text-slate-700">Expanded Context</span>
                                </div>
                                {projectContextMode === 'expanded' && <span className="text-[9px] font-black uppercase text-indigo-400">Current</span>}
                            </div>
                            <p className="text-[10px] text-slate-400 italic mb-2">Loads up to 50 scenes. Better for thematic analysis or world-building.</p>
                            <div className="flex gap-3">
                                <span className="text-[9px] text-slate-400 border border-slate-100 rounded-md px-1.5 py-0.5">UP TO 50 SCENES</span>
                                <span className="text-[9px] text-indigo-500 font-bold uppercase">Impact: Medium</span>
                            </div>
                        </button>

                        {/* Full Project Option */}
                        <button 
                            onClick={() => {
                                setProjectContextMode?.('full');
                                setIsOverridingProjectContext?.(false);
                            }}
                            className={`w-full p-4 text-left border rounded-2xl transition-all group ${
                                projectContextMode === 'full' 
                                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-md' 
                                    : 'bg-white border-slate-100 hover:border-indigo-500'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-2 h-2 rounded-full ${projectContextMode === 'full' ? 'bg-white' : 'bg-indigo-600'}`} />
                                    <span className={`text-sm font-bold ${projectContextMode === 'full' ? 'text-white' : 'text-slate-700'}`}>Full Project Manuscript</span>
                                </div>
                                {projectContextMode === 'full' && <span className="text-[9px] font-black uppercase text-indigo-200">Current</span>}
                            </div>
                            <p className={`text-[10px] italic mb-2 ${projectContextMode === 'full' ? 'text-indigo-100' : 'text-slate-400'}`}>Sends every scene in the project. Best for deep character arcs and plot consistency.</p>
                            <div className="flex gap-3">
                                <span className={`text-[9px] border rounded-md px-1.5 py-0.5 ${projectContextMode === 'full' ? 'border-white/20 text-white/80' : 'border-slate-100 text-slate-400'}`}>
                                    {allScenes?.length || 0} SCENES {fullStats.words > 0 && `(~${~~(fullStats.words/1000)}k words)`}
                                </span>
                                <span className={`text-[9px] font-bold uppercase ${projectContextMode === 'full' ? 'text-white' : 'text-indigo-600'}`}>
                                    Impact: {fullStats.chars > 150000 ? 'Extreme' : 'High'}
                                </span>
                            </div>
                        </button>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-2">
                        <p className="text-[10px] text-slate-500 leading-relaxed text-center">
                            For most requests, the <strong>Default</strong> context is faster and cheaper. Use expanded context only when you truly need project-wide analysis.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="ghost" 
                            onClick={() => {
                                setProjectContextMode?.('default');
                                setIsOverridingProjectContext?.(false);
                            }} 
                            className="rounded-xl w-full"
                        >
                            Reset to Default
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
