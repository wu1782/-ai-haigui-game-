import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * 错误边界组件 - 捕获子组件的JavaScript错误
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return <DefaultErrorFallback error={this.state.error} onRetry={() => this.setState({ hasError: false, error: null })} />
    }

    return this.props.children
  }
}

/**
 * 默认错误回退组件
 */
function DefaultErrorFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center p-6">
      <div className="text-center max-w-md w-full">
        {/* 错误图标 */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center">
            <span className="text-5xl">😵</span>
          </div>
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-red-400/20 to-rose-400/20 blur-xl -z-10" />
        </div>

        {/* 错误标题 */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          出错了
        </h1>

        {/* 错误信息 */}
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          抱歉，页面出现了一些问题
        </p>
        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl p-3 mb-6 break-all">
            {error.message || '未知错误'}
          </p>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-game-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>🔄</span>
            <span>重试</span>
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-white/80 dark:bg-dark-800/80 hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl border border-gray-200 dark:border-dark-700 transition-all flex items-center justify-center gap-2"
          >
            <span>🏠</span>
            <span>返回首页</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 页面级错误状态组件
 */
interface PageErrorStateProps {
  title?: string
  message?: string
  error?: Error | null
  onRetry?: () => void
}

export function PageErrorState({
  title = '出错了',
  message = '加载数据时出现问题',
  error,
  onRetry
}: PageErrorStateProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="text-center max-w-md w-full">
        {/* 错误图标 */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center">
            <span className="text-4xl">⚠️</span>
          </div>
        </div>

        {/* 错误标题 */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h2>

        {/* 错误信息 */}
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {message}
        </p>

        {error && (
          <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg p-2 mb-4 break-all text-left">
            {error.message || '未知错误'}
          </p>
        )}

        {/* 重试按钮 */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-5 py-2.5 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-game-500/30 transition-all active:scale-95 inline-flex items-center gap-2"
          >
            <span>🔄</span>
            <span>重试</span>
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * 简化版错误状态（无图标）
 */
export function SimpleErrorState({
  message,
  onRetry
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="text-center py-8">
      <p className="text-red-500 dark:text-red-400 text-sm mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-game-500 hover:text-game-600 font-medium text-sm transition-colors"
        >
          点击重试
        </button>
      )}
    </div>
  )
}
