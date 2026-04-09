import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getLeaderboard } from '../data/leaderboard'
import { LEADERBOARD_CONFIGS } from '../types/leaderboard'
import type { LeaderboardType, LeaderboardEntry } from '../types/leaderboard'
import { PageTransition, FadeIn } from '../components/PageTransition'
import { LeaderboardItemSkeleton } from '../components'
import { EmptyLeaderboard } from '../components/EmptyState'

/**
 * 排行榜页面 - 现代游戏化风格
 */
function Leaderboard() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('fastest')
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadLeaderboard = useCallback(async (type: LeaderboardType) => {
    setIsLoading(true)
    try {
      const data = await getLeaderboard(type)
      setLeaderboardData(data)
    } catch (error) {
      console.error('加载排行榜失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLeaderboard(activeTab)
  }, [activeTab, loadLeaderboard])

  const currentConfig = LEADERBOARD_CONFIGS.find(c => c.type === activeTab)!

  // 获取前三名样式
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-amber-500/50'
      case 2: return 'bg-gradient-to-br from-gray-400/20 to-slate-400/20 border-gray-400/50'
      case 3: return 'bg-gradient-to-br from-orange-600/20 to-orange-500/20 border-orange-500/50'
      default: return 'bg-white/80 dark:bg-dark-800/80 border-gray-200/50 dark:border-dark-700/50'
    }
  }

  // 获取排名图标
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
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
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="group flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
                <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
                <span className="text-sm font-medium hidden sm:inline">返回</span>
              </Link>
              <div className="h-8 w-px bg-gray-200 dark:bg-dark-700 hidden sm:block" />
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">排行榜</h1>
            </div>
          </div>
        </header>

        {/* 主内容 */}
        <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
          {/* 页面标题 */}
          <FadeIn>
            <header className="text-center mb-8">
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/30">
                  🏆
                </div>
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-400 to-orange-400 opacity-30 blur-xl -z-10" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                排行榜
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                见证推理高手的荣耀时刻
              </p>
            </header>
          </FadeIn>

          {/* 标签切换 */}
          <FadeIn delay={100}>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {LEADERBOARD_CONFIGS.map(config => (
                <button
                  key={config.type}
                  onClick={() => setActiveTab(config.type)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                    ${activeTab === config.type
                      ? 'bg-gradient-to-r from-game-500 to-purple-600 text-white shadow-lg shadow-game-500/30'
                      : 'bg-white/80 dark:bg-dark-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 border border-gray-200/50 dark:border-dark-700/50'
                    }`}
                >
                  <span className="mr-1">{config.icon}</span>
                  {config.title}
                </button>
              ))}
            </div>
          </FadeIn>

          {/* 排行榜说明 */}
          <FadeIn delay={150}>
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-5 mb-6 border border-gray-200/50 dark:border-dark-700/50 shadow-lg">
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">{currentConfig.icon}</span>
                <div className="text-center">
                  <div className="font-bold text-gray-900 dark:text-white">{currentConfig.title}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{currentConfig.description}</div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* 刷新按钮 */}
          <FadeIn delay={200}>
            <div className="flex justify-center mb-4">
              <button
                onClick={() => loadLeaderboard(activeTab)}
                disabled={isLoading}
                className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-game-500 dark:hover:text-game-400 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
                {isLoading ? '加载中...' : '刷新'}
              </button>
            </div>
          </FadeIn>

          {/* 排行榜列表 */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <LeaderboardItemSkeleton key={i} index={i} />
                ))}
              </div>
            ) : leaderboardData.length === 0 ? (
              <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50">
                <EmptyLeaderboard onRefresh={() => loadLeaderboard(activeTab)} />
              </div>
            ) : (
              leaderboardData.map((entry, index) => (
                <div
                  key={`${entry.rank}-${index}`}
                  className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl border transition-all duration-200
                    hover:scale-[1.01] hover:shadow-lg animate-fade-in-up ${getRankStyle(entry.rank)}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* 排名 */}
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-lg border-2
                    ${entry.rank === 1 ? 'border-amber-500 bg-gradient-to-br from-amber-500/30 to-yellow-500/30'
                      : entry.rank === 2 ? 'border-gray-400 bg-gradient-to-br from-gray-400/30 to-slate-400/30'
                      : entry.rank === 3 ? 'border-orange-500 bg-gradient-to-br from-orange-500/30 to-orange-400/30'
                      : 'border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-600 dark:text-gray-300'}`}>
                    {entry.rank <= 3 ? getRankIcon(entry.rank) : (
                      <span className="text-sm font-bold">{entry.rank}</span>
                    )}
                  </div>

                  {/* 玩家信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white truncate">
                        {entry.playerName}
                      </span>
                      {entry.rank <= 3 && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                          TOP {entry.rank}
                        </span>
                      )}
                    </div>
                    {entry.storyTitle && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        《{entry.storyTitle}》
                      </div>
                    )}
                  </div>

                  {/* 数值 */}
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {entry.value}
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{currentConfig.unit}</span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {entry.date}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 底部提示 */}
          <FadeIn delay={300}>
            <div className="mt-8 text-center p-4 bg-white/50 dark:bg-dark-800/50 backdrop-blur rounded-2xl border border-gray-200/50 dark:border-dark-700/50">
              <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center gap-2">
                <span>💡</span>
                <span>排行榜每局游戏结束后自动更新</span>
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">保持连胜，你也能上榜！</p>
            </div>
          </FadeIn>
        </main>
      </div>
    </PageTransition>
  )
}

export default Leaderboard
