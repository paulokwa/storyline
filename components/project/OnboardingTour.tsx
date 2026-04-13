'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, ChevronRight, ChevronLeft, Sparkles, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectActions } from '@/components/project/ProjectContext'

interface Step {
    target: string
    title: string
    content: string
    placement: 'right' | 'left' | 'top' | 'bottom' | 'center'
}

const STEPS: Step[] = [
    {
        target: '[data-tour="structure-panel"]',
        title: 'Structure Panel',
        content: 'This is your story structure. Organize chapters and scenes here.',
        placement: 'right'
    },
    {
        target: '[data-tour="main-editor"]',
        title: 'Editor',
        content: 'Write your story here. Everything starts in the editor.',
        placement: 'center'
    },
    {
        target: '[data-tour="ai-helper"]',
        title: 'AI Partner',
        content: 'Use AI to brainstorm, expand, or analyze your writing.',
        placement: 'bottom'
    },
    {
        target: '[data-tour="help-icon"]',
        title: 'Help & Shortcuts',
        content: 'Access shortcuts and tips any time here.',
        placement: 'bottom'
    }
]

export default function OnboardingTour({ 
    open, 
    onClose,
    onComplete 
}: { 
    open: boolean
    onClose: () => void
    onComplete: () => void
}) {
    const [currentStep, setCurrentStep] = useState(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const [mounted, setMounted] = useState(false)
    const overlayRef = useRef<HTMLDivElement>(null)
    const { sidebarOpen, setSidebarOpen } = useProjectActions()
    const sidebarStateRef = useRef(sidebarOpen)

    useEffect(() => {
        if (open) {
            setCurrentStep(0)
            // Remember the sidebar state before the tour starts
            sidebarStateRef.current = sidebarOpen
        }
    }, [open])

    // Manage sidebar visibility per step on mobile
    useEffect(() => {
        if (!open) return
        const isMobile = window.innerWidth < 768
        if (!isMobile) return

        if (currentStep === 0) {
            // Step 1: Structure Panel — open sidebar so it's visible
            setSidebarOpen(true)
        } else {
            // All other steps — close sidebar so content is visible
            setSidebarOpen(false)
        }
    }, [open, currentStep, setSidebarOpen])

    // Temporarily boost the target element's z-index above the overlay
    useEffect(() => {
        if (!open) return

        const step = STEPS[currentStep]
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
        const delay = isMobile && (currentStep === 0 || currentStep === 1) ? 400 : 100

        const timer = setTimeout(() => {
            const elements = document.querySelectorAll(step.target)
            const element = Array.from(elements).find(el => el.getBoundingClientRect().width > 0) as HTMLElement | undefined
            if (element) {
                element.style.position = element.style.position || 'relative'
                element.style.zIndex = '10000'
            }
        }, delay)

        return () => {
            clearTimeout(timer)
            // Reset z-index on cleanup
            const elements = document.querySelectorAll(step.target)
            elements.forEach(el => {
                (el as HTMLElement).style.zIndex = ''
            })
        }
    }, [open, currentStep])

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!open) return

        const updateRect = () => {
            const step = STEPS[currentStep]
            // On desktop/mobile some elements might be hidden (display: none).
            // We find the first one that is actually visible.
            const elements = document.querySelectorAll(step.target)
            const element = Array.from(elements).find(el => el.getBoundingClientRect().width > 0)
            
            if (element) {
                setTargetRect(element.getBoundingClientRect())
                if (step.placement !== 'center') {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
            } else {
                setTargetRect(null)
            }
        }

        // Delay the initial rect update to allow sidebar animations to finish (300ms transition)
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
        const needsSidebarTransition = isMobile && (currentStep === 0 || currentStep === 1)
        const delay = needsSidebarTransition ? 400 : 50

        const timer = setTimeout(() => {
            updateRect()
        }, delay)

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
        localStorage.setItem('storyline-onboarding-complete', 'true')
        onComplete()
        onClose()
    }

    const tooltipStyles = () => {
        if (typeof window === 'undefined') return {}
        if (!targetRect || targetRect.width === 0) {
            return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        }

        const padding = 24
        const tooltipWidth = 320
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        
        const { top: t, left: l, bottom: b, right: r, width: w, height: h } = targetRect

        let style: any = {}

        if (step.placement === 'center') {
            style = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        } else if (step.placement === 'right') {
            style = { top: t + h / 2, left: r + padding, transform: 'translateY(-50%)' }
        } else if (step.placement === 'left') {
            style = { top: t + h / 2, left: l - padding, transform: 'translate(-100%, -50%)' }
        } else if (step.placement === 'top') {
            style = { top: t - padding, left: l + w / 2, transform: 'translate(-50%, -100%)' }
        } else if (step.placement === 'bottom') {
            style = { top: b + padding, left: l + w / 2, transform: 'translate(-50%, 0)' }
        }

        // Bound check (Approximate because we don't know the tooltip height yet)
        // We ensure the left and right positions stay within viewport with a buffer
        const margin = 16
        if (style.left !== undefined) {
            // This is a bit tricky with translation, but we can simplify by calculating absolute positions
            // For now, let's use a more robust way: calculate preferred x and y then clamp
            let x = l + w / 2
            let y = b + padding

            if (step.placement === 'right') { x = r + padding; y = t + h / 2 - 100 } // Approx mid height
            else if (step.placement === 'left') { x = l - padding - tooltipWidth; y = t + h / 2 - 100 }
            else if (step.placement === 'top') { x = l + w / 2 - tooltipWidth / 2; y = t - padding - 200 } // Approx height 200
            else if (step.placement === 'bottom') { x = l + w / 2 - tooltipWidth / 2; y = b + padding }
            else if (step.placement === 'center') { x = viewportWidth / 2 - tooltipWidth / 2; y = viewportHeight / 2 - 100 }

            // Clamp X
            x = Math.max(margin, Math.min(x, viewportWidth - tooltipWidth - margin))
            // Clamp Y (approximate)
            y = Math.max(margin, Math.min(y, viewportHeight - 250 - margin))

            return { top: y, left: x, transform: 'none' }
        }

        return style
    }

    return (<>
        {createPortal(
            <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
                {/* Spotlight Overlay */}
                <div className="absolute inset-0 pointer-events-auto bg-black/60 transition-opacity duration-500">
                    <svg className="w-full h-full">
                        <defs>
                            <mask id="spotlight-mask">
                                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                {targetRect && (
                                    <rect 
                                        x={targetRect.left - 8} 
                                        y={targetRect.top - 8} 
                                        width={targetRect.width + 16} 
                                        height={targetRect.height + 16} 
                                        rx="16"
                                        fill="black"
                                        className="transition-all duration-300 ease-out"
                                    />
                                )}
                            </mask>
                        </defs>
                        <rect x="0" y="0" width="100%" height="100%" fill="currentColor" mask="url(#spotlight-mask)" />
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
                        "absolute pointer-events-auto w-[320px] bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in duration-300",
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
                            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                {currentStep === 3 ? <Sparkles className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Step {currentStep + 1} of {STEPS.length}
                            </span>
                        </div>
                        <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">{step.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{step.content}</p>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-50">
                        <button 
                            onClick={onClose}
                            className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            Skip Tour
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
                                {isLast ? 'Finish' : 'Next'}
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
