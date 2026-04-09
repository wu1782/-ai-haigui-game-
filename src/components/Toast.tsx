import { useContext } from 'react'
import { ToastContext, type Toast as ToastType } from '../context/ToastContext'

const typeStyles = {
  success: 'bg-gradient-to-r from-emerald-500/95 to-teal-500/95 border-emerald-400/50 text-white',
  error: 'bg-gradient-to-r from-red-500/95 to-rose-500/95 border-red-400/50 text-white',
  info: 'bg-gradient-to-r from-game-500/95 to-purple-500/95 border-game-400/50 text-white'
}

const typeIcons = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ToastItem({ toast, onClose }: { toast: ToastType; onClose: () => void }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl animate-slide-up ${typeStyles[toast.type]}`}
    >
      {typeIcons[toast.type]}
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        aria-label="关闭"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function Toast() {
  const context = useContext(ToastContext)
  if (!context) return null
  const { toasts, hideToast } = context

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast: ToastType) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            toast={toast}
            onClose={() => hideToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}
