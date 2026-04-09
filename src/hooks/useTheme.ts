/**
 * 主题切换 Hook - 支持系统主题跟随
 */
import { useState, useEffect, useCallback } from 'react'
import { getUserSettings, saveUserSettings } from '../data/userData'

type Theme = 'dark' | 'light' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')

  // 获取系统主题
  const getSystemTheme = useCallback((): 'dark' | 'light' => {
    if (typeof window === 'undefined') return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [])

  // 应用主题到 DOM
  const applyTheme = useCallback((newTheme: 'dark' | 'light') => {
    const root = document.documentElement
    if (newTheme === 'light') {
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
    }
    setResolvedTheme(newTheme)
  }, [])

  // 初始化主题
  useEffect(() => {
    const settings = getUserSettings()
    setTheme(settings.theme || 'dark')

    // 如果是 system 主题，监听系统变化
    if (settings.theme === 'system') {
      const systemTheme = getSystemTheme()
      applyTheme(systemTheme)
    } else {
      applyTheme(settings.theme as 'dark' | 'light')
    }
  }, [applyTheme, getSystemTheme])

  // 监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light'
      applyTheme(newTheme)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme, applyTheme])

  // 切换主题（仅在 light/dark 间切换）
  const toggleTheme = useCallback(() => {
    const currentResolved = theme === 'system' ? getSystemTheme() : theme
    const newTheme: Theme = currentResolved === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    applyTheme(newTheme)

    const settings = getUserSettings()
    saveUserSettings({ ...settings, theme: newTheme })
  }, [theme, applyTheme, getSystemTheme])

  // 手动设置主题
  const setThemePreference = useCallback((newTheme: Theme) => {
    setTheme(newTheme)

    if (newTheme === 'system') {
      const systemTheme = getSystemTheme()
      applyTheme(systemTheme)
    } else {
      applyTheme(newTheme)
    }

    const settings = getUserSettings()
    saveUserSettings({ ...settings, theme: newTheme })
  }, [applyTheme, getSystemTheme])

  // 获取主题选项
  const getThemeOptions = useCallback(() => [
    { value: 'light', label: '浅色', icon: '☀️' },
    { value: 'dark', label: '深色', icon: '🌙' },
    { value: 'system', label: '跟随系统', icon: '💻' }
  ], [])

  return {
    theme,
    resolvedTheme,
    toggleTheme,
    setThemePreference,
    getThemeOptions,
    isSystemTheme: theme === 'system'
  }
}
