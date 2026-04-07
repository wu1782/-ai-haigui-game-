import { useContext } from 'react'
import { LoadingContext } from '../context/LoadingContext'

export default function LoadingOverlay() {
  const context = useContext(LoadingContext)
  if (!context) return null
  const { isLoading, loadingMessage } = context

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-soup-600 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-soup-300 rounded-full animate-spin"></div>
        </div>
        {/* Message */}
        <p className="text-soup-200 text-sm animate-pulse">{loadingMessage}</p>
      </div>
    </div>
  )
}
