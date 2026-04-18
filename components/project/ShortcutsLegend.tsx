'use client'

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Command, Type, Clapperboard, User, MessageCircle, ArrowRight, MousePointer2, Sparkles, MessageSquare, Zap, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/providers/ThemeProvider'

interface ShortcutGroupProps {
    title: string
    shortcuts: { keys: string[]; label: string; icon?: any }[]
    isMidnight?: boolean
}

const ShortcutGroup = ({ title, shortcuts, isMidnight = false }: ShortcutGroupProps) => (
    <div className="space-y-4">
        <h3 className={cn(
            "flex items-center gap-2 border-b px-1 pb-2 text-[10px] font-black uppercase tracking-[0.2em]",
            isMidnight ? "border-slate-700/70 text-slate-400" : "border-slate-100 text-slate-400"
        )}>
            <Zap className="h-3 w-3 text-amber-400" />
            {title}
        </h3>
        <div className="grid gap-1">
            {shortcuts.map((s, i) => (
                <div
                    key={i}
                    className={cn(
                        "group flex items-center justify-between rounded-xl p-1.5 transition-all duration-200",
                        isMidnight ? "hover:bg-slate-800/70" : "hover:bg-slate-50"
                    )}
                >
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className={cn(
                            "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border shadow-sm transition-all",
                            isMidnight
                                ? "border-slate-700/70 bg-slate-900 group-hover:border-primary/25 group-hover:bg-primary/10"
                                : "border-slate-100 bg-white group-hover:border-primary/20 group-hover:bg-primary/5"
                        )}>
                            {s.icon && (
                                <s.icon className={cn(
                                    "h-3 w-3 transition-colors",
                                    isMidnight ? "text-slate-500 group-hover:text-slate-200" : "text-slate-400 group-hover:text-primary"
                                )} />
                            )}
                        </div>
                        <span className={cn(
                            "truncate text-xs font-medium transition-colors",
                            isMidnight ? "text-slate-300 group-hover:text-slate-100" : "text-slate-600 group-hover:text-slate-900"
                        )}>
                            {s.label}
                        </span>
                    </div>
                    <div className="ml-4 flex flex-shrink-0 gap-1">
                        {s.keys.map((k, ki) => (
                            <kbd
                                key={ki}
                                className={cn(
                                    "flex h-5 min-w-[20px] items-center justify-center rounded-md border-b-[2px] px-1 font-sans text-[9px] font-black shadow-sm",
                                    isMidnight ? "border-slate-700 bg-slate-900 text-slate-300" : "border-slate-200 bg-white text-slate-500"
                                )}
                            >
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
    onStartTour,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onStartTour?: () => void
}) {
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "max-w-3xl sm:max-w-3xl w-[95vw] md:w-[90vw] rounded-[2.5rem] p-0 font-sans outline-none overflow-hidden border-none backdrop-blur-xl shadow-2xl",
                isMidnight
                    ? "bg-[rgba(10,17,32,0.96)] text-slate-100 shadow-[0_30px_90px_rgba(2,6,23,0.55)]"
                    : "bg-white/98 border-slate-200"
            )}>
                <div className="custom-scrollbar max-h-[min(90vh,800px)] overflow-x-hidden overflow-y-auto">
                    <div className={cn(
                        "p-5 pb-10 sm:p-8 sm:pb-12",
                        isMidnight
                            ? "bg-[linear-gradient(180deg,rgba(18,30,54,0.95)_0%,rgba(14,23,41,0.95)_100%)]"
                            : "bg-primary/5"
                    )}>
                        <DialogHeader>
                            <DialogTitle className={cn(
                                "flex items-center gap-3 text-xl font-serif font-bold italic sm:text-2xl",
                                isMidnight ? "text-slate-50" : "text-slate-900"
                            )}>
                                <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-xl shadow-xl sm:h-11 sm:w-11 sm:rounded-2xl",
                                    isMidnight ? "bg-slate-900 text-slate-100 shadow-black/30" : "bg-white text-primary shadow-primary/5"
                                )}>
                                    <Command className="h-5 w-5" />
                                </div>
                                The Command Ledger
                            </DialogTitle>
                            <DialogDescription className={cn(
                                "mt-1.5 text-[13px] font-medium sm:mt-2 sm:text-sm",
                                isMidnight ? "text-slate-400" : "text-slate-500"
                            )}>
                                Master the rhythm of your story with advanced keyboard control.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className={cn(
                        "-mt-6 rounded-t-[2rem] p-5 pr-8 sm:rounded-t-[3rem] sm:p-8 sm:pr-10",
                        isMidnight
                            ? "bg-[linear-gradient(180deg,rgba(10,17,32,0.98)_0%,rgba(12,20,36,0.98)_100%)] shadow-[0_-20px_40px_rgba(2,6,23,0.22)]"
                            : "bg-white shadow-[0_-20px_40px_rgba(0,0,0,0.02)]"
                    )}>
                        <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2 sm:gap-y-10">
                            <div className="space-y-8 sm:space-y-10">
                                <ShortcutGroup
                                    title="Screenplay Flow"
                                    isMidnight={isMidnight}
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
                                    isMidnight={isMidnight}
                                    shortcuts={[
                                        { keys: ['?'], label: 'Toggle this Ledger', icon: HelpCircle },
                                        { keys: ['Esc'], label: 'Close Panels / Modals', icon: MousePointer2 },
                                    ]}
                                />
                            </div>

                            <div className="space-y-8 sm:space-y-10">
                                <ShortcutGroup
                                    title="Rich Text"
                                    isMidnight={isMidnight}
                                    shortcuts={[
                                        { keys: ['⌘', 'B'], label: 'Bold Selection', icon: Type },
                                        { keys: ['⌘', 'I'], label: 'Italic Selection', icon: Type },
                                        { keys: ['⌘', 'U'], label: 'Underline Selection', icon: Type },
                                        { keys: ['⌘', 'Shift', 'C'], label: 'Add Feedback', icon: MessageSquare },
                                    ]}
                                />
                                <ShortcutGroup
                                    title="Direct Mapping"
                                    isMidnight={isMidnight}
                                    shortcuts={[
                                        { keys: ['⌘', '1'], label: 'Scene Heading', icon: Clapperboard },
                                        { keys: ['⌘', '2'], label: 'Character', icon: User },
                                        { keys: ['⌘', '3'], label: 'Dialogue', icon: MessageCircle },
                                        { keys: ['⌘', '4'], label: 'Action', icon: Type },
                                    ]}
                                />
                            </div>
                        </div>

                        <div className={cn(
                            "mt-10 flex flex-col items-center justify-between gap-4 pt-6 sm:mt-12 sm:flex-row sm:pt-8",
                            isMidnight ? "border-t border-slate-800" : "border-t border-slate-100"
                        )}>
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-1">
                                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                                    <div className="delay-75 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                                    <div className="delay-150 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-200" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    Contextual awareness active
                                </span>
                            </div>
                            <div className="flex items-center gap-6">
                                {onStartTour && (
                                    <button
                                        onClick={onStartTour}
                                        className={cn(
                                            "flex items-center gap-2 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                            isMidnight
                                                ? "bg-slate-800/80 text-slate-200 hover:bg-slate-700/90 hover:text-white"
                                                : "bg-primary/5 text-primary hover:bg-primary/10 hover:text-[#3d4a3d]"
                                        )}
                                    >
                                        <Zap className="h-3 w-3" />
                                        Take the tour
                                    </button>
                                )}
                                <div className={cn(
                                    "flex items-center gap-2 font-serif text-xs italic sm:text-sm",
                                    isMidnight ? "text-slate-400" : "text-primary/60"
                                )}>
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>Write with flow</span>
                                </div>
                                <div className={cn("h-4 w-px", isMidnight ? "bg-slate-700" : "bg-slate-200")} />
                                <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-[0.2em]",
                                    isMidnight ? "text-slate-500" : "text-slate-300"
                                )}>
                                    Storyline v1.8
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
