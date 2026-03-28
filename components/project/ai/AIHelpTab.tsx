'use client'

import { Sparkles, Lightbulb, GitMerge, HelpCircle, MessageSquare, PenLine, Lock } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

const FUTURE_TOOLS = [
    { icon: Lightbulb, title: 'Concept Catalyst', description: 'AI-assisted brainstorming for plot turns and narrative directions.' },
    { icon: GitMerge, title: 'Scene Bridging', description: 'Expertly weaving the gaps between your creative beats.' },
    { icon: HelpCircle, title: 'Socratic Inquiry', description: 'Probing questions to deepen character motivations and plot integrity.' },
    { icon: MessageSquare, title: 'Dialogue Refiner', description: 'Polishing speech to capture authentic, resonant character voices.' },
    { icon: PenLine, title: 'Drafting Companion', description: 'Collaborative drafting to move from outline to immersion.' },
]

export default function AIHelpTab({ projectId }: { projectId: string }) {
    return (
        <TooltipProvider>
            <div className="min-h-full bg-[#fbf9f5] p-6 max-w-5xl mx-auto fade-in">
                <div className="bg-white rounded-[3rem] p-12 shadow-xl shadow-slate-200/40 ring-1 ring-slate-100 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-[#546354] rounded-3xl flex items-center justify-center mb-8 relative shadow-lg shadow-[#546354]/20">
                        <Sparkles className="w-10 h-10 text-white" />
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-50">
                            <Lock className="w-3.5 h-3.5 text-stone-400" />
                        </div>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-serif italic text-slate-800 mb-4 tracking-tight">The AI Sanctuary</h2>
                    <p className="text-[11px] font-sans tracking-[0.2em] uppercase text-slate-300 mb-12">Narrative Intelligence</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left">
                        {FUTURE_TOOLS.map((tool, idx) => (
                            <div key={idx} className="p-6 rounded-2xl bg-stone-50/50 border border-transparent hover:border-slate-100 transition-all opacity-70 grayscale hover:grayscale-0 hover:opacity-100 duration-700">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                        <tool.icon className="w-5 h-5 text-stone-400" />
                                    </div>
                                    <h3 className="font-serif italic text-lg text-slate-700">{tool.title}</h3>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed font-sans">{tool.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 space-y-4">
                        <p className="text-slate-400 text-sm italic">"The best AI is a mirror to your own creativity, not a replacement for it."</p>
                        <div className="px-8 py-3 rounded-full bg-stone-50 border border-stone-100 inline-block">
                            <span className="text-[10px] font-sans tracking-[0.3em] uppercase text-stone-400">Arriving in Phase 2</span>
                        </div>
                    </div>
                </div>

                <p className="mt-10 text-center text-slate-300 text-[10px] uppercase tracking-[0.3em] font-medium">Focused on Storytelling in Phase 1</p>
            </div>
        </TooltipProvider>
    )
}
