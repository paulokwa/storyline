import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

const stableUsDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const reorder = <T>(list: T[], startIndex: number, endIndex: number): T[] => {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  return result
}

export const getUserColor = (email: string) => {
  const colors = [
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-sky-100 text-sky-700 border-sky-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'bg-orange-100 text-orange-700 border-orange-200',
    'bg-teal-100 text-teal-700 border-teal-200',
  ]
  
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

export function getNextAvailableName(baseName: string, existingNames: string[]) {
  if (!existingNames.includes(baseName)) {
    return baseName
  }

  let counter = 2
  while (existingNames.includes(`${baseName} ${counter}`)) {
    counter++
  }
  return `${baseName} ${counter}`
}

export function formatStableDate(
  value: string | Date | null | undefined,
  fallback = '—'
) {
  if (!value) {
    return fallback
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return stableUsDateFormatter.format(date)
}
