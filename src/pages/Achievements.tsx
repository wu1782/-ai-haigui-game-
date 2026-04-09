import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getUserStats } from '../data/userData'
import { ACHIEVEMENTS, RANKS } from '../types'
import { PageTransition, FadeIn } from '../components/PageTransition'
import { NoAchievementsEmpty, AllAchievementsUnlockedEmpty } from '../components/EmptyState'

/**
 * 荣誉墙页面 - 现代游戏化风格
 */
function Achievements() {
  const stats = getUserStats()
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')

  const currentRank = RANKS.find(r => r.level === stats.rank) || RANKS[0]
  const nextRank = RANKS.find(r => r.level === stats.rank + 1)

  // 计算下一个成就
  const nextAchievement = useMemo(() => {
    return ACHIEVEMENTS.find(a => !stats.achievements.includes(a.id))
  }, [stats.achievements])

  // 过滤成就
  const filteredAchievements = useMemo(() => {
    switch (filter) {
      case 'unlocked':
        return ACHIEVEMENTS.filter(a => stats.achievements.includes(a.id))
      case 'locked':
        return ACHIEVEMENTS.filter(a => !stats.achievements.includes(a.id))
      default:
        return ACHIEVEMENTS
    }
  }, [filter, stats.achievements])

  // 成就解锁进度
  const unlockProgress = (stats.achievements.length / ACHIEVEMENTS.length) * 100

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
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">荣誉墙</h1>
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
                  🎖️
                </div>
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-400 to-orange-400 opacity-30 blur-xl -z-10" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                荣誉墙
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                记录你的推理荣耀
              </p>
            </header>
          </FadeIn>

          {/* 用户等级卡片 */}
          <FadeIn delay={100}>
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl p-6 mb-6 border border-gray-200/50 dark:border-dark-700/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-game-500/30 to-purple-500/30 border-2 border-game-500/50 flex items-center justify-center text-3xl shadow-lg">
                    {currentRank.icon}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{currentRank.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">等级 {currentRank.level}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {stats.totalWins} 胜场 · 胜率 {stats.winRate}%
                    </div>
                  </div>
                </div>

                {nextRank && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">距离 {nextRank.title}</div>
                    <div className="text-game-500 font-bold">
                      {nextRank.minWins - stats.totalWins} 胜场
                    </div>
                  </div>
                )}
              </div>

              {/* 等级进度条 */}
              {nextRank && (
                <div className="mt-4">
                  <div className="h-2.5 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-game-500 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((stats.totalWins / nextRank.minWins) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </FadeIn>

          {/* 成就总览 */}
          <FadeIn delay={150}>
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-5 mb-6 border border-gray-200/50 dark:border-dark-700/50 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-900 dark:text-white font-bold">成就进度</span>
                <span className="text-game-500 font-bold">
                  {stats.achievements.length} / {ACHIEVEMENTS.length}
                </span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${unlockProgress}%` }}
                />
              </div>
            </div>
          </FadeIn>

          {/* 筛选标签 */}
          <FadeIn delay={200}>
            <div className="flex justify-center gap-2 mb-6">
              {[
                { key: 'all', label: '全部', count: ACHIEVEMENTS.length },
                { key: 'unlocked', label: '已解锁', count: stats.achievements.length },
                { key: 'locked', label: '未解锁', count: ACHIEVEMENTS.length - stats.achievements.length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as typeof filter)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                    ${filter === key
                      ? 'bg-gradient-to-r from-game-500 to-purple-600 text-white shadow-lg shadow-game-500/30'
                      : 'bg-white/80 dark:bg-dark-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 border border-gray-200/50 dark:border-dark-700/50'
                    }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </FadeIn>

          {/* 下一个可解锁成就提示 */}
          {nextAchievement && filter === 'all' && (
            <FadeIn delay={250}>
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-4 mb-6 border border-amber-500/30 shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎯</span>
                  <div>
                    <div className="text-sm text-amber-500 font-bold">下一个目标</div>
                    <div className="text-gray-900 dark:text-white font-bold">{nextAchievement.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{nextAchievement.description}</div>
                  </div>
                </div>
              </div>
            </FadeIn>
          )}

          {/* 成就网格 */}
          <FadeIn delay={300}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredAchievements.length === 0 ? (
                filter === 'unlocked' ? (
                  <div className="col-span-full">
                    <NoAchievementsEmpty />
                  </div>
                ) : filter === 'locked' ? (
                  <div className="col-span-full">
                    <AllAchievementsUnlockedEmpty />
                  </div>
                ) : null
              ) : (
                filteredAchievements.map((achievement, index) => {
                  const isUnlocked = stats.achievements.includes(achievement.id)
                  return (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 text-center animate-fade-in-up
                        ${isUnlocked
                          ? 'bg-white/80 dark:bg-dark-800/80 border-amber-500/30 hover:border-amber-500/50 hover:shadow-lg hover:scale-[1.02]'
                          : 'bg-white/50 dark:bg-dark-800/50 border-gray-200/50 dark:border-dark-700/50 opacity-60'
                        }`}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center text-2xl mb-3
                        ${isUnlocked
                          ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/50 shadow-lg'
                          : 'bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600'
                        }`}>
                        {achievement.icon}
                      </div>
                      <div className={`font-bold text-sm mb-1 ${isUnlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                        {achievement.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {achievement.description}
                      </div>
                      {isUnlocked && (
                        <div className="mt-2 text-xs text-amber-500 font-bold">✓ 已解锁</div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </FadeIn>

          {/* 统计卡片 */}
          <FadeIn delay={350}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              {[
                { label: '总游戏', value: stats.totalGames, icon: '🎮', color: 'from-game-500' },
                { label: '胜利', value: stats.totalWins, icon: '🏆', color: 'from-amber-500' },
                { label: '最高连胜', value: stats.bestStreak, icon: '🔥', color: 'from-red-500' },
                { label: '完美破案', value: stats.perfectGames, icon: '🧠', color: 'from-purple-500' },
              ].map(({ label, value, icon, color }) => (
                <div
                  key={label}
                  className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-dark-700/50 text-center hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${color} to-white/20 flex items-center justify-center text-2xl mb-2 shadow-lg`}>
                    {icon}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </main>
      </div>
    </PageTransition>
  )
}

export default Achievements
