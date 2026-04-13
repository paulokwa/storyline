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
import { AlertCircle, Maximize2, Send, Database, Package } from 'lucide-react'

interface AiSafeguardDialogsProps {
    preflight: ContextSizingResult | null
    isConfirmingCost: boolean
    setIsConfirmingCost: (val: boolean) => void
    isExtremeContext: boolean
    setIsExtremeContext: (val: boolean) => void
    onConfirm: () => void
    onCancel: () => void
    provider: string
}

export function AiSafeguardDialogs({ 
    preflight, 
    isConfirmingCost, 
    setIsConfirmingCost, 
    isExtremeContext, 
    setIsExtremeContext, 
    onConfirm, 
    onCancel,
    provider
}: AiSafeguardDialogsProps) {
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
        </>
    )
}
