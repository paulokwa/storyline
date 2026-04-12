'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { WritingMode } from '@/lib/supabase/types'
import { X } from 'lucide-react'

interface WritingModeToggleProps {
    mode: WritingMode
    onChange: (mode: WritingMode) => void
}

export default function WritingModeToggle({ mode, onChange }: WritingModeToggleProps) {
    const [showHint, setShowHint] = useState<{ mode: WritingMode, text: string } | null>(null)
    const prevModeRef = useRef(mode)
    const initialMount = useRef(true)

    useEffect(() => {
        if (initialMount.current) {
            initialMount.current = false
            return
        }

        if (prevModeRef.current !== mode) {
            const storageKey = `storyline-mode-switched-${mode}`
            const sessionKey = `storyline-mode-hint-shown`
            
            const permanentlyDismissed = localStorage.getItem(storageKey)
            const shownThisSession = sessionStorage.getItem(sessionKey)

            if (!permanentlyDismissed && !shownThisSession) {
                setShowHint({
                    mode,
                    text: mode === 'screenplay' 
                        ? 'Screenplay mode: Press Tab to switch elements.'
                        : 'Book mode: Freeform prose writing.'
                })
                sessionStorage.setItem(sessionKey, 'true')
                
                // Auto dismiss after 7 seconds
                const timer = setTimeout(() => setShowHint(null), 7000)
                return () => clearTimeout(timer)
            }
        }
        
        prevModeRef.current = mode
    }, [mode])

    const dismissHint = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (showHint) {
            localStorage.setItem(`storyline-mode-switched-${showHint.mode}`, 'true')
            setShowHint(null)
        }
    }

    return (
        <div className="relative">
            <div className="flex bg-[#efeee9] p-1 rounded-full w-fit">
            <button
                onClick={() => onChange('simple')}
                className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-sans tracking-widest uppercase transition-all duration-300",
                    mode === 'simple'
                        ? "bg-[#546354] text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                )}
            >
                Book
            </button>
            <button
                onClick={() => onChange('screenplay')}
                className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-sans tracking-widest uppercase transition-all duration-300",
                    mode === 'screenplay'
                        ? "bg-[#546354] text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                )}
            >
                Screenplay
            </button>
        </div>

            {/* Contextual Mode Switching Hint */}
            {showHint && (
                <div className="absolute right-0 top-full mt-3 z-50 animate-in fade-in slide-in-from-top-2 duration-500 bg-sky-600 text-white text-[11px] font-medium py-1.5 pl-3 pr-2 rounded-full shadow-lg shadow-sky-900/10 flex items-center gap-2 whitespace-nowrap">
                    <div className="absolute -top-1 right-8 -ml-1 border-4 border-transparent border-b-sky-600 border-t-0" />
                    {showHint.text}
                    <button 
                        onClick={dismissHint} 
                        className="bg-white/20 hover:bg-white/30 rounded-full p-0.5 ml-1 transition-colors"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    )
}
