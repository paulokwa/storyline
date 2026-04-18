'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Volume2, Play, Pause, Square, VolumeX, MoreHorizontal, Settings2, User, Book } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSpeech } from '@/hooks/useSpeech'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useTheme } from '@/components/providers/ThemeProvider'


export function ReaderControls({
    getSelection,
    getScene,
    getChapter,
    mode = 'full',
    align = 'right',
    side = 'bottom'
}: {
    getSelection: () => string,
    getScene: () => string,
    getChapter: () => string,
    mode?: 'full' | 'settings-only' | 'icon-only',
    align?: 'left' | 'right',
    side?: 'top' | 'bottom'
}) {
    const { supported, speechState, pause, resume, stop, voices, selectedVoice, setVoice, rate, changeRate, speak } = useSpeech()
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const [open, setOpen] = useState(false)
    const [hasSelection, setHasSelection] = useState(false)
    const [hasChapter, setHasChapter] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const dropdownAlign = align === 'left' ? 'start' : 'end'

    const refreshAvailableContent = React.useCallback(() => {
        setHasSelection(getSelection().trim().length > 0)
        setHasChapter(getChapter().trim().length > 0)
    }, [getSelection, getChapter])

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open])

    useEffect(() => {
        refreshAvailableContent()

        const syncAvailability = () => refreshAvailableContent()
        document.addEventListener('selectionchange', syncAvailability)
        window.addEventListener('mouseup', syncAvailability)
        window.addEventListener('keyup', syncAvailability)

        return () => {
            document.removeEventListener('selectionchange', syncAvailability)
            window.removeEventListener('mouseup', syncAvailability)
            window.removeEventListener('keyup', syncAvailability)
        }
    }, [refreshAvailableContent])

    if (!supported) {
        if (mode === 'settings-only') return null
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" disabled className="text-slate-300 gap-2 px-3 h-8 rounded-full">
                        <VolumeX className="w-4 h-4" />
                        <span className="hidden xs:inline">Read Aloud</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Text-to-speech not supported</TooltipContent>
            </Tooltip>
        )
    }

    const handleQuickRead = () => {
        const selection = getSelection()
        if (selection.trim().length > 0) {
            speak(selection, 'Selection')
        } else {
            speak(getScene(), 'Scene')
        }
    }

    return (
        <div className={cn("relative flex items-center", mode === 'full' && "gap-2")}>
            {mode === 'full' ? (
                <>
                    <div className={cn(
                        "reader-controls-shell flex items-center rounded-full p-0.5 transition-all shadow-sm border",
                        isMidnight
                            ? "bg-slate-900/70 hover:bg-slate-800/85 border-slate-700/60"
                            : "bg-white/40 hover:bg-white/60 border-slate-200/50"
                    )}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleQuickRead}
                            className={cn(
                                "h-7 px-3 gap-2 rounded-full transition-all font-serif italic",
                                speechState !== 'idle' ? "text-indigo-600" : "text-slate-500 hover:text-indigo-600"
                            )}
                        >
                            <Volume2 className={cn("w-3.5 h-3.5", speechState === 'speaking' && "animate-pulse")} />
                            <span className="hidden lg:inline text-xs">Read Aloud</span>
                        </Button>

                        <div className="w-px h-4 bg-slate-200 mx-0.5" />

                        <DropdownMenu open={open} onOpenChange={setOpen}>
                            <DropdownMenuTrigger
                                onClick={() => {
                                    refreshAvailableContent()
                                }}
                                className={cn(
                                    "inline-flex h-7 w-7 items-center justify-center rounded-full p-0 transition-all outline-none",
                                    open ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                                align={dropdownAlign} 
                                side={side} 
                                sideOffset={8}
                                className={cn(
                                    "reader-controls-menu w-64 rounded-2xl p-0 overflow-hidden z-[110] border",
                                    isMidnight
                                        ? "bg-[#182239]/96 border-slate-700/60 shadow-[0_18px_48px_rgba(2,6,23,0.3)]"
                                        : "bg-white border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                                )}
                            >
                                <MenuContent />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </>
            ) : (
                <DropdownMenu open={open} onOpenChange={setOpen}>
                    <DropdownMenuTrigger
                        onClick={() => {
                            refreshAvailableContent()
                        }}
                        className={cn(
                            mode === 'settings-only' ? "h-8 w-8 rounded-xl" : "h-9 w-9 rounded-xl",
                            "inline-flex items-center justify-center p-0 transition-all outline-none",
                            open 
                                ? (mode === 'settings-only' ? "bg-indigo-50 text-indigo-600 shadow-sm" : "bg-indigo-50 text-slate-700 shadow-sm")
                                : (mode === 'settings-only' ? "text-slate-400 hover:text-slate-600 hover:bg-slate-50" : "bg-black/5 text-slate-500 hover:bg-black/10")
                        )}
                    >
                        {mode === 'settings-only' ? (
                            <Settings2 className="w-4 h-4" />
                        ) : (
                            <Volume2 className={cn("w-4 h-4", speechState === 'speaking' && "animate-bounce")} />
                        )}
                    </DropdownMenuTrigger>
                    
                    <DropdownMenuContent 
                        align={dropdownAlign} 
                        side={side} 
                        sideOffset={8}
                        className={cn(
                            "reader-controls-menu w-64 rounded-2xl p-0 overflow-hidden z-[110] border",
                            isMidnight
                                ? "bg-[#182239]/96 border-slate-700/60 shadow-[0_18px_48px_rgba(2,6,23,0.3)]"
                                : "bg-white border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                        )}
                    >
                        <MenuContent />
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    )

    function MenuContent() {
        return (
            <>
                <div className="p-2 space-y-1">
                    <button 
                        disabled={!hasSelection}
                        onClick={() => { speak(getSelection(), 'Selection'); setOpen(false) }}
                        className={cn(
                            "w-full text-left px-3 py-2 text-sm font-medium rounded-xl disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center justify-between",
                            isMidnight ? "text-slate-100 hover:bg-slate-800/80" : "text-slate-700 hover:bg-slate-50"
                        )}
                    >
                        <span className="flex items-center gap-2"><User className="w-3.5 h-3.5 opacity-50" /> Read Selection</span>
                        {hasSelection && <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Active</span>}
                    </button>
                    <button 
                        onClick={() => { speak(getScene(), 'Scene'); setOpen(false) }}
                        className={cn(
                            "w-full text-left px-3 py-2 text-sm font-medium rounded-xl transition-colors flex items-center justify-between",
                            isMidnight ? "text-slate-100 hover:bg-slate-800/80" : "text-slate-700 hover:bg-slate-50"
                        )}
                    >
                        <span className="flex items-center gap-2"><Volume2 className="w-3.5 h-3.5 opacity-50" /> Read Scene</span>
                        {!hasSelection && <span className={cn("text-[10px] font-bold uppercase tracking-wider", isMidnight ? "text-slate-500" : "text-slate-400")}>Default</span>}
                    </button>
                    <button 
                        disabled={!hasChapter}
                        onClick={() => { speak(getChapter(), 'Chapter'); setOpen(false) }}
                        className={cn(
                            "w-full text-left px-3 py-2 text-sm font-medium rounded-xl disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center gap-2",
                            isMidnight ? "text-slate-100 hover:bg-slate-800/80" : "text-slate-700 hover:bg-slate-50"
                        )}
                    >
                        <Book className="w-3.5 h-3.5 opacity-50" /> Read Chapter
                    </button>
                </div>

                <div className={cn(
                    "border-t p-3 space-y-4",
                    isMidnight ? "border-slate-700/60 bg-slate-900/40" : "border-slate-100 bg-slate-50/50"
                )}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className={cn("text-[10px] font-bold tracking-widest uppercase", isMidnight ? "text-slate-400" : "text-slate-400")}>Playback Speed</label>
                            <span className={cn(
                                "text-[10px] font-mono px-1.5 py-0.5 rounded-md",
                                isMidnight ? "text-slate-300 bg-slate-800/80" : "text-slate-400 bg-slate-100"
                            )}>{rate}x</span>
                        </div>
                        <div className="flex gap-1.5">
                            {[0.75, 1, 1.25, 1.5, 2].map(r => (
                                <button
                                    key={r}
                                    onClick={() => changeRate(r)}
                                    className={cn(
                                        "flex-1 h-7 text-[10px] rounded-lg border transition-all font-medium",
                                        rate === r
                                            ? (isMidnight ? "bg-slate-950 border-indigo-400/40 text-indigo-300 shadow-sm" : "bg-white border-indigo-200 text-indigo-600 shadow-sm")
                                            : (isMidnight ? "bg-slate-800/90 border-slate-700 text-slate-300 hover:border-slate-500" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300")
                                    )}
                                >
                                    {r}x
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {voices.length > 0 && (
                        <div className="space-y-2">
                            <label className={cn("text-[10px] font-bold tracking-widest uppercase flex items-center gap-1", isMidnight ? "text-slate-400" : "text-slate-400")}>
                                <Settings2 className="w-3 h-3" /> Voice
                            </label>
                            <select 
                                className={cn(
                                    "w-full rounded-xl text-xs p-2 outline-none cursor-pointer transition-all shadow-sm",
                                    isMidnight
                                        ? "bg-slate-900 border border-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-400/20 hover:border-slate-500"
                                        : "bg-white border border-slate-200 text-slate-700 focus:ring-2 focus:ring-indigo-100 hover:border-slate-300"
                                )}
                                value={selectedVoice?.voiceURI || ''}
                                style={{ colorScheme: isMidnight ? 'dark' : 'light' }}
                                onChange={e => {
                                    const v = voices.find(voice => voice.voiceURI === e.target.value)
                                    if (v) setVoice(v)
                                }}
                            >
                                {voices.map(v => (
                                    <option key={v.voiceURI} value={v.voiceURI}>
                                        {v.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </>
        )
    }
}

export function FloatingPlayer() {
    const { speechState, pause, resume, stop, currentMode, selectedVoice, rate } = useSpeech()
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'

    if (speechState === 'idle') return null

    return (
        <div className="fixed bottom-4 left-1/2 z-[100] w-[calc(100vw-1.5rem)] max-w-[420px] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans md:bottom-8 md:left-auto md:right-8 md:w-auto md:max-w-none md:translate-x-0">
            <div className={cn(
                "reader-floating-player backdrop-blur-xl border rounded-2xl p-2 pr-2 flex items-center gap-4 w-full md:min-w-[300px]",
                isMidnight
                    ? "bg-[#182239]/90 border-slate-700/60 shadow-[0_18px_48px_rgba(2,6,23,0.3)]"
                    : "bg-white/90 border-slate-200/50 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
            )}>
                <div className="flex gap-1.5 pl-1 shrink-0">
                    {speechState === 'speaking' ? (
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all shadow-sm" 
                            onClick={pause}
                        >
                            <Pause className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all shadow-sm" 
                            onClick={resume}
                        >
                            <Play className="w-4 h-4 ml-0.5" />
                        </Button>
                    )}
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all" 
                        onClick={stop}
                    >
                        <Square className="w-3.5 h-3.5 fill-current" />
                    </Button>
                </div>

                <div className="h-8 w-px bg-slate-200/50 shrink-0" />

                <div className="flex flex-col flex-1 truncate min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{currentMode || 'Reading'}</span>
                        <div className="flex gap-0.5">
                            <div className={cn("w-1 h-3 rounded-full bg-indigo-200", speechState === 'speaking' && "animate-pulse-slow")} />
                            <div className={cn("w-1 h-3 rounded-full bg-indigo-300", speechState === 'speaking' && "animate-pulse")} />
                            <div className={cn("w-1 h-3 rounded-full bg-indigo-400", speechState === 'speaking' && "animate-pulse-slowDelay")} />
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[11px] font-medium text-slate-600 truncate">{selectedVoice?.name || 'Voice'}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded shrink-0">{rate}x</span>
                    </div>
                </div>

                <div className="h-8 w-px bg-slate-200/50 shrink-0" />

                <div className="shrink-0 pr-1">
                    <ReaderControls 
                        getSelection={() => ''} 
                        getScene={() => ''} 
                        getChapter={() => ''} 
                        mode="settings-only"
                        side="top"
                        align="right"
                    />
                </div>
            </div>

            <style jsx global>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; transform: scaleY(0.8); }
                    50% { opacity: 1; transform: scaleY(1.2); }
                }
                .animate-pulse-slow { animation: pulse-slow 1.5s ease-in-out infinite; }
                .animate-pulse-slowDelay { animation: pulse-slow 1.5s ease-in-out 0.5s infinite; }
            `}</style>
        </div>
    )
}

