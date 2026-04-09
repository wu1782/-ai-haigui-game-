/**
 * Statistics - 游戏统计页面
 */
import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useAnalytics, formatGameTime, getDifficultyLabel } from '../hooks/useAnalytics'
import { PageTransition, FadeIn } from '../components/PageTransition'
import { AchievementCardSkeleton } from '../components'

/**
 * 统计卡片组件
 */
const StatCard = memo(function StatCard({
  icon,
  label,
  value,
  subValue,
  color = 'from-game-500 to-purple-500'
}: {
  icon: string
  label: string
  value: string | number
  subValue?: string
  color?: string
}) {
  return (
    <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-xl shadow-lg`}>
          {icon}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
      {subValue && <div className="text-xs text-gray-400">{subValue}</div>}
    </div>
  )
})

/**
 * 难度分布饼图（简单版）
 */
const DifficultyChart = memo(function DifficultyChart({
  breakdown
}: {
  breakdown: Record<string, { total: number; wins: number; winRate: number }>
}) {
  const difficulties = ['easy', 'medium', 'hard', 'extreme'] as const
  const colors = {
    easy: 'bg-emerald-500',
    medium: 'bg-amber-500',
    hard: 'bg-red-500',
    extreme: 'bg-purple-500'
  }

  const total = Object.values(breakdown).reduce((sum, d) => sum + d.total, 0)

  return (
    <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">难度分布</h3>

      <div className="space-y-3">
        {difficulties.map((diff) => {
          const data = breakdown[diff]
          if (!data || data.total === 0) return null
          const percentage = Math.round((data.total / total) * 100)

          return (
            <div key={diff}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {getDifficultyLabel(diff)}
                </span>
                <span className="text-xs text-gray-500">
                  {data.total}场 ({percentage}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-dark-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors[diff]} rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                胜率: {data.winRate}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

/**
 * 趋势图（简单版）
 */
const TrendChart = memo(function TrendChart({
  data
}: {
  data: number[]
}) {
  const maxValue = 100
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * 100
    const y = 100 - value
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">近期趋势</h3>

      <div className="h-32 relative">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* 背景网格 */}
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
          <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />

          {/* 趋势线 */}
          {data.length > 1 && (
            <polyline
              fill="none"
              stroke="url(#trendGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          )}

          {/* 渐变填充 */}
          {data.length > 1 && (
            <defs>
              <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
          )}
        </svg>

        {/* Y轴标签 */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-gray-400 -ml-2">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
      </div>

      <div className="text-xs text-gray-400 text-center mt-2">
        最近 {data.length} 场胜率走向
      </div>
    </div>
  )
})

/**
 * 游戏时长分布
 */
const TimeDistribution = memo(function TimeDistribution({
  distribution
}: {
  distribution: number[]
}) {
  const ranges = ['<1min', '1-2min', '2-5min', '5-10min', '10-15min', '15-20min', '>20min']
  const maxValue = Math.max(...distribution, 1)

  return (
    <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">游戏时长分布</h3>

      <div className="flex items-end justify-between gap-1 h-24">
        {distribution.map((value, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-gradient-to-t from-game-500/30 to-purple-500/30 rounded-t"
              style={{ height: `${(value / maxValue) * 100}%` }}
            />
            <span className="text-[8px] text-gray-400">{ranges[index]}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

/**
 * Statistics - 统计页面
 */
export default function Statistics() {
  const analytics = useAnalytics()

  if (analytics.totalGames === 0) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
          <header className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50 sticky top-0 z-20">
            <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl px-3 py-2 transition-colors"
              >
                <span>←</span>
                <span>返回</span>
              </Link>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">游戏统计</h1>
              <div className="w-20" />
            </div>
          </header>

          <main className="max-w-4xl mx-auto px-6 py-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-dark-800 flex items-center justify-center">
              <span className="text-4xl">📊</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">暂无游戏数据</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              开始游戏后，这里将展示你的游戏统计
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-game-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:from-game-600 hover:to-purple-700 transition-all"
            >
              <span>开始游戏</span>
              <span>→</span>
            </Link>
          </main>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        {/* 头部 */}
        <header className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50 sticky top-0 z-20">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-xl px-3 py-2 transition-colors"
            >
              <span>←</span>
              <span>返回</span>
            </Link>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">游戏统计</h1>
            <div className="w-20" />
          </div>
        </header>

        {/* 主内容 */}
        <main className="max-w-4xl mx-auto px-6 py-8">
          {/* 概览卡片 */}
          <FadeIn>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon="🎮"
                label="总场次"
                value={analytics.totalGames}
                subValue={`胜 ${analytics.totalWins} / 负 ${analytics.totalLosses}`}
                color="from-blue-500 to-cyan-500"
              />
              <StatCard
                icon="🏆"
                label="胜率"
                value={`${analytics.winRate}%`}
                subValue={`${analytics.totalWins} 胜场`}
                color="from-emerald-500 to-teal-500"
              />
              <StatCard
                icon="❓"
                label="平均提问"
                value={analytics.averageQuestions}
                subValue="次/局"
                color="from-amber-500 to-orange-500"
              />
              <StatCard
                icon="⏱️"
                label="平均时长"
                value={formatGameTime(analytics.averageTimePerGame)}
                subValue="每局"
                color="from-purple-500 to-pink-500"
              />
            </div>
          </FadeIn>

          {/* 最佳表现 */}
          {analytics.bestPerformance && (
            <FadeIn delay={100}>
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 rounded-2xl border border-amber-500/20 p-5 mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">⭐</span>
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">最佳表现</span>
                </div>
                <p className="text-gray-900 dark:text-white font-bold text-lg">
                  仅用 {analytics.bestPerformance.questions} 次提问破案
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(analytics.bestPerformance.date).toLocaleDateString()}
                </p>
              </div>
            </FadeIn>
          )}

          {/* 图表区域 */}
          <FadeIn delay={200}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* 难度分布 */}
              <DifficultyChart breakdown={analytics.difficultyBreakdown} />

              {/* 趋势图 */}
              <TrendChart data={analytics.recentTrend} />
            </div>
          </FadeIn>

          {/* 时长分布 */}
          <FadeIn delay={300}>
            <div className="mb-8">
              <TimeDistribution distribution={analytics.playingTimeDistribution} />
            </div>
          </FadeIn>

          {/* 成就进度 */}
          <FadeIn delay={400}>
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">成就进度</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(analytics.achievementProgress).map(([id, progress]) => (
                  <div key={id} className="text-center">
                    <div className="relative w-12 h-12 mx-auto mb-2">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="currentColor"
                          strokeOpacity="0.1"
                          strokeWidth="4"
                          fill="none"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${progress * 1.26} 126`}
                          className="text-amber-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-900 dark:text-white">
                        {Math.round(progress)}%
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {id === 'first_win' && '首胜'}
                      {id === 'streak_3' && '三连胜'}
                      {id === 'streak_5' && '五连胜'}
                      {id === 'hard_mode' && '困难通关'}
                      {id === 'perfect_game' && '完美破案'}
                      {id === 'dedicated_player' && '资深玩家'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* 最喜欢难度 */}
          {analytics.favoriteDifficulty && (
            <FadeIn delay={500}>
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  你最喜欢挑战 <span className="font-bold text-gray-900 dark:text-white">{getDifficultyLabel(analytics.favoriteDifficulty)}</span> 难度
                </p>
              </div>
            </FadeIn>
          )}
        </main>
      </div>
    </PageTransition>
  )
}
