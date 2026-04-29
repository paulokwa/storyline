'use client'

import { useEffect, useState } from 'react'
import { BookOpen, LibraryBig, PenLine, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type RouteLoadingVariant = 'library' | 'form' | 'settings' | 'workspace'

const LONG_WAIT_MS = 2400
const SKELETON_DELAY_MS = 180

export default function RouteLoadingScreen({
    variant,
    title,
    description,
    reassurance,
    className,
}: {
    variant: RouteLoadingVariant
    title: string
    description: string
    reassurance?: string
    className?: string
}) {
    const [showSkeleton, setShowSkeleton] = useState(false)
    const [showLongWait, setShowLongWait] = useState(false)

    useEffect(() => {
        const skeletonTimer = window.setTimeout(() => setShowSkeleton(true), SKELETON_DELAY_MS)
        const longWaitTimer = window.setTimeout(() => setShowLongWait(true), LONG_WAIT_MS)

        return () => {
            window.clearTimeout(skeletonTimer)
            window.clearTimeout(longWaitTimer)
        }
    }, [])

    return (
        <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f8f5ef]', className)}>
            <div
                className={cn(
                    'mx-auto flex h-full w-full max-w-[1440px] flex-1 flex-col px-5 py-10 transition-opacity duration-300 sm:px-6 sm:py-12',
                    showSkeleton ? 'opacity-100' : 'opacity-0'
                )}
                aria-live="polite"
                aria-busy="true"
            >
                <LoadingChrome />
                <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8">
                    <div className="flex flex-col items-center gap-5 text-center">
                        <LoadingMark variant={variant} active={showLongWait} />
                        <div className="space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#546354]/60">
                                Storyline
                            </p>
                            <h2 className="font-serif text-3xl text-slate-800 sm:text-4xl">{title}</h2>
                            <p className="mx-auto max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                                {showLongWait ? description : 'Preparing the next view...'}
                            </p>
                            {showLongWait && reassurance ? (
                                <p className="text-sm font-semibold text-[#546354]">{reassurance}</p>
                            ) : null}
                        </div>
                    </div>

                    <LoadingSkeleton variant={variant} emphasize={showLongWait} />
                </div>
            </div>
        </div>
    )
}

function LoadingChrome() {
    return (
        <div className="mb-8 flex items-center justify-between gap-4">
            <div className="h-10 w-36 rounded-full bg-white/80 shadow-sm shadow-black/5" />
            <div className="h-10 w-28 rounded-full bg-white/70 shadow-sm shadow-black/5" />
        </div>
    )
}

function LoadingMark({ variant, active }: { variant: RouteLoadingVariant; active: boolean }) {
    const Icon = variant === 'library'
        ? LibraryBig
        : variant === 'settings'
            ? Settings2
            : variant === 'workspace'
                ? BookOpen
                : PenLine

    return (
        <div className="relative flex h-20 w-20 items-center justify-center rounded-[2rem] border border-[#d8e0d4] bg-white shadow-[0_18px_45px_rgba(84,99,84,0.12)]">
            <div
                className={cn(
                    'absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(123,145,123,0.16),_transparent_65%)] transition-opacity duration-500',
                    active ? 'opacity-100' : 'opacity-60'
                )}
            />
            <Icon className={cn('relative z-10 h-9 w-9 text-[#546354]', active && 'animate-pulse')} />
        </div>
    )
}

function LoadingSkeleton({
    variant,
    emphasize,
}: {
    variant: RouteLoadingVariant
    emphasize: boolean
}) {
    if (variant === 'library') {
        return (
            <div className="space-y-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <SkeletonBlock className="h-6 w-24" />
                        <SkeletonBlock className="h-14 w-72 max-w-full" />
                        <SkeletonBlock className="h-5 w-96 max-w-full" />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <SkeletonBlock className="h-14 w-full sm:w-48" />
                        <SkeletonBlock className="h-14 w-full sm:w-56" />
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div
                            key={index}
                            className={cn(
                                'rounded-[2rem] border border-white/80 bg-white/85 p-7 shadow-[0_20px_40px_rgba(15,23,42,0.06)]',
                                emphasize && index < 3 && 'shadow-[0_20px_50px_rgba(84,99,84,0.10)]'
                            )}
                        >
                            <div className="mb-10 flex items-start justify-between gap-4">
                                <SkeletonBlock className="h-14 w-14 rounded-2xl" />
                                <div className="flex gap-2">
                                    <SkeletonBlock className="h-9 w-9 rounded-xl" />
                                    <SkeletonBlock className="h-9 w-9 rounded-xl" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <SkeletonBlock className="h-8 w-4/5" />
                                <SkeletonBlock className="h-4 w-2/3" />
                                <SkeletonBlock className="h-4 w-full" />
                            </div>
                            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
                                <SkeletonBlock className="h-4 w-28" />
                                <SkeletonBlock className="h-10 w-10 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (variant === 'settings') {
        return (
            <div className="mx-auto grid w-full max-w-3xl gap-6">
                <div className="space-y-3">
                    <SkeletonBlock className="h-6 w-24" />
                    <SkeletonBlock className="h-11 w-56" />
                    <SkeletonBlock className="h-5 w-80 max-w-full" />
                </div>
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="rounded-[1.75rem] border border-white/80 bg-white/88 p-6 shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <SkeletonBlock className="h-7 w-44" />
                            <SkeletonBlock className="h-9 w-28 rounded-full" />
                        </div>
                        <div className="space-y-4">
                            <SkeletonBlock className="h-12 w-full rounded-2xl" />
                            <SkeletonBlock className="h-12 w-full rounded-2xl" />
                            <SkeletonBlock className="h-28 w-full rounded-[1.5rem]" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (variant === 'workspace') {
        return (
            <div className="grid min-h-[420px] gap-5 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
                <div className="rounded-[1.75rem] border border-white/80 bg-white/88 p-5 shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
                    <div className="space-y-4">
                        <SkeletonBlock className="h-9 w-36" />
                        {Array.from({ length: 7 }).map((_, index) => (
                            <SkeletonBlock key={index} className="h-11 w-full rounded-2xl" />
                        ))}
                    </div>
                </div>
                <div className="rounded-[2rem] border border-white/80 bg-white/88 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div className="space-y-3">
                            <SkeletonBlock className="h-5 w-24" />
                            <SkeletonBlock className="h-10 w-64 max-w-full" />
                        </div>
                        <SkeletonBlock className="h-10 w-28 rounded-full" />
                    </div>
                    <div className="space-y-4">
                        <SkeletonBlock className="h-28 w-full rounded-[1.75rem]" />
                        <SkeletonBlock className="h-28 w-full rounded-[1.75rem]" />
                        <SkeletonBlock className="h-28 w-11/12 rounded-[1.75rem]" />
                    </div>
                </div>
                <div className="hidden rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-[0_16px_35px_rgba(15,23,42,0.05)] lg:block">
                    <div className="space-y-4">
                        <SkeletonBlock className="h-8 w-36" />
                        <SkeletonBlock className="h-24 w-full rounded-[1.5rem]" />
                        <SkeletonBlock className="h-24 w-full rounded-[1.5rem]" />
                        <SkeletonBlock className="h-24 w-full rounded-[1.5rem]" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="mx-auto grid w-full max-w-2xl gap-5">
            <div className="space-y-3">
                <SkeletonBlock className="h-6 w-24" />
                <SkeletonBlock className="h-12 w-64 max-w-full" />
                <SkeletonBlock className="h-5 w-80 max-w-full" />
            </div>
            <div className="rounded-[2rem] border border-white/80 bg-white/88 p-6 shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
                <div className="space-y-5">
                    <SkeletonBlock className="h-14 w-full rounded-2xl" />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <SkeletonBlock className="h-32 w-full rounded-[1.5rem]" />
                        <SkeletonBlock className="h-32 w-full rounded-[1.5rem]" />
                    </div>
                    <SkeletonBlock className="h-40 w-full rounded-[1.75rem]" />
                    <div className="flex justify-between gap-4">
                        <SkeletonBlock className="h-12 w-28 rounded-full" />
                        <SkeletonBlock className="h-12 w-40 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    )
}

function SkeletonBlock({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'rounded-xl bg-[linear-gradient(110deg,rgba(226,232,240,0.68),rgba(248,250,252,0.95),rgba(226,232,240,0.68))] bg-[length:220%_100%] animate-[shimmer_1.8s_ease-in-out_infinite]',
                className
            )}
        />
    )
}
