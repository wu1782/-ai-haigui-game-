import { createContext, useState, useCallback, useRef, useContext, type ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  hideToast: (id: string) => void
}

export const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: Toast = { id, message, type }

    setToasts(prev => [...prev, newToast])

    // 清除已存在的同名timeout
    const existingTimeout = timeoutRefs.current.get(id)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // 自动消失（3秒）
    const timeout = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timeoutRefs.current.delete(id)
    }, 3000)
    timeoutRefs.current.set(id, timeout)
  }, [])

  const hideToast = useCallback((id: string) => {
    const timeout = timeoutRefs.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeoutRefs.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
