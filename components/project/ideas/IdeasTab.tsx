'use client'

import { Lightbulb, Lock } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export default function IdeasTab({
    projectId,
}: {
    projectId: string
}) {
    return (
        <TooltipProvider>
            <div className="min-h-full bg-[#fbf9f5] flex flex-col items-center justify-center p-6 text-center fade-in">
                <div className="max-w-2xl w-full py-20 px-10 rounded-[3rem] bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 flex flex-col items-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mb-8 relative">
                        <Lightbulb className="w-10 h-10 text-amber-300" />
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-50">
                            <Lock className="w-3.5 h-3.5 text-stone-400" />
                        </div>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-serif italic text-slate-800 mb-4 tracking-tight">The Ideas Board</h2>
                    <p className="text-[11px] font-sans tracking-[0.2em] uppercase text-slate-300 mb-8">Brainstorm & Fragments</p>

                    <div className="space-y-6 max-w-md">
                        <p className="text-slate-500 font-medium leading-relaxed italic">
                            "Every story is first a collection of sparks, waiting to be woven together."
                        </p>
                        <div className="h-px w-12 bg-stone-100 mx-auto" />
                        <p className="text-slate-400 text-sm leading-relaxed">
                            The collective idea dashboard is currently being prepared for Phase 2. Soon, this board will allow you to capture fragments, notes, and visual inspirations as a foundation for your creative work.
                        </p>
                    </div>

                    <div className="mt-12 flex gap-4">
                        <div className="px-6 py-2 rounded-full border border-stone-100 text-[10px] font-sans tracking-widest uppercase text-stone-300">Phase 1: Story Focus</div>
                    </div>
                </div>

                <p className="mt-10 text-slate-300 text-[10px] uppercase tracking-[0.3em] font-medium">Coming Soon to your Narrative Archive</p>
            </div>
        </TooltipProvider>
    )
}
