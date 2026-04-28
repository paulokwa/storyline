'use client'

import Link from 'next/link'
import { HardDrive, Upload, Cloud, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    return (
        <section
            className={cn(
                'relative rounded-[1.75rem] border border-[#d9e1d5] bg-[linear-gradient(135deg,#fbf9f5_0%,#f5f4ef_60%,#eef4ed_100%)] p-5 text-left shadow-[0_18px_50px_rgba(84,99,84,0.08)]',
                compact ? 'max-w-xl' : 'max-w-2xl',
                className
            )}
        >
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss this reminder"
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900"
                >
                    <X className="h-4 w-4" />
                </button>
            )}

            <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-[#546354] shadow-sm">
                    <HardDrive className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-slate-900">Working on another device?</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Local projects stay on the device where they were created. To use a project on this device, save it as a .storyline file on your other device and open it here. You can also enable cloud sync for projects you want available across devices.
                    </p>
                </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {onOpenProjectFile && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onOpenProjectFile}
                        className="h-11 rounded-full border-slate-200 bg-white/85 px-5 text-slate-700 hover:bg-white"
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
                        className="h-11 rounded-full px-5 text-slate-600 hover:bg-white/60 hover:text-slate-900"
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
                            'h-11 rounded-full px-5 text-slate-600 hover:bg-white/60 hover:text-slate-900'
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
