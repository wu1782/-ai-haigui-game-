/**
 * 主题切换 Hook
 */
import { useState, useEffect, useCallback } from 'react'
import { getUserSettings, saveUserSettings } from '../data/userData'

type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  // 初始化主题
  useEffect(() => {
    const settings = getUserSettings()
    setTheme(settings.theme)
    applyTheme(settings.theme)
  }, [])

  // 应用主题到DOM
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    if (newTheme === 'light') {
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
    }
  }

  // 切换主题
  const toggleTheme = useCallback(() => {
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    applyTheme(newTheme)

    const settings = getUserSettings()
    saveUserSettings({ ...settings, theme: newTheme })
  }, [theme])

  // 手动设置主题
  const setThemePreference = useCallback((newTheme: Theme) => {
    setTheme(newTheme)
    applyTheme(newTheme)

    const settings = getUserSettings()
    saveUserSettings({ ...settings, theme: newTheme })
  }, [])

  return { theme, toggleTheme, setThemePreference }
}
