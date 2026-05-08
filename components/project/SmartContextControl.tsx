'use client'

import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

type SmartContextControlProps = {
    included: boolean
    onIncludedChange: (included: boolean) => void
    disabled?: boolean
    className?: string
}

export function SmartContextControl({
    included,
    onIncludedChange,
    disabled = false,
    className,
}: SmartContextControlProps) {
    return (
        <div
            className={cn(
                "rounded-[1.5rem] border px-5 py-4 shadow-sm transition-colors sm:px-6",
                included
                    ? "border-[#d6e4d4] bg-[#eef4ed]/70"
                    : "border-amber-200 bg-amber-50/70",
                disabled && "opacity-60",
                className
            )}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#546354]">
                            Include in Smart Context
                        </span>
                        <span
                            className={cn(
                                "rounded-full border px-2.5 py-1 text-[10px] font-bold",
                                included
                                    ? "border-[#c8d8c6] bg-white/75 text-[#546354]"
                                    : "border-amber-200 bg-white/75 text-amber-700"
                            )}
                        >
                            {included ? 'Included in Smart Context' : 'Excluded from Smart Context'}
                        </span>
                    </div>
                    <p className="text-xs leading-relaxed text-stone-500">
                        Controls whether Smart Context can include this item. Manual scene links are unchanged.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-3 self-start sm:self-center">
                    <span className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", included ? "text-[#546354]" : "text-amber-700")}>
                        {included ? 'On' : 'Off'}
                    </span>
                    <Switch
                        checked={included}
                        onCheckedChange={onIncludedChange}
                        disabled={disabled}
                        aria-label="Include in Smart Context"
                        className={cn(
                            "cursor-pointer border shadow-inner after:-inset-x-4 after:-inset-y-3",
                            included
                                ? "border-[#546354]/20 data-checked:bg-[#546354]"
                                : "border-amber-300 data-unchecked:bg-amber-200"
                        )}
                    />
                </div>
            </div>
        </div>
    )
}
