/**
 * PWA Hook - 管理 Service Worker 和安装提示
 */
import { useState, useEffect, useCallback } from 'react'

interface PWAState {
  isInstalled: boolean
  isStandalone: boolean
  deferredPrompt: BeforeInstallPromptEvent | null
  updateAvailable: boolean
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isStandalone: false,
    deferredPrompt: null,
    updateAvailable: false
  })

  useEffect(() => {
    // 检查是否已安装
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInstalled = (window.navigator as any).standalone !== undefined
        ? (window.navigator as any).standalone
        : isStandalone

      setState(prev => ({
        ...prev,
        isInstalled: !!isInstalled,
        isStandalone
      }))
    }

    checkInstalled()

    // 监听安装提示事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setState(prev => ({
        ...prev,
        deferredPrompt: e as BeforeInstallPromptEvent
      }))
    }

    // 监听更新可用
    const handleUpdateAvailable = () => {
      setState(prev => ({ ...prev, updateAvailable: true }))
    }

    // 监听显示模式变化
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setState(prev => ({ ...prev, isStandalone: true }))
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('updatefound', handleUpdateAvailable)
    window.matchMedia('(display-mode: standalone)').addEventListener('change', handleDisplayModeChange)

    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('[PWA] Service Worker registered:', registration.scope)

          // 检查更新
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setState(prev => ({ ...prev, updateAvailable: true }))
                }
              })
            }
          })
        })
        .catch(err => {
          console.warn('[PWA] Service Worker registration failed:', err)
        })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('updatefound', handleUpdateAvailable)
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', handleDisplayModeChange)
    }
  }, [])

  // 触发安装提示
  const install = useCallback(async () => {
    const { deferredPrompt } = state
    if (!deferredPrompt) return false

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setState(prev => ({ ...prev, deferredPrompt: null }))
      return true
    }

    return false
  }, [state.deferredPrompt])

  // 刷新以更新
  const update = useCallback(() => {
    window.location.reload()
  }, [])

  return {
    ...state,
    canInstall: !!state.deferredPrompt && !state.isInstalled,
    install,
    update
  }
}
