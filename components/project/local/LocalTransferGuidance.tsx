'use client'

import Link from 'next/link'
import { HardDrive, Upload, Cloud, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/providers/ThemeProvider'

type LocalTransferGuidanceProps = {
    className?: string
    onOpenProjectFile?: () => void
    cloudSyncHref?: string
    onLearnAboutCloudSync?: () => void
    compact?: boolean
    onDismiss?: () => void
}

export default function LocalTransferGuidance({
    className,
    onOpenProjectFile,
    cloudSyncHref,
    onLearnAboutCloudSync,
    compact = false,
    onDismiss,
}: LocalTransferGuidanceProps) {
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'

    return (
        <section
            className={cn(
                'relative rounded-[1.75rem] border p-5 text-left shadow-[0_18px_50px_rgba(84,99,84,0.08)]',
                isMidnight
                    ? 'border-slate-700/60 bg-[linear-gradient(135deg,#1a2234_0%,#111c2e_60%,#0f1729_100%)] shadow-none'
                    : 'border-[#d9e1d5] bg-[linear-gradient(135deg,#fbf9f5_0%,#f5f4ef_60%,#eef4ed_100%)]',
                compact ? 'max-w-xl' : 'max-w-2xl',
                className
            )}
        >
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss this reminder"
                    className={cn(
                        'absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition',
                        isMidnight
                            ? 'border-slate-600/40 bg-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                            : 'border-slate-200/80 bg-white/80 text-slate-500 hover:bg-white hover:text-slate-900'
                    )}
                >
                    <X className="h-4 w-4" />
                </button>
            )}

            <div className="flex items-start gap-4">
                <div className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm',
                    isMidnight ? 'bg-slate-700/60 text-indigo-400' : 'bg-white/85 text-[#546354]'
                )}>
                    <HardDrive className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <h3 className={cn('text-lg font-semibold', isMidnight ? 'text-slate-100' : 'text-slate-900')}>Need this project on another device?</h3>
                    <p className={cn('mt-2 text-sm leading-6', isMidnight ? 'text-slate-300' : 'text-slate-600')}>
                        If you want to keep this project local, save a `.storyline` file on one device and open it on the other. If you want it available across devices, turn on cloud sync from Project Settings.
                    </p>
                </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {onOpenProjectFile && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onOpenProjectFile}
                        className={cn(
                            'h-11 rounded-full px-5',
                            isMidnight
                                ? 'border-slate-600 bg-slate-700/60 text-slate-200 hover:bg-slate-700'
                                : 'border-slate-200 bg-white/85 text-slate-700 hover:bg-white'
                        )}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Open Project File
                    </Button>
                )}

                {onLearnAboutCloudSync && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onLearnAboutCloudSync}
                        className={cn(
                            'h-11 rounded-full px-5',
                            isMidnight ? 'text-slate-400 hover:bg-white/8 hover:text-slate-200' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                        )}
                    >
                        <Cloud className="mr-2 h-4 w-4" />
                        Learn about Cloud Sync
                    </Button>
                )}

                {!onLearnAboutCloudSync && cloudSyncHref && (
                    <Link
                        href={cloudSyncHref}
                        className={cn(
                            buttonVariants({ variant: 'ghost' }),
                            'h-11 rounded-full px-5',
                            isMidnight ? 'text-slate-400 hover:bg-white/8 hover:text-slate-200' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                        )}
                    >
                        <Cloud className="mr-2 h-4 w-4" />
                        Learn about Cloud Sync
                    </Link>
                )}
            </div>
        </section>
    )
}
