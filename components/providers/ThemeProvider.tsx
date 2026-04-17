'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export const DEFAULT_THEME = 'sanctuary' as const

type Theme = typeof DEFAULT_THEME

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme')

        if (savedTheme !== DEFAULT_THEME) {
            localStorage.setItem('theme', DEFAULT_THEME)
        }

        document.documentElement.setAttribute('data-theme', DEFAULT_THEME)
    }, [])

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
