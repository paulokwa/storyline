'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, ChevronRight, ChevronLeft, Sparkles, HelpCircle, HeartHandshake } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectActions } from '@/components/project/ProjectContext'
import { useTheme } from '@/components/providers/ThemeProvider'

interface Step {
    id: string
    targets?: string[]
    title: string
    content: string
    placement: 'right' | 'left' | 'top' | 'bottom' | 'center'
}

const STEPS: Step[] = [
    {
        id: 'welcome',
        title: 'Welcome to Storyline',
        content: 'This is your creative workspace. We will show you the essentials so you can settle in and start writing quickly.',
        placement: 'center'
    },
    {
        id: 'structure-panel',
        targets: ['[data-tour="structure-panel"]'],
        title: 'Structure Panel',
        content: 'This is your story structure. Organize chapters and scenes here.',
        placement: 'right'
    },
    {
        id: 'structure-toggle',
        targets: ['[data-tour="structure-toggle"]'],
        title: 'Quick Navigation',
        content: 'You can show or hide the structure panel any time from the Structure button next to Home.',
        placement: 'bottom'
    },
    {
        id: 'main-editor',
        targets: ['[data-tour="main-editor"]'],
        title: 'Editor',
        content: 'Write your story here. Everything starts in the editor.',
        placement: 'center'
    },
    {
        id: 'ai-entry-points',
        targets: ['[data-tour="ai-tab"]', '[data-tour="ai-sidebar-trigger"]'],
        title: 'Two Ways Into AI',
        content: 'Open the full AI page from the tab, or pull in the AI sidebar while you write for in-context help.',
        placement: 'center'
    },
    {
        id: 'help-icon',
        targets: ['[data-tour="help-icon"]'],
        title: 'Replay This Tour Anytime',
        content: 'Use this help icon whenever you want to open shortcuts, tips, or run the main workspace tour again.',
        placement: 'bottom'
    }
]

function toSpotlightRect(left: number, top: number, right: number, bottom: number): DOMRect {
    return {
        left,
        top,
        right,
        bottom,
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
        toJSON: () => ({ left, top, right, bottom, x: left, y: top, width: right - left, height: bottom - top }),
    } as DOMRect
}

function getStepTargets(step: Step) {
    if (!step.targets?.length) return []
    if (typeof window === 'undefined') return step.targets

    if (step.id === 'ai-entry-points' && window.innerWidth < 768) {
        return ['[data-tour="ai-helper"]']
    }

    return step.targets
}

export default function OnboardingTour({
    open,
    onClose,
    onComplete,
    onDismiss,
}: {
    open: boolean
    onClose: () => void
    onComplete: () => void
    onDismiss: () => void
}) {
    const [phase, setPhase] = useState<'intro' | 'tour'>('intro')
    const [currentStep, setCurrentStep] = useState(0)
    const [targetRects, setTargetRects] = useState<DOMRect[]>([])
    const { sidebarOpen, setSidebarOpen } = useProjectActions()
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const sidebarStateRef = useRef(sidebarOpen)

    useEffect(() => {
        sidebarStateRef.current = sidebarOpen
    }, [sidebarOpen])

    useEffect(() => {
        if (!open || phase !== 'tour') return

        const isMobile = window.innerWidth < 768
        if (!isMobile) return

        const stepId = STEPS[currentStep]?.id
        if (stepId === 'structure-panel' || stepId === 'structure-toggle') {
            setSidebarOpen(true)
        } else {
            setSidebarOpen(false)
        }
    }, [open, phase, currentStep, setSidebarOpen])

    useEffect(() => {
        if (!open || phase !== 'tour') return

        const step = STEPS[currentStep]
        const selectors = getStepTargets(step)
        if (!selectors.length) return

        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
        const needsSidebarTransition = step.id === 'structure-panel' || step.id === 'structure-toggle'
        const delay = isMobile && needsSidebarTransition ? 400 : 100

        const timer = setTimeout(() => {
            selectors.forEach((selector) => {
                const elements = document.querySelectorAll(selector)
                const element = Array.from(elements).find(el => {
                    const rect = el.getBoundingClientRect()
                    return rect.width > 0 && rect.height > 0
                }) as HTMLElement | undefined

                if (element) {
                    element.style.position = element.style.position || 'relative'
                    element.style.zIndex = '10000'
                }
            })
        }, delay)

        return () => {
            clearTimeout(timer)
            selectors.forEach((selector) => {
                const elements = document.querySelectorAll(selector)
                elements.forEach((el) => {
                    (el as HTMLElement).style.zIndex = ''
                })
            })
        }
    }, [open, phase, currentStep])

    useEffect(() => {
        if (!open || phase !== 'tour') return

        const updateRects = () => {
            const step = STEPS[currentStep]
            const selectors = getStepTargets(step)
            if (!selectors.length) {
                setTargetRects([])
                return
            }

            const rects = selectors.flatMap((selector) => {
                const elements = document.querySelectorAll(selector)
                const element = Array.from(elements).find(el => {
                    const rect = el.getBoundingClientRect()
                    return rect.width > 0 && rect.height > 0
                })

                return element ? [element.getBoundingClientRect()] : []
            })

            setTargetRects(rects)

            if (rects.length > 0 && step.placement !== 'center') {
                const firstSelector = selectors[0]
                const firstVisibleTarget = Array.from(document.querySelectorAll(firstSelector)).find(el => {
                    const rect = el.getBoundingClientRect()
                    return rect.width > 0 && rect.height > 0
                })
                firstVisibleTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        }

        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
        const stepId = STEPS[currentStep]?.id
        const needsSidebarTransition = isMobile && (stepId === 'structure-panel' || stepId === 'structure-toggle')
        const delay = needsSidebarTransition ? 400 : 50

        const timer = setTimeout(updateRects, delay)

        window.addEventListener('resize', updateRects)
        window.addEventListener('scroll', updateRects, true)

        return () => {
            clearTimeout(timer)
            window.removeEventListener('resize', updateRects)
            window.removeEventListener('scroll', updateRects, true)
        }
    }, [open, phase, currentStep])

    if (!open || typeof document === 'undefined') return null

    const step = STEPS[currentStep]
    const isLast = currentStep === STEPS.length - 1
    const overlayFill = isMidnight ? 'rgba(6, 10, 20, 0.72)' : 'rgba(0, 0, 0, 0.6)'
    const targetRect = targetRects.length === 0
        ? null
        : targetRects.reduce<DOMRect | null>((combined, rect) => {
            if (!combined) return rect

            return toSpotlightRect(
                Math.min(combined.left, rect.left),
                Math.min(combined.top, rect.top),
                Math.max(combined.right, rect.right),
                Math.max(combined.bottom, rect.bottom)
            )
        }, null)

    const handleNext = () => {
        if (isLast) {
            setSidebarOpen(sidebarStateRef.current)
            onComplete()
            onClose()
            return
        }

        setCurrentStep(prev => prev + 1)
    }

    const handleBack = () => {
        setCurrentStep(prev => Math.max(0, prev - 1))
    }

    const handleDismiss = () => {
        setSidebarOpen(sidebarStateRef.current)
        onDismiss()
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
        const { top, left, bottom, right, width, height } = targetRect

        let x = left + width / 2 - tooltipWidth / 2
        let y = bottom + padding

        if (step.placement === 'center') {
            x = viewportWidth / 2 - tooltipWidth / 2
            y = viewportHeight / 2 - 100
        } else if (step.placement === 'right') {
            x = right + padding
            y = top + height / 2 - 100
        } else if (step.placement === 'left') {
            x = left - tooltipWidth - padding
            y = top + height / 2 - 100
        } else if (step.placement === 'top') {
            x = left + width / 2 - tooltipWidth / 2
            y = top - padding - 200
        }

        const margin = 16
        x = Math.max(margin, Math.min(x, viewportWidth - tooltipWidth - margin))
        y = Math.max(margin, Math.min(y, viewportHeight - 250 - margin))

        return { top: y, left: x, transform: 'none' }
    }

    const getStepIcon = () => {
        if (step.id === 'welcome') return <HeartHandshake className="w-4 h-4" />
        if (step.id === 'ai-entry-points') return <Sparkles className="w-4 h-4" />
        return <HelpCircle className="w-4 h-4" />
    }

    return (
        <>
            {createPortal(
                <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
                    <div className={cn(
                        "absolute inset-0 pointer-events-auto transition-opacity duration-500",
                        isMidnight ? "bg-[rgba(6,10,20,0.28)]" : "bg-black/60"
                    )}>
                        {phase === 'tour' ? (
                            <svg className="w-full h-full">
                                <defs>
                                    <mask id="spotlight-mask">
                                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                        {targetRects.map((rect, index) => (
                                            <rect
                                                key={`${rect.left}-${rect.top}-${index}`}
                                                x={rect.left - 8}
                                                y={rect.top - 8}
                                                width={rect.width + 16}
                                                height={rect.height + 16}
                                                rx="16"
                                                fill="black"
                                                className="transition-all duration-300 ease-out"
                                            />
                                        ))}
                                    </mask>
                                </defs>
                                <rect x="0" y="0" width="100%" height="100%" fill={overlayFill} mask="url(#spotlight-mask)" />
                            </svg>
                        ) : null}
                    </div>
                </div>,
                document.body
            )}

            {phase === 'intro' && createPortal(
                <div className="fixed inset-0 z-[10001] overflow-hidden">
                    <div className="absolute inset-0" onClick={handleDismiss} />
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                        <div
                            className={cn(
                                "w-full max-w-md rounded-[2rem] p-8 animate-in fade-in zoom-in duration-300",
                                isMidnight
                                    ? "bg-[linear-gradient(180deg,rgba(12,20,36,0.98)_0%,rgba(15,23,42,0.98)_100%)] border border-slate-700/70 shadow-[0_30px_80px_rgba(2,6,23,0.55)]"
                                    : "bg-white border border-slate-100/60 shadow-2xl"
                            )}
                        >
                            <div className="mb-6 flex items-center gap-3">
                                <div className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                                    isMidnight ? "bg-slate-800 text-slate-100" : "bg-primary/10 text-primary"
                                )}>
                                    <HeartHandshake className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className={cn(
                                        "text-[10px] font-black uppercase tracking-[0.24em]",
                                        isMidnight ? "text-slate-400" : "text-slate-400"
                                    )}>
                                        First-Time Tour
                                    </div>
                                    <h3 className={cn(
                                        "mt-1 text-2xl font-serif font-bold",
                                        isMidnight ? "text-slate-50" : "text-slate-900"
                                    )}>
                                        Welcome in
                                    </h3>
                                </div>
                            </div>

                            <p className={cn(
                                "mb-8 text-sm leading-relaxed",
                                isMidnight ? "text-slate-300" : "text-slate-600"
                            )}>
                                Storyline has a few moving parts at first. Want a quick guided tour of the editor, structure, and AI tools before you begin?
                            </p>

                            <div className="flex items-center justify-between gap-3">
                                <button
                                    onClick={handleDismiss}
                                    className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest transition-colors",
                                        isMidnight ? "text-slate-500 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    Not now
                                </button>
                                <Button
                                    onClick={() => setPhase('tour')}
                                    className="sanctuary-btn-primary h-10 rounded-xl px-5 text-xs font-bold gap-2"
                                >
                                    Start tour
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {phase === 'tour' && createPortal(
                <div className="fixed inset-0 z-[10001] pointer-events-none overflow-hidden">
                    <div
                        className={cn(
                            "absolute pointer-events-auto w-[320px] rounded-[2rem] p-6 sm:p-8 animate-in fade-in zoom-in duration-300",
                            isMidnight
                                ? "bg-[linear-gradient(180deg,rgba(12,20,36,0.98)_0%,rgba(15,23,42,0.98)_100%)] border border-slate-700/70 shadow-[0_30px_80px_rgba(2,6,23,0.55)]"
                                : "bg-white border border-slate-100/50 shadow-2xl"
                        )}
                        style={tooltipStyles() as CSSProperties}
                    >
                        <button
                            onClick={handleDismiss}
                            className={cn(
                                "absolute top-4 right-4 p-2 rounded-full transition-all",
                                isMidnight ? "text-slate-500 hover:text-slate-200 hover:bg-slate-800/80" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={cn(
                                    "w-8 h-8 rounded-xl flex items-center justify-center",
                                    isMidnight ? "bg-slate-800 text-slate-100" : "bg-primary/10 text-primary"
                                )}>
                                    {getStepIcon()}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                    Step {currentStep + 1} of {STEPS.length}
                                </span>
                            </div>
                            <h3 className={cn(
                                "mb-2 text-xl font-serif font-bold",
                                isMidnight ? "text-slate-50" : "text-slate-900"
                            )}>
                                {step.title}
                            </h3>
                            <p className={cn(
                                "text-sm leading-relaxed",
                                isMidnight ? "text-slate-300" : "text-slate-500"
                            )}>
                                {step.content}
                            </p>
                        </div>

                        <div className={cn(
                            "flex items-center justify-between gap-4 pt-4 border-t",
                            isMidnight ? "border-slate-800" : "border-slate-50"
                        )}>
                            <button
                                onClick={handleDismiss}
                                className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest transition-colors",
                                    isMidnight ? "text-slate-500 hover:text-slate-200" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Skip Tour
                            </button>

                            <div className="flex items-center gap-2">
                                {currentStep > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleBack}
                                        className={cn(
                                            "h-9 w-9 rounded-xl p-0",
                                            isMidnight ? "border border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800" : "border border-slate-100 text-slate-500"
                                        )}
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
        </>
    )
}
