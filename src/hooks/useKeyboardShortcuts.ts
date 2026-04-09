/**
 * 键盘快捷键 Hook
 * 支持全局快捷键和局部快捷键
 */
import { useEffect, useCallback } from 'react'

export interface Shortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
  scope?: 'global' | 'local'  // global: 输入框中也生效, local: 仅在非输入框中生效
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: Shortcut[]
  enabled?: boolean
}

/**
 * 解析按键名称，支持 'Enter', 'Escape', '?', 'F1' 等
 */
function parseKey(key: string): { key: string; code?: string } {
  // 特殊按键映射
  const specialKeys: Record<string, string> = {
    'Enter': 'Enter',
    'Escape': 'Escape',
    'Esc': 'Escape',
    'Tab': 'Tab',
    'Space': ' ',
    'ArrowUp': 'ArrowUp',
    'ArrowDown': 'ArrowDown',
    'ArrowLeft': 'ArrowLeft',
    'ArrowRight': 'ArrowRight',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PageUp',
    'PageDown': 'PageDown',
    'Delete': 'Delete',
    'Backspace': 'Backspace'
  }

  // 如果是特殊按键，返回对应的 key
  if (specialKeys[key]) {
    return { key: specialKeys[key] }
  }

  // 如果是单字符按键，转换为小写
  if (key.length === 1) {
    return { key: key.toLowerCase() }
  }

  // 其他的（如 '?', 'F1'）直接返回
  return { key }
}

/**
 * 判断是否为输入框元素
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable
  )
}

/**
 * 键盘快捷键 Hook
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || shortcuts.length === 0) return

    for (const shortcut of shortcuts) {
      const { key } = parseKey(shortcut.key)

      // 检查按键匹配
      const keyMatch = e.key === key || e.code === key

      // 检查修饰键匹配
      const ctrlMatch = !!shortcut.ctrlKey === (e.ctrlKey || e.metaKey)
      const shiftMatch = !!shortcut.shiftKey === e.shiftKey
      const altMatch = !!shortcut.altKey === e.altKey
      const metaMatch = !!shortcut.metaKey === e.metaKey

      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        // 判断是否应该执行
        const isInput = isInputElement(e.target)

        // 全局快捷键始终生效
        if (shortcut.scope === 'global') {
          if (shortcut.preventDefault !== false) {
            e.preventDefault()
          }
          shortcut.action()
          return
        }

        // 局部快捷键在输入框中不生效
        if (!isInput) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault()
          }
          shortcut.action()
          return
        }
      }
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}

/**
 * 常用快捷键配置
 */
export const COMMON_SHORTCUTS = {
  // 游戏内快捷键
  sendMessage: (action: () => void): Shortcut => ({
    key: 'Enter',
    action,
    description: '发送问题',
    scope: 'local'
  }),

  closeModal: (action: () => void): Shortcut => ({
    key: 'Escape',
    action,
    description: '关闭弹窗/面板',
    scope: 'global',
    preventDefault: true
  }),

  showHelp: (action: () => void): Shortcut => ({
    key: '?',
    shiftKey: true,
    action,
    description: '显示帮助',
    scope: 'local'
  }),

  openCluePanel: (action: () => void): Shortcut => ({
    key: 'l',
    ctrlKey: true,
    action,
    description: '打开线索面板',
    scope: 'local'
  }),

  // 全局快捷键
  goHome: (action: () => void): Shortcut => ({
    key: 'h',
    ctrlKey: true,
    action,
    description: '返回首页',
    scope: 'global'
  }),

  search: (action: () => void): Shortcut => ({
    key: '/',
    action,
    description: '聚焦搜索框',
    scope: 'global',
    preventDefault: false
  })
}

export default useKeyboardShortcuts
