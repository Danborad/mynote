import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    // 主题模式: 'light' | 'dark' | 'system'
    const [themeMode, setThemeMode] = useState(() => {
        return localStorage.getItem('themeMode') || 'system'
    })

    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('themeMode')
        if (saved === 'dark') return true
        if (saved === 'light') return false
        // 跟随系统
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    })

    // 监听系统主题变化
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const handleChange = (e) => {
            if (themeMode === 'system') {
                setIsDark(e.matches)
            }
        }

        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [themeMode])

    // 应用主题
    useEffect(() => {
        const root = document.documentElement
        if (isDark) {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
    }, [isDark])

    // 切换主题模式
    const setTheme = (mode) => {
        setThemeMode(mode)
        localStorage.setItem('themeMode', mode)

        if (mode === 'dark') {
            setIsDark(true)
        } else if (mode === 'light') {
            setIsDark(false)
        } else {
            // system
            setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
        }
    }

    // 简单切换 (light <-> dark)
    const toggleTheme = () => {
        if (isDark) {
            setTheme('light')
        } else {
            setTheme('dark')
        }
    }

    return (
        <ThemeContext.Provider value={{ isDark, themeMode, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
