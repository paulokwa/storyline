'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

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
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === 'undefined') {
            return DEFAULT_THEME
        }

        const savedTheme = localStorage.getItem('theme')
        return isTheme(savedTheme) ? savedTheme : DEFAULT_THEME
    })

    useEffect(() => {
        localStorage.setItem('theme', theme)
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem('theme', newTheme)
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
