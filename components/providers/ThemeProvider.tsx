'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserSafely } from '@/lib/supabase/client-auth'

export const DEFAULT_THEME = 'sanctuary' as const
export const THEMES = [DEFAULT_THEME, 'midnight'] as const

export type Theme = typeof THEMES[number]

function isTheme(value: string | null): value is Theme {
    return Boolean(value && THEMES.includes(value as Theme))
}

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)
    const [storageKey, setStorageKey] = useState<string | null>(null)

    useEffect(() => {
        const supabase = createClient()

        const applyThemeForUser = async () => {
            const { user } = await getUserSafely(supabase)
            const nextStorageKey = user ? `theme:${user.id}` : null
            const savedTheme = nextStorageKey ? localStorage.getItem(nextStorageKey) : null
            const resolvedTheme = isTheme(savedTheme) ? savedTheme : DEFAULT_THEME

            setStorageKey(nextStorageKey)
            setThemeState(resolvedTheme)
            document.documentElement.setAttribute('data-theme', resolvedTheme)
        }

        void applyThemeForUser()

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            const nextStorageKey = session?.user ? `theme:${session.user.id}` : null
            const savedTheme = nextStorageKey ? localStorage.getItem(nextStorageKey) : null
            const resolvedTheme = isTheme(savedTheme) ? savedTheme : DEFAULT_THEME

            setStorageKey(nextStorageKey)
            setThemeState(resolvedTheme)
            document.documentElement.setAttribute('data-theme', resolvedTheme)
        })

        return () => {
            authListener.subscription.unsubscribe()
        }
    }, [])

    useEffect(() => {
        if (storageKey) {
            localStorage.setItem(storageKey, theme)
        }
        document.documentElement.setAttribute('data-theme', theme)
    }, [storageKey, theme])

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
        if (storageKey) {
            localStorage.setItem(storageKey, newTheme)
        }
        document.documentElement.setAttribute('data-theme', newTheme)
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
