'use client'

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Command, Type, Clapperboard, User, MessageCircle, ArrowRight, MousePointer2, Sparkles, MessageSquare, Zap, Mic } from 'lucide-react'

interface ShortcutGroupProps {
    title: string
    shortcuts: { keys: string[]; label: string; icon?: any }[]
}

const ShortcutGroup = ({ title, shortcuts }: ShortcutGroupProps) => (
    <div className="space-y-4">
        <h3 className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 px-1 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Zap className="w-3 h-3 text-amber-400" />
            {title}
        </h3>
        <div className="grid gap-1">
            {shortcuts.map((s, i) => (
                <div key={i} className="flex items-center justify-between group p-1.5 hover:bg-slate-50 rounded-xl transition-all duration-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center group-hover:border-primary/20 group-hover:bg-primary/5 transition-all flex-shrink-0">
                            {s.icon && <s.icon className="w-3 h-3 text-slate-400 group-hover:text-primary transition-colors" />}
                        </div>
                        <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors truncate">{s.label}</span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-4">
                        {s.keys.map((k, ki) => (
                            <kbd key={ki} className="min-w-[20px] h-5 px-1 flex items-center justify-center bg-white border border-slate-200 border-b-[2px] rounded-md text-[9px] font-black text-slate-500 shadow-sm font-sans">
                                {k}
                            </kbd>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
)

export function ShortcutsLegend({ 
    open, 
    onOpenChange,
    onStartTour
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void;
    onStartTour?: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl sm:max-w-3xl w-[95vw] md:w-[90vw] bg-white/98 backdrop-blur-xl border-slate-200 rounded-[2.5rem] shadow-2xl p-0 overflow-hidden font-sans border-none outline-none">
                <div className="overflow-y-auto overflow-x-hidden max-h-[min(90vh,800px)] custom-scrollbar">
                    <div className="bg-primary/5 p-5 sm:p-8 pb-10 sm:pb-12">
                        <DialogHeader>
                            <DialogTitle className="text-xl sm:text-2xl font-serif italic font-bold text-slate-900 flex items-center gap-3">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white shadow-xl shadow-primary/5 flex items-center justify-center text-primary">
                                    <Command className="w-5 h-5" />
                                </div>
                                The Command Ledger
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 font-medium text-[13px] sm:text-sm mt-1.5 sm:mt-2">
                                Master the rhythm of your story with advanced keyboard control.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-5 sm:p-8 pr-8 sm:pr-10 -mt-6 bg-white rounded-t-[2rem] sm:rounded-t-[3rem] shadow-[0_-20px_40px_rgba(0,0,0,0.02)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 sm:gap-y-10">
                            <div className="space-y-8 sm:space-y-10">
                                <ShortcutGroup 
                                    title="Screenplay Flow" 
                                    shortcuts={[
                                        { keys: ['Tab'], label: 'Cycle Next Element', icon: ArrowRight },
                                        { keys: ['Shift', 'Tab'], label: 'Cycle Previous Element', icon: ArrowRight },
                                        { keys: ['Enter'], label: 'Smart New Line', icon: Type },
                                        { keys: ['INT.'], label: 'Quick Scene Heading', icon: Clapperboard },
                                        { keys: ['( '], label: 'Quick Parenthetical', icon: Type },
                                    ]} 
                                />
                                <ShortcutGroup 
                                    title="App Commands" 
                                    shortcuts={[
                                        { keys: ['?'], label: 'Toggle this Ledger', icon: HelpCircle },
                                        { keys: ['Esc'], label: 'Close Panels / Modals', icon: MousePointer2 },
                                    ]} 
                                />
                            </div>
                            
                            <div className="space-y-8 sm:space-y-10">
                                <ShortcutGroup 
                                    title="Rich Text" 
                                    shortcuts={[
                                        { keys: ['⌘', 'B'], label: 'Bold Selection', icon: Type },
                                        { keys: ['⌘', 'I'], label: 'Italic Selection', icon: Type },
                                        { keys: ['⌘', 'U'], label: 'Underline Selection', icon: Type },
                                        { keys: ['⌘', 'Shift', 'C'], label: 'Add Feedback', icon: MessageSquare },
                                    ]} 
                                />
                                <ShortcutGroup 
                                    title="Direct Mapping" 
                                    shortcuts={[
                                        { keys: ['⌘', '1'], label: 'Scene Heading', icon: Clapperboard },
                                        { keys: ['⌘', '2'], label: 'Character', icon: User },
                                        { keys: ['⌘', '3'], label: 'Dialogue', icon: MessageCircle },
                                        { keys: ['⌘', '4'], label: 'Action', icon: Type },
                                    ]} 
                                />
                            </div>
                        </div>

                        <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse delay-75" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse delay-150" />
                                </div>
                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                    Contextual awareness active
                                </span>
                            </div>
                             <div className="flex items-center gap-6">
                                 {onStartTour && (
                                     <button 
                                         onClick={onStartTour}
                                         className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-[#3d4a3d] transition-all bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl"
                                     >
                                         <Zap className="w-3 h-3" />
                                         Take the tour
                                     </button>
                                 )}
                                 <div className="flex items-center gap-2 text-primary/60 font-serif italic text-xs sm:text-sm">
                                     <Sparkles className="w-3.5 h-3.5" />
                                     <span>Write with flow</span>
                                 </div>
                                <div className="h-4 w-px bg-slate-200" />
                                <span className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.2em]">Storyline v1.8</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

import { HelpCircle } from 'lucide-react'
