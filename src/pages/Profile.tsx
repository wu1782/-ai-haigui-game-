import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Avatar from '../components/Avatar'
import { PageTransition } from '../components/PageTransition'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export default function Profile() {
  const { user, updateProfile, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [username, setUsername] = useState(user?.username || '')
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatar)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!user) {
    navigate('/auth')
    return null
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('头像上传失败：仅支持 JPG、PNG、GIF、WebP 格式')
      setAvatarPreview(user?.avatar)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      setError(`头像上传失败：图片大小（${sizeMB}MB）超过 2MB 限制`)
      setAvatarPreview(user?.avatar)
      return
    }

    if (file.size === 0) {
      setError('头像上传失败：文件为空或已损坏')
      setAvatarPreview(user?.avatar)
      return
    }

    const reader = new FileReader()

    reader.onload = (event) => {
      const base64 = event.target?.result as string

      if (!base64 || !base64.startsWith('data:image')) {
        setError('头像上传失败：图片格式无效，请重新选择')
        setAvatarPreview(user?.avatar)
        return
      }

      setAvatarPreview(base64)
      setError('')
    }

    reader.onerror = () => {
      setError('头像上传失败：文件读取出错，请重试')
      setAvatarPreview(user?.avatar)
    }

    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!username.trim()) {
      setError('用户名不能为空')
      return
    }

    if (username.length < 3 || username.length > 20) {
      setError('用户名长度应在 3-20 个字符之间')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      await updateProfile({
        username: username.trim(),
        avatar: avatarPreview
      })
      setSuccess('保存成功')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/20 to-purple-50/20 dark:from-dark-900 dark:via-game-900/10 dark:to-purple-900/10 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-game-500/10 to-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* 顶部导航 */}
      <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="group flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
              <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
              <span className="text-sm font-medium hidden sm:inline">返回</span>
            </Link>
            <div className="h-8 w-px bg-gray-200 dark:bg-dark-700 hidden sm:block" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">个人资料</h1>
          </div>
        </div>
      </header>

      {/* 内容 */}
      <main className="relative max-w-md mx-auto px-6 py-8">
        {/* 头像卡片 */}
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50 p-8 mb-5 shadow-xl">
          <div className="flex flex-col items-center">
            {/* 头像 */}
            <div
              className="relative cursor-pointer group"
              onClick={handleAvatarClick}
            >
              <Avatar
                src={avatarPreview}
                username={username}
                size="2xl"
                className="group-hover:opacity-80 transition-all"
              />
              {/* 悬停遮罩 */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">更换</span>
                </div>
              </div>
              {/* 相机图标 */}
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center shadow-lg border-4 border-white dark:border-dark-800">
                <span className="text-white text-sm">📷</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-6">点击头像更换照片</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">支持 JPG、PNG、GIF、WebP，最大 2MB</p>
          </div>
        </div>

        {/* 用户名卡片 */}
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50 p-6 mb-5 shadow-xl">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">用户名</label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20 transition-all"
              placeholder="请输入用户名"
              maxLength={20}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {username.length}/20
            </div>
          </div>
          <p className="text-gray-400 text-xs mt-2">3-20 个字符</p>
        </div>

        {/* 消息提示 */}
        {error && (
          <div className="mb-5 p-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-scale-in">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-red-500">⚠️</span>
            </div>
            <span className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-5 p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 animate-scale-in">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-500">✓</span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">{success}</span>
          </div>
        )}

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold rounded-2xl shadow-lg shadow-game-500/30 transition-all active:scale-[0.98] disabled:shadow-none disabled:cursor-not-allowed mb-5 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>保存中...</span>
            </>
          ) : (
            <span>保存更改</span>
          )}
        </button>

        {/* 退出登录 */}
        <button
          onClick={handleLogout}
          className="w-full py-4 bg-white/80 dark:bg-dark-800/80 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl font-bold transition-all border border-gray-200/50 dark:border-dark-700/50 hover:border-red-500/30 flex items-center justify-center gap-2"
        >
          <span>🚪</span>
          <span>退出登录</span>
        </button>

        {/* 用户信息 */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-gray-500 dark:text-gray-400 text-sm">邮箱：{user.email}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs">注册时间：{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}</p>
        </div>
      </main>
    </div>
    </PageTransition>
  )
}
