'use client'

import { forwardRef, useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface StableInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string
  onValueChange: (value: string) => void
  debouncedMs?: number
}

/**
 * A robust input component that prevents cursor jumping by managing local state 
 * and only syncing with parent props when not focused or when props change externally.
 * Ideal for controlled inputs on mobile devices.
 */
export const StableInput = forwardRef<HTMLInputElement, StableInputProps>(
  ({ value, onValueChange, className, onFocus, onBlur, debouncedMs = 0, ...props }, ref) => {
    const [localValue, setLocalValue] = useState(value)
    const [isFocused, setIsFocused] = useState(false)
    const lastPropValue = useRef(value)

    // Sync local value with prop value when NOT focused OR when prop changed EXTERNALLY
    useEffect(() => {
      if (!isFocused || value !== lastPropValue.current) {
        setLocalValue(value)
        lastPropValue.current = value
      }
    }, [value, isFocused])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setLocalValue(newValue)
      lastPropValue.current = newValue // Mark that we know about this change
      onValueChange(newValue)
    }

    return (
      <input
        {...props}
        ref={ref}
        value={localValue}
        onChange={handleChange}
        onFocus={(e) => {
          setIsFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          onBlur?.(e)
        }}
        className={cn(className)}
      />
    )
  }
)

StableInput.displayName = 'StableInput'
