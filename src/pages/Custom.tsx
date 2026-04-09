import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { PageTransition, FadeIn } from '../components/PageTransition'

/**
 * Custom - 私人录入页面 - 游戏化风格
 */
function Custom() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [surface, setSurface] = useState('')
  const [bottom, setBottom] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>('medium')
  const [generatedLink, setGeneratedLink] = useState('')
  const [generatedStoryData, setGeneratedStoryData] = useState<object | null>(null) // 保存生成的故事数据
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = () => {
    if (!surface.trim()) {
      setError('请输入汤面')
      showToast('请输入汤面', 'error')
      return
    }
    if (!bottom.trim()) {
      setError('请输入汤底')
      showToast('请输入汤底', 'error')
      return
    }
    setError('')
    setIsGenerating(true)

    const storyData = {
      id: 'custom-' + Date.now(),
      title: title.trim() || '私人故事',
      difficulty,
      starLevel: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 3 : difficulty === 'hard' ? 4 : 5,
      surface: surface.trim(),
      bottom: bottom.trim(),
      keywords: [],
      hotScore: 0,
      playCount: 0
    }

    try {
      const encoded = btoa(encodeURIComponent(JSON.stringify(storyData)))
      const link = `${window.location.origin}/game/custom?data=${encoded}`
      // 同时保存 storyData 到 state，确保 handlePlayNow 使用最新数据
      setGeneratedLink(link)
      // 保存 storyData 以便立即游玩时使用
      setGeneratedStoryData(storyData)
      showToast('链接生成成功！', 'success')
    } catch (e) {
      setError('生成链接失败，请重试')
      showToast('生成链接失败，请重试', 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      showToast('链接已复制到剪贴板', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      const textArea = document.createElement('textarea')
      textArea.value = generatedLink
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      showToast('链接已复制到剪贴板', 'success')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePlayNow = () => {
    // 优先使用最新生成的 storyData，如果没有则从 generatedLink 解析
    if (generatedStoryData) {
      const encoded = btoa(encodeURIComponent(JSON.stringify(generatedStoryData)))
      showToast('开始游戏！', 'info')
      navigate(`/game/custom?data=${encoded}`)
    } else if (generatedLink) {
      showToast('开始游戏！', 'info')
      navigate('/game/custom?data=' + generatedLink.split('data=')[1])
    }
  }

  const difficultyOptions = [
    { key: 'easy', label: '入门', color: 'from-emerald-500', bg: 'bg-emerald-500', text: 'text-emerald-400' },
    { key: 'medium', label: '中等', color: 'from-amber-500', bg: 'bg-amber-500', text: 'text-amber-400' },
    { key: 'hard', label: '困难', color: 'from-red-500', bg: 'bg-red-500', text: 'text-red-400' },
    { key: 'extreme', label: '极难', color: 'from-purple-500', bg: 'bg-purple-500', text: 'text-purple-400' }
  ]

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/20 to-purple-50/20 dark:from-dark-900 dark:via-game-900/10 dark:to-purple-900/10 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-game-500/10 to-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
        </div>

        {/* 主内容 */}
        <div className="relative z-10 max-w-xl mx-auto px-6 py-8">
          {/* 返回按钮 */}
          <FadeIn>
            <button
              onClick={() => navigate('/')}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors mb-6"
            >
              <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
              <span className="text-sm font-medium">返回大厅</span>
            </button>
          </FadeIn>

          {/* 页面标题 */}
          <FadeIn delay={50}>
            <header className="text-center mb-8">
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg shadow-game-500/30">
                  📝
                </div>
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-game-400 to-purple-400 opacity-30 blur-xl -z-10" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                私人录入
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                输入你的汤面与汤底，生成专属链接分享给好友
              </p>
            </header>
          </FadeIn>

          {/* 表单区域 */}
          <FadeIn delay={100}>
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50 p-6 mb-6 shadow-lg">
              {/* 标题 */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  标题 <span className="text-gray-400 text-xs">(选填)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给你的故事起个名字"
              className="w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20 transition-all"
            />
          </div>

          {/* 难度选择 */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">难度</label>
            <div className="grid grid-cols-4 gap-2">
              {difficultyOptions.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDifficulty(d.key as typeof difficulty)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                    difficulty === d.key
                      ? `bg-gradient-to-br ${d.color} to-white/20 text-white shadow-lg`
                      : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* 汤面 */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              汤面 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              placeholder="输入你的故事背景/谜面..."
              rows={4}
              className="w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20 transition-all resize-none"
            />
          </div>

          {/* 汤底 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              汤底 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={bottom}
              onChange={(e) => setBottom(e.target.value)}
              placeholder="输入真相/答案..."
              rows={4}
              className="w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20 transition-all resize-none"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center font-medium animate-scale-in">
              {error}
            </div>
          )}

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-4 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                       text-white font-bold rounded-xl shadow-lg shadow-game-500/30
                       transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <span>🔗</span>
                <span>生成分享链接</span>
              </>
            )}
          </button>
        </div>
          </FadeIn>

        {/* 分享链接区域 */}
        {generatedLink && (
          <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-game-500/30 p-6 mb-6 shadow-lg animate-scale-in">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span>📤</span>
              <span>分享链接</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={generatedLink}
                readOnly
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl text-gray-700 dark:text-gray-200 text-sm truncate"
              />
              <button
                onClick={handleCopy}
                className={`px-5 py-3 rounded-xl text-sm font-bold transition-all shrink-0 ${
                  copied
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                    : 'bg-gradient-to-r from-game-500 to-purple-600 text-white hover:from-game-600 hover:to-purple-700 shadow-lg'
                }`}
              >
                {copied ? '✓ 已复制' : '复制'}
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-3 text-center">
              复制链接发送给好友，好友打开即可开始游戏
            </p>

            {/* 立即游玩按钮 */}
            <button
              onClick={handlePlayNow}
              className="w-full mt-4 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400
                         text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              <span>🎮</span>
              <span>立即游玩</span>
            </button>
          </div>
        )}

        {/* 提示信息 */}
          <FadeIn delay={300}>
            <div className="bg-white/50 dark:bg-dark-800/50 backdrop-blur rounded-2xl p-5 border border-gray-200/50 dark:border-dark-700/50">
              <h3 className="text-gray-900 dark:text-white text-sm font-bold mb-3 flex items-center gap-2">
                <span className="text-xl">💡</span>
                <span>温馨提示</span>
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-game-500 mt-0.5">—</span>
                  <span>汤面是你想让大家猜测的故事背景，越有趣越能勾起好奇心</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-game-500 mt-0.5">—</span>
                  <span>汤底是真相答案，玩家通过提问来还原真相</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-game-500 mt-0.5">—</span>
                  <span>好的海龟汤应该有逻辑自洽的答案，避免出现悖论</span>
                </li>
              </ul>
            </div>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  )
}

export default Custom
