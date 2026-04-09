import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PageTransition } from '../components/PageTransition'

export default function Auth() {
  const { isAuthenticated, isLoading, login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 如果已登录，重定向到首页
  if (isLoading) {
    return (
      <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/30 to-purple-50/30 dark:from-dark-900 dark:via-dark-900 dark:to-dark-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg shadow-game-500/30 animate-pulse text-white">
            🐢
          </div>
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-game-400 to-purple-400 opacity-30 blur-xl animate-pulse" />
        </div>
      </div>
      </PageTransition>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          setError('两次密码输入不一致')
          setIsSubmitting(false)
          return
        }
        if (formData.password.length < 6) {
          setError('密码长度至少6个字符')
          setIsSubmitting(false)
          return
        }
        if (formData.username.length < 3 || formData.username.length > 20) {
          setError('用户名长度应在3-20个字符之间')
          setIsSubmitting(false)
          return
        }
        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        })
      } else {
        await login({
          username: formData.username,
          password: formData.password
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/30 to-purple-50/30 dark:from-dark-900 dark:via-game-900/20 dark:to-purple-900/20 flex items-center justify-center px-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-game-500/10 to-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-game-500/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-4 group">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center text-3xl text-white shadow-lg shadow-game-500/30 group-hover:shadow-game-500/50 transition-shadow">
                🐢
              </div>
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-game-400 to-purple-400 opacity-30 blur-md -z-10 group-hover:opacity-50 transition-opacity" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {mode === 'login' ? '登录开始你的推理之旅' : '注册账号解锁更多功能'}
          </p>
        </div>

        {/* Form Card */}
        <div className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50 p-8 shadow-xl">
          {/* 装饰 */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-game-500/10 to-purple-500/10 rounded-bl-full rounded-tr-3xl" />

          {/* Tabs */}
          <div className="relative flex mb-8 bg-gray-100 dark:bg-gray-700 rounded-2xl p-1.5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                mode === 'login'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-md'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                mode === 'register'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-md'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              注册
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-scale-in">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-red-500">⚠️</span>
              </div>
              <span className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-2xl text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20 transition-all"
                placeholder="请输入用户名"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  邮箱
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-2xl text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20 transition-all"
                  placeholder="请输入邮箱"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-2xl text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20 transition-all"
                placeholder="请输入密码"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  确认密码
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-2xl text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20 transition-all"
                  placeholder="请再次输入密码"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-game-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>处理中...</span>
                </>
              ) : (
                <span>{mode === 'login' ? '登录' : '注册'}</span>
              )}
            </button>
          </form>

          {/* Tips */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {mode === 'login' ? (
                <>
                  还没有账号？
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError('') }}
                    className="text-game-500 hover:text-game-600 font-bold ml-1 transition-colors"
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已有账号？
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError('') }}
                    className="text-game-500 hover:text-game-600 font-bold ml-1 transition-colors"
                  >
                    立即登录
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm transition-colors">
            <span>←</span>
            <span>返回首页</span>
          </Link>
        </div>
      </div>
    </div>
    </PageTransition>
  )
}
