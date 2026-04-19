'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, ChevronRight, ChevronLeft, Sparkles, MessageSquare, Database, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
    target: string
    title: string
    content: string
    placement: 'right' | 'left' | 'top' | 'bottom' | 'center'
}

const STEPS: Step[] = [
    {
        target: '[data-tour="ai-header"]',
        title: 'Meet your Literary Partner',
        content: "I'm here to help you brainstorm, expand, or refine your story. Let's take a quick look at how we can collaborate.",
        placement: 'bottom'
    },
    {
        target: '[data-tour="ai-mode-selector"]',
        title: 'Choose your Mode',
        content: "Select a collaboration style. From 'Improve Scene' to 'Add Conflict', each mode helps steer the focus of my suggestions.",
        placement: 'bottom'
    },
    {
        target: '[data-tour="ai-context-strip"]',
        title: 'Smart Context',
        content: "I don't just guess. I see the characters, locations, and scenes you've linked, ensuring every suggestion fits your unique world.",
        placement: 'bottom'
    },
    {
        target: '[data-tour="ai-memory-btn"]',
        title: 'AI Memory',
        content: "Save favorite responses to your archive and pull them back as 'Memory' context for future prompts.",
        placement: 'bottom'
    },
    {
        target: '[data-tour="ai-help-icon"]',
        title: 'Replay This Tour Anytime',
        content: 'Use this help icon whenever you want to run the AI tour again later.',
        placement: 'bottom'
    }
]

export default function AiPartnerTour({ 
    open, 
    onClose 
}: { 
    open: boolean
    onClose: () => void
}) {
    const [currentStep, setCurrentStep] = useState(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const [mounted, setMounted] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        setMounted(true)
        setIsMobile(window.innerWidth < 768)
        
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (open) {
            setCurrentStep(0)
        }
    }, [open])

    useEffect(() => {
        if (!open) return

        const updateRect = () => {
            const step = STEPS[currentStep]
            const elements = document.querySelectorAll(step.target)
            const element = Array.from(elements).find(el => {
                const rect = el.getBoundingClientRect()
                return rect.width > 0 && rect.height > 0
            })
            
            if (element) {
                setTargetRect(element.getBoundingClientRect())
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } else {
                setTargetRect(null)
            }
        }

        const timer = setTimeout(updateRect, 100)
        window.addEventListener('resize', updateRect)
        window.addEventListener('scroll', updateRect, true)

        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', updateRect)
            window.removeEventListener('scroll', updateRect, true)
        }
    }, [open, currentStep])

    if (!mounted || !open) return null

    const step = STEPS[currentStep]
    const isLast = currentStep === STEPS.length - 1

    const handleNext = () => {
        if (isLast) {
            handleComplete()
        } else {
            setCurrentStep(prev => prev + 1)
        }
    }

    const handleBack = () => {
        setCurrentStep(prev => Math.max(0, prev - 1))
    }

    const handleComplete = () => {
        localStorage.setItem('storyline-ai-tour-complete', 'true')
        onClose()
    }

    const tooltipStyles = () => {
        if (!targetRect || targetRect.width === 0) {
            return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        }

        const padding = 20
        const tooltipWidth = isMobile ? window.innerWidth - 32 : 320
        const { top: t, left: l, bottom: b, right: r, width: w, height: h } = targetRect

        let style: any = { width: tooltipWidth }

        if (step.placement === 'top') {
            style.top = t - padding
            style.left = l + w / 2
            style.transform = 'translate(-50%, -100%)'
        } else {
            // Default to bottom for others
            style.top = b + padding
            style.left = l + w / 2
            style.transform = 'translate(-50%, 0)'
        }

        // Clamp left/right to screen
        // Note: translate(-50%) makes clamping tricky with simple logic
        // If we're too close to edges, we'll swap to absolute x/y
        const margin = 16
        const centerX = l + w / 2
        const halfWidth = tooltipWidth / 2
        
        if (centerX - halfWidth < margin) {
            style.left = margin
            style.transform = style.transform === 'translate(-50%, -100%)' ? 'translate(0, -100%)' : 'translate(0, 0)'
        } else if (centerX + halfWidth > window.innerWidth - margin) {
            style.left = window.innerWidth - tooltipWidth - margin
            style.transform = style.transform === 'translate(-50%, -100%)' ? 'translate(0, -100%)' : 'translate(0, 0)'
        }

        return style
    }

    const getIcon = () => {
        switch(currentStep) {
            case 0: return <Sparkles className="w-4 h-4" />
            case 2: return <Database className="w-4 h-4" />
            case 3: return <Package className="w-4 h-4" />
            default: return <MessageSquare className="w-4 h-4" />
        }
    }

    return (<>
        {createPortal(
            <div className="fixed inset-0 z-[10000] pointer-events-none overflow-hidden">
                {/* Spotlight Overlay */}
                <div className="absolute inset-0 pointer-events-auto bg-black/50 transition-opacity duration-500">
                    <svg className="w-full h-full">
                        <defs>
                            <mask id="ai-tour-mask">
                                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                {targetRect && (
                                    <rect 
                                        x={targetRect.left - 4} 
                                        y={targetRect.top - 4} 
                                        width={targetRect.width + 8} 
                                        height={targetRect.height + 8} 
                                        rx="12"
                                        fill="black"
                                        className="transition-all duration-300 ease-out"
                                    />
                                )}
                            </mask>
                        </defs>
                        <rect x="0" y="0" width="100%" height="100%" fill="currentColor" mask="url(#ai-tour-mask)" />
                    </svg>
                </div>
            </div>,
            document.body
        )}

        {createPortal(
            <div className="fixed inset-0 z-[10001] pointer-events-none overflow-hidden">
                {/* Tooltip Box */}
                <div 
                    className={cn(
                        "absolute pointer-events-auto bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in duration-300",
                        "border border-slate-100/50"
                    )}
                    style={tooltipStyles() as any}
                >
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                {getIcon()}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                AI Tour • {currentStep + 1}/{STEPS.length}
                            </span>
                        </div>
                        <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">{step.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-serif italic">{step.content}</p>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-50">
                        <button 
                            onClick={handleComplete}
                            className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            Skip
                        </button>

                        <div className="flex items-center gap-2">
                            {currentStep > 0 && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleBack}
                                    className="h-9 w-9 rounded-xl border border-slate-100 text-slate-500 p-0"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                            )}
                            <Button 
                                onClick={handleNext}
                                className="sanctuary-btn-primary h-9 px-4 rounded-xl text-xs font-bold gap-2"
                            >
                                {isLast ? 'Done' : 'Next'}
                                {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )}
    </>)
}
