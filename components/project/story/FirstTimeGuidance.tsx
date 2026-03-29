'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FirstTimeGuidanceProps {
    projectType: 'tv_script' | 'novel'
    onDismiss?: () => void
}

export default function FirstTimeGuidance({ projectType, onDismiss }: FirstTimeGuidanceProps) {
    const isTV = projectType === 'tv_script'

    return (
        <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none z-20 animate-in fade-in duration-700">
            <div className="w-full max-w-[400px] bg-[#f5f4ef]/90 border border-[#546354]/10 rounded-[2.5rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,0.04)] backdrop-blur-md text-center pointer-events-auto transition-all duration-500 hover:shadow-[0_40px_100px_rgba(0,0,0,0.06)] group">
                <h4 className="text-base font-serif italic text-[#546354] mb-8 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#546354]/60" /> You're just getting started.
                </h4>

                <div className="space-y-6 text-left mb-10">
                    <div className="flex items-center gap-4">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-[#546354]/10 shadow-sm flex items-center justify-center text-[10px] font-bold text-[#546354]">1</span>
                        <p className="text-sm font-medium text-slate-600">Add an {isTV ? 'episode' : 'chapter'}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-[#546354]/10 shadow-sm flex items-center justify-center text-[10px] font-bold text-[#546354]">2</span>
                        <p className="text-sm font-medium text-slate-600">Create a scene</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-[#546354]/10 shadow-sm flex items-center justify-center text-[10px] font-bold text-[#546354]">3</span>
                        <p className="text-sm font-medium text-slate-600">Begin writing</p>
                    </div>
                </div>

                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#546354]/30 mb-8">
                    You can always reorganize later.
                </p>

                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#546354] transition-colors"
                    >
                        Got it
                    </button>
                )}
            </div>
        </div>
    )
}
