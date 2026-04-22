'use client'

import type { MouseEventHandler } from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const baseButtonClassName =
    'flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200/80 bg-white/95 text-slate-400 shadow-sm transition-all duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 active:scale-95 lg:h-9 lg:w-9 xl:h-8 xl:w-8'

const baseIconClassName = 'h-4 w-4 lg:h-4 lg:w-4 xl:h-3.5 xl:w-3.5'

export function ItemRowActionButton({
    label,
    icon: Icon,
    onClick,
    className,
    iconClassName
}: {
    label: string
    icon: LucideIcon
    onClick: MouseEventHandler<HTMLButtonElement>
    className?: string
    iconClassName?: string
}) {
    return (
        <Tooltip>
            <TooltipTrigger>
                <button
                    type="button"
                    aria-label={label}
                    onClick={onClick}
                    className={cn(baseButtonClassName, className)}
                >
                    <Icon className={cn(baseIconClassName, iconClassName)} />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top">{label}</TooltipContent>
        </Tooltip>
    )
}
