'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

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
                        'inline-flex h-12 w-full items-center justify-between gap-3 rounded-[1.35rem] border border-slate-200/80 bg-white/90 px-4 text-left text-sm font-medium text-slate-700 shadow-sm outline-none transition-all hover:border-slate-300 hover:bg-white focus-visible:ring-2 focus-visible:ring-indigo-100 disabled:pointer-events-none disabled:opacity-50',
                        triggerClassName
                    )}
                >
                    <span
                        className={cn(
                            'truncate',
                            selectedOption ? 'text-current' : 'text-slate-400',
                            valueClassName
                        )}
                    >
                        {selectedOption?.label ?? placeholder}
                    </span>
                    <ChevronDown
                        className={cn(
                            'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
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
                        'w-[max(var(--anchor-width),14rem)] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.12)]',
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
                                            ? 'cursor-not-allowed text-slate-300'
                                            : isSelected
                                                ? 'bg-slate-50 text-slate-900'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                                        itemClassName
                                    )}
                                >
                                    <span className="truncate">{option.label}</span>
                                    <Check className={cn('h-4 w-4 shrink-0 text-indigo-500', !isSelected && 'opacity-0')} />
                                </button>
                            )
                        })}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
