'use client'

import { cn } from '@/lib/utils'
import type { WritingMode } from '@/lib/supabase/types'

interface WritingModeToggleProps {
    mode: WritingMode
    onChange: (mode: WritingMode) => void
}

export default function WritingModeToggle({ mode, onChange }: WritingModeToggleProps) {
    return (
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
                Simple
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
                Script
            </button>
        </div>
    )
}
