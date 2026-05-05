'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/providers/ThemeProvider'

export type SanctuarySelectOption = {
    value: string
    label: string
    disabled?: boolean
}

export function SanctuarySelect({
    id,
    name,
    value,
    options,
    placeholder = 'Select an option',
    disabled = false,
    triggerClassName,
    contentClassName,
    itemClassName,
    valueClassName,
    iconClassName,
    align = 'start',
    side = 'bottom',
    sideOffset = 8,
    onValueChange,
}: {
    id?: string
    name?: string
    value: string
    options: SanctuarySelectOption[]
    placeholder?: string
    disabled?: boolean
    triggerClassName?: string
    contentClassName?: string
    itemClassName?: string
    valueClassName?: string
    iconClassName?: string
    align?: 'start' | 'center' | 'end'
    side?: 'top' | 'bottom' | 'left' | 'right'
    sideOffset?: number
    onValueChange: (value: string) => void
}) {
    const { theme } = useTheme()
    const isMidnight = theme === 'midnight'
    const [open, setOpen] = useState(false)

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value),
        [options, value]
    )

    return (
        <>
            {name ? <input type="hidden" name={name} value={value} /> : null}
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger
                    id={id}
                    type="button"
                    disabled={disabled}
                    className={cn(
                        'inline-flex h-12 w-full items-center justify-between gap-3 rounded-[1.35rem] border px-4 text-left text-sm font-medium shadow-sm outline-none transition-all disabled:pointer-events-none disabled:opacity-50',
                        isMidnight
                            ? 'border-slate-600/40 bg-slate-800/90 text-slate-200 hover:border-slate-500/60 hover:bg-slate-700/90 focus-visible:ring-2 focus-visible:ring-slate-500/30'
                            : 'border-slate-200/80 bg-white/90 text-slate-700 hover:border-slate-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-indigo-100',
                        triggerClassName
                    )}
                >
                    <span
                        className={cn(
                            'truncate',
                            selectedOption
                                ? 'text-current'
                                : isMidnight ? 'text-slate-500' : 'text-slate-400',
                            valueClassName
                        )}
                    >
                        {selectedOption?.label ?? placeholder}
                    </span>
                    <ChevronDown
                        className={cn(
                            'h-4 w-4 shrink-0 transition-transform duration-200',
                            isMidnight ? 'text-slate-500' : 'text-slate-400',
                            open && 'rotate-180',
                            iconClassName
                        )}
                    />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align={align}
                    side={side}
                    sideOffset={sideOffset}
                    className={cn(
                        'w-[max(var(--anchor-width),14rem)] rounded-2xl border p-1.5',
                        isMidnight
                            ? 'border-slate-600/40 bg-slate-800 shadow-[0_12px_32px_rgba(0,0,0,0.35)]'
                            : 'border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)]',
                        contentClassName
                    )}
                >
                    <div className="max-h-72 overflow-y-auto">
                        {options.map((option) => {
                            const isSelected = option.value === value

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    data-selected={isSelected ? '' : undefined}
                                    disabled={option.disabled}
                                    onClick={() => {
                                        if (option.disabled) return
                                        onValueChange(option.value)
                                        setOpen(false)
                                    }}
                                    className={cn(
                                        'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
                                        option.disabled
                                            ? isMidnight
                                                ? 'cursor-not-allowed text-slate-600'
                                                : 'cursor-not-allowed text-slate-300'
                                            : isSelected
                                                ? isMidnight
                                                    ? 'bg-slate-700 text-slate-100'
                                                    : 'bg-slate-50 text-slate-900'
                                                : isMidnight
                                                    ? 'text-slate-300 hover:bg-slate-700/60 hover:text-slate-100'
                                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                                        itemClassName
                                    )}
                                >
                                    <span className="truncate">{option.label}</span>
                                    <Check className={cn('h-4 w-4 shrink-0', isMidnight ? 'text-indigo-400' : 'text-indigo-500', !isSelected && 'opacity-0')} />
                                </button>
                            )
                        })}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
