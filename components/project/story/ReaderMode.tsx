'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Volume2, Play, Pause, Square, VolumeX, MoreHorizontal, Settings2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSpeech } from '@/hooks/useSpeech'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

export function ReaderControls({
    getSelection,
    getScene,
    getChapter
}: {
    getSelection: () => string,
    getScene: () => string,
    getChapter: () => string
}) {
    const { supported, speechState, pause, resume, stop, voices, selectedVoice, setVoice, rate, changeRate, speak } = useSpeech()
    const [open, setOpen] = useState(false)
    const [hasSelection, setHasSelection] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

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

    if (!supported) {
        return (
            <Tooltip>
                <TooltipTrigger>
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
        <div className="relative flex items-center" ref={menuRef}>
            <div className="flex items-center bg-white/40 hover:bg-white/60 border border-slate-200/50 rounded-full p-0.5 transition-all shadow-sm">
                <Tooltip>
                    <TooltipTrigger>
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
                    </TooltipTrigger>
                    <TooltipContent side="top">Read selection or current scene</TooltipContent>
                </Tooltip>

                <div className="w-px h-4 bg-slate-200 mx-0.5" />

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setHasSelection(getSelection().trim().length > 0)
                        setOpen(!open)
                    }}
                    className={cn(
                        "h-7 w-7 p-0 rounded-full transition-all",
                        open ? "bg-slate-100 text-slate-700" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
            </div>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 font-sans">
                    <div className="p-2 space-y-1">
                        <button 
                            disabled={!hasSelection}
                            onClick={() => { speak(getSelection(), 'Selection'); setOpen(false) }}
                            className="w-full text-left px-3 py-2 text-sm font-medium rounded-xl text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex items-center justify-between"
                        >
                            <span className="flex items-center gap-2"><User className="w-3.5 h-3.5 opacity-50" /> Read Selection</span>
                            {hasSelection && <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Active</span>}
                        </button>
                        <button 
                            onClick={() => { speak(getScene(), 'Scene'); setOpen(false) }}
                            className="w-full text-left px-3 py-2 text-sm font-medium rounded-xl text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between"
                        >
                            <span className="flex items-center gap-2"><Volume2 className="w-3.5 h-3.5 opacity-50" /> Read Scene</span>
                            {!hasSelection && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Default</span>}
                        </button>
                        <button 
                            onClick={() => { speak(getChapter(), 'Chapter'); setOpen(false) }}
                            className="w-full text-left px-3 py-2 text-sm font-medium rounded-xl text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        >
                            <User className="w-3.5 h-3.5 opacity-50" /> Read Chapter
                        </button>
                    </div>

                    <div className="border-t border-slate-100 p-3 bg-slate-50/50 space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Playback Speed</label>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{rate}x</span>
                            </div>
                            <div className="flex gap-1.5">
                                {[0.75, 1, 1.25, 1.5, 2].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => changeRate(r)}
                                        className={cn(
                                            "flex-1 h-7 text-[10px] rounded-lg border transition-all font-medium",
                                            rate === r 
                                                ? "bg-white border-indigo-200 text-indigo-600 shadow-sm" 
                                                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                        )}
                                    >
                                        {r}x
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        {voices.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1">
                                    <Settings2 className="w-3 h-3" /> Voice
                                </label>
                                <select 
                                    className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-100 hover:border-slate-300 transition-all shadow-sm"
                                    value={selectedVoice?.voiceURI || ''}
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
                </div>
            )}
        </div>
    )
}

export function FloatingPlayer() {
    const { speechState, pause, resume, stop, currentMode, selectedVoice, rate } = useSpeech()

    if (speechState === 'idle') return null

    return (
        <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
            <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-2 pr-4 flex items-center gap-4 min-w-[280px]">
                <div className="flex gap-1.5 pl-1">
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

                <div className="h-8 w-px bg-slate-200/50" />

                <div className="flex flex-col flex-1 truncate">
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
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">{rate}x</span>
                    </div>
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
