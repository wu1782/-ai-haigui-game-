import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { generateStory } from '../services/aiService'
import type { AIGeneratedStory } from '../services/aiService'
import { DIFFICULTY_CONFIG, STORAGE_KEYS } from '../constants'

/**
 * AI生成新汤页面 - 游戏化风格
 */
function Generate() {
  const navigate = useNavigate()
  const [keywords, setKeywords] = useState<string[]>(['', '', ''])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedStory, setGeneratedStory] = useState<AIGeneratedStory | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 处理关键词输入
  const handleKeywordChange = (index: number, value: string) => {
    const newKeywords = [...keywords]
    newKeywords[index] = value.slice(0, 10)
    setKeywords(newKeywords)
    setError(null)
  }

  // 生成故事
  const handleGenerate = async () => {
    const validKeywords = keywords.filter(k => k.trim().length > 0)
    if (validKeywords.length < 3) {
      setError('请输入3个关键词')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedStory(null)

    try {
      const story = await generateStory(validKeywords)
      setGeneratedStory(story)
    } catch {
      setError('生成失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  // 开始游戏
  const handlePlay = () => {
    if (generatedStory) {
      const customStory = {
        id: `custom_${Date.now()}`,
        title: generatedStory.title,
        surface: generatedStory.surface,
        bottom: generatedStory.bottom,
        difficulty: generatedStory.difficulty <= 2 ? 'easy' : generatedStory.difficulty === 3 ? 'medium' : generatedStory.difficulty === 4 ? 'hard' : 'extreme',
        starLevel: generatedStory.difficulty,
        tags: generatedStory.tags,
        playCount: 0,
        isCustom: true
      }
      localStorage.setItem(STORAGE_KEYS.CUSTOM_STORY, JSON.stringify(customStory))
      navigate(`/game/${customStory.id}`)
    }
  }

  // 重置
  const handleReset = () => {
    setKeywords(['', '', ''])
    setGeneratedStory(null)
    setError(null)
  }

  // 获取难度标签
  const getDifficultyLabel = (level: number) => {
    if (level <= 2) return DIFFICULTY_CONFIG.easy
    if (level <= 3) return DIFFICULTY_CONFIG.medium
    if (level <= 4) return DIFFICULTY_CONFIG.hard
    return DIFFICULTY_CONFIG.extreme
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/20 to-purple-50/20 dark:from-dark-900 dark:via-game-900/10 dark:to-purple-900/10 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-game-500/10 to-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* 顶部导航 */}
      <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50">
        <div className="max-w-2xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="group flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
              <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
              <span className="text-sm font-medium hidden sm:inline">返回</span>
            </Link>
            <div className="h-8 w-px bg-gray-200 dark:bg-dark-700 hidden sm:block" />
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">AI 生成</h1>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="relative max-w-xl mx-auto px-6 py-8">
        {/* 页面标题 */}
        <header className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center text-4xl shadow-lg shadow-game-500/30">
              ✨
            </div>
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-game-400 to-purple-400 opacity-30 blur-xl -z-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            AI 生成新汤
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            输入3个关键词，AI为你创作独特海龟汤
          </p>
        </header>

        {/* 关键词输入区 */}
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50 p-6 mb-6 shadow-lg">
          <div className="flex gap-3">
            {[0, 1, 2].map(index => (
              <div key={index} className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={keywords[index]}
                    onChange={e => handleKeywordChange(index, e.target.value)}
                    placeholder={`关键词 ${index + 1}`}
                    maxLength={10}
                    disabled={isGenerating}
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl
                             text-gray-900 dark:text-white text-center placeholder-gray-400 dark:placeholder-gray-500
                             focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20
                             transition-all disabled:opacity-50 shadow-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {keywords[index].length}/10
                  </span>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center font-medium animate-scale-in">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || keywords.every(k => k.trim().length === 0)}
            className="w-full mt-4 py-4 px-6 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold rounded-xl
                     disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-game-500/30 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <span>AI创作中...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>生成故事</span>
              </>
            )}
          </button>
        </div>

        {/* 示例提示 */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-medium">试试这些组合：</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              ['医院', '时钟', '遗书'],
              ['电梯', '雨夜', '尖叫'],
              ['镜子', '彩票', '大笑']
            ].map((example, i) => (
              <button
                key={i}
                onClick={() => setKeywords(example)}
                disabled={isGenerating}
                className="px-4 py-2 text-sm bg-white/80 dark:bg-dark-800/80 backdrop-blur text-gray-600 dark:text-gray-300 rounded-xl
                         border border-gray-200/50 dark:border-dark-700/50 hover:border-game-500/30 hover:bg-game-50/50 dark:hover:bg-game-500/10 transition-all disabled:opacity-50 font-medium shadow-sm"
              >
                {example.join(' + ')}
              </button>
            ))}
          </div>
        </div>

        {/* 生成结果 */}
        {generatedStory && (
          <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50 p-6 animate-scale-in shadow-xl">
            <div className="text-center mb-5">
              <div className="relative inline-flex items-center justify-center mb-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl shadow-lg">
                  🎉
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{generatedStory.title}</h2>
            </div>

            {/* 难度和标签 */}
            <div className="flex items-center justify-center gap-3 mb-4">
              {(() => {
                const diff = getDifficultyLabel(generatedStory.difficulty)
                return (
                  <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg ${diff.bg} ${diff.text} ${diff.border} border`}>
                    {diff.label}
                  </span>
                )
              })()}
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <span
                    key={star}
                    className={`text-lg ${star <= generatedStory.difficulty ? 'text-amber-400' : 'text-gray-200 dark:text-gray-600'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            {/* 标签 */}
            <div className="flex flex-wrap justify-center gap-2 mb-5">
              {generatedStory.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1.5 text-xs bg-game-500/10 text-game-600 dark:text-game-400 rounded-lg border border-game-500/20 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* 汤面 */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-700 dark:to-dark-800 rounded-2xl p-5 mb-5 border border-gray-200/50 dark:border-dark-700/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow">📜</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">汤面</span>
              </div>
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed font-medium">{generatedStory.surface}</p>
            </div>

            {/* 汤底（可折叠） */}
            <details className="group mb-5">
              <summary className="flex items-center justify-between cursor-pointer p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/10 rounded-2xl
                                border border-red-200/50 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm list-none font-medium transition-all hover:from-red-100 hover:to-rose-100">
                <span className="flex items-center gap-2">
                  <span>🔮</span>
                  <span>查看汤底（剧透警告）</span>
                </span>
                <span className="group-open:rotate-180 transition-transform duration-300">▼</span>
              </summary>
              <div className="mt-3 p-4 bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200/50 dark:border-dark-700/50">
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{generatedStory.bottom}</p>
              </div>
            </details>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3.5 px-4 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl
                         hover:bg-gray-200 dark:hover:bg-dark-600 transition-all flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>重新生成</span>
              </button>
              <button
                onClick={handlePlay}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 text-white font-bold rounded-xl
                         transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <span>🎮</span>
                <span>开始游戏</span>
              </button>
            </div>
          </div>
        )}

        {/* 提示信息 */}
        <div className="mt-8 text-center p-4 bg-white/50 dark:bg-dark-800/50 backdrop-blur rounded-2xl border border-gray-200/50 dark:border-dark-700/50">
          <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center gap-2">
            <span>💡</span>
            <span>AI会根据你提供的关键词，创作一个逻辑自洽的海龟汤故事</span>
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">生成的故事可以直接开始游戏</p>
        </div>
      </main>
    </div>
  )
}

export default Generate
