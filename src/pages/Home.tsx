import { useState, useEffect, useMemo, memo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { stories, getStoriesByLatest, getStoriesByHot, getUnplayedStories } from '../data/stories'
import GameCard from '../components/GameCard'
import type { StorySortType, GameRecord, TStory } from '../types'
import ThemeToggle from '../components/ThemeToggle'
import SoundControl from '../components/SoundControl'
import Avatar from '../components/Avatar'
import UserProfileDropdown from '../components/UserProfileDropdown'
import { getUserStats } from '../data/userData'
import { useAuth } from '../hooks/useAuth'
import { getDailyChallenge, getDailyChallengeStory } from '../data/dailyChallenge'
import FriendsDrawer from '../components/FriendsDrawer'
import { DIFFICULTY_CONFIG, STORAGE_KEYS } from '../constants'
import { PageErrorState } from '../components'
import { FadeIn, PageTransition } from '../components/PageTransition'
import type { Difficulty } from '../constants'

/**
 * 从localStorage获取已玩记录
 */
const getPlayedRecords = (): GameRecord[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.RECORDS)
    return saved ? JSON.parse(saved) : []
  } catch (e) {
    console.error('Failed to load played records:', e)
    return []
  }
}

/**
 * 获取已玩过的故事ID列表
 */
const getPlayedStoryIds = (): string[] => {
  return getPlayedRecords().map(r => r.storyId)
}

/**
 * 案例横向滚动卡片
 */
const CaseFileCard = memo(function CaseFileCard({ story, index, isPlayed }: { story: TStory; index: number; isPlayed: boolean }) {
  const navigate = useNavigate()
  const diff = DIFFICULTY_CONFIG[story.difficulty]

  // 卡片主题色
  const themeColors = [
    { from: 'from-rose-500', to: 'to-pink-500', ring: 'ring-rose-500/30' },
    { from: 'from-blue-500', to: 'to-cyan-500', ring: 'ring-blue-500/30' },
    { from: 'from-emerald-500', to: 'to-teal-500', ring: 'ring-emerald-500/30' },
    { from: 'from-amber-500', to: 'to-orange-500', ring: 'ring-amber-500/30' },
    { from: 'from-purple-500', to: 'to-violet-500', ring: 'ring-purple-500/30' },
  ]
  const theme = themeColors[index % themeColors.length]

  return (
    <button
      onClick={() => navigate(`/game/${story.id}`)}
      className="relative flex-shrink-0 w-72 group"
    >
      {/* 卡片主体 */}
      <div className="relative bg-gradient-to-b from-white to-gray-50 dark:from-dark-800 dark:to-dark-900 rounded-2xl border border-gray-200/80 dark:border-dark-700/80 p-5 text-left transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden">
        {/* 顶部渐变条 */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.from} ${theme.to}`} />

        {/* 背景装饰 */}
        <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${theme.from} ${theme.to} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

        {/* 标题区域 */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-gray-900 dark:text-white font-bold text-lg group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-rose-500 group-hover:to-pink-500 transition-all duration-300 line-clamp-2 flex-1">
            {story.title}
          </h3>
          {isPlayed && (
            <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
              ✓ 已完成
            </span>
          )}
        </div>

        {/* 汤面 */}
        <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed">
          {story.surface}
        </p>

        {/* 底部信息 */}
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${diff.bg} ${diff.text} border ${diff.border}`}>
            {diff.label}
          </span>
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs">
            <span className="text-lg">👁</span>
            <span className="font-medium">{story.playCount}</span>
          </div>
        </div>
      </div>

      {/* 悬停时的光环 */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r ${theme.from} ${theme.to} -z-10 blur-md opacity-20`} />
    </button>
  )
})

/**
 * 导航按钮
 */
const NavButton = memo(function NavButton({ to, icon, label, isActive }: { to: string; icon: string; label: string; isActive: boolean }) {
  return (
    <Link
      to={to}
      className={`
        relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group
        ${isActive
          ? 'bg-gradient-to-r from-game-500 to-purple-500 text-white shadow-lg shadow-game-500/30'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-white'
        }
      `}
    >
      <span className="relative z-10 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span>{label}</span>
      </span>

      {/* 悬停效果 */}
      {!isActive && (
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-r from-game-500/10 to-purple-500/10 transition-opacity duration-300" />
      )}
    </Link>
  )
})

/**
 * Home - 游戏大厅首页
 */
function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sortType, setSortType] = useState<StorySortType>('hottest')
  const [playedIds] = useState<string[]>(getPlayedStoryIds())
  const [stats] = useState(() => getUserStats())
  const [currentPage, setCurrentPage] = useState(1)
  const [showFriendsDrawer, setShowFriendsDrawer] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<import('../data/dailyChallenge').DailyChallengeProgress | null>(null)
  const [challengeStory, setChallengeStory] = useState<import('../types/story').TStory | null>(null)
  const itemsPerPage = 9

  // 搜索和筛选状态
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([])
  const [showDifficultyFilter, setShowDifficultyFilter] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 加载每日挑战
  useEffect(() => {
    const loadChallenge = async () => {
      const [c, s] = await Promise.all([getDailyChallenge(), getDailyChallengeStory()])
      setChallenge(c)
      setChallengeStory(s)
    }
    loadChallenge()
  }, [])

  // 模拟加载
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [sortType])

  // 搜索和难度筛选后的故事
  const filteredStories = useMemo(() => {
    let result = stories

    // 排序
    switch (sortType) {
      case 'latest':
        result = getStoriesByLatest()
        break
      case 'hottest':
        result = getStoriesByHot()
        break
      case 'unplayed':
        result = getUnplayedStories(playedIds)
        break
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(story =>
        story.title.toLowerCase().includes(query) ||
        story.surface.toLowerCase().includes(query) ||
        story.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // 难度筛选
    if (selectedDifficulties.length > 0) {
      result = result.filter(story => selectedDifficulties.includes(story.difficulty))
    }

    return result
  }, [sortType, playedIds, searchQuery, selectedDifficulties])

  const hotStories = useMemo(() => getStoriesByHot().slice(0, 5), [])

  // 分页计算
  const totalPages = Math.ceil(filteredStories.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedStories = filteredStories.slice(startIndex, startIndex + itemsPerPage)

  const sortOptions: { type: StorySortType; label: string; icon: string }[] = [
    { type: 'hottest', label: '最热', icon: '🔥' },
    { type: 'latest', label: '最新', icon: '✨' },
    { type: 'unplayed', label: '未挑战', icon: '🎯' }
  ]

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-game-500/10 to-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-40 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-3xl" />
        </div>

        {/* 顶部导航 */}
        <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center text-2xl">🐢</div>
              <div>
                <span className="text-gray-900 dark:text-white font-bold text-xl">AI 海龟汤</span>
                <span className="hidden sm:block text-gray-500 dark:text-gray-400 text-xs">逻辑推理游戏</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-dark-700 skeleton" />
              <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-dark-700 skeleton" />
            </div>
          </div>
        </header>

        {/* 主内容骨架屏 */}
        <main className="relative max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="h-9 w-80 skeleton rounded mb-2" />
            <div className="h-5 w-96 skeleton rounded" />
          </div>
          <div className="h-32 skeleton rounded-2xl mb-8" />
          <div className="h-24 skeleton rounded-2xl mb-8" />
          <div className="flex gap-5 overflow-x-auto pb-4 -mx-2 px-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex-shrink-0 w-72 h-40 skeleton rounded-2xl" />
            ))}
          </div>
          <StoryCardListSkeleton count={9} />
        </main>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <PageErrorState
        title="加载失败"
        message={error}
        onRetry={() => {
          setError(null)
          setIsLoading(true)
          setTimeout(() => setIsLoading(false), 800)
        }}
      />
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* 大圆形装饰 */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-game-500/10 to-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-40 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-3xl" />
        </div>

      {/* 顶部导航 */}
      <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center text-2xl text-white shadow-lg shadow-game-500/30 group-hover:shadow-game-500/50 transition-shadow">
                🐢
              </div>
              {/* 光晕 */}
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-game-400 to-purple-400 opacity-30 blur-sm -z-10 group-hover:opacity-50 transition-opacity" />
            </div>
            <div>
              <span className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">AI 海龟汤</span>
              <span className="hidden sm:block text-gray-500 dark:text-gray-400 text-xs">逻辑推理游戏</span>
            </div>
          </Link>

          {/* 导航 */}
          <nav className="hidden md:flex items-center gap-1">
            <NavButton to="/" icon="🏠" label="首页" isActive={true} />
            <NavButton to="/multiplayer" icon="👥" label="多人" isActive={false} />
            <NavButton to="/generate" icon="✨" label="AI生成" isActive={false} />
            <NavButton to="/custom" icon="📝" label="私人" isActive={false} />
            {user && (
              <NavButton to="/contribute" icon="📮" label="投稿" isActive={false} />
            )}
            {user?.role === 'admin' && (
              <NavButton to="/admin/review" icon="🔍" label="审核" isActive={false} />
            )}
          </nav>

          {/* 右侧 */}
          <div className="flex items-center gap-3">
            <SoundControl />
            <ThemeToggle />

              <UserProfileDropdown />
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="relative max-w-7xl mx-auto px-6 py-8">
        {/* 标题区 - 增强版 Hero */}
        <div className="relative mb-10 py-10 px-8 rounded-3xl overflow-hidden">
          {/* 背景效果 */}
          <div className="absolute inset-0 bg-gradient-to-br from-game-500/10 via-purple-500/5 to-pink-500/10 dark:from-game-500/20 dark:via-purple-500/10 dark:to-pink-500/20" />
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-game-400/30 to-purple-500/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-br from-purple-400/30 to-pink-500/30 rounded-full blur-3xl" />

          <div className="relative">
            {/* 主标题 */}
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-game-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                准备好解开谜题了吗？
              </h1>
              <span className="text-4xl animate-bounce-soft">🎮</span>
            </div>

            {/* 副标题 */}
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 max-w-2xl">
              通过提出只能用「是」或「否」回答的问题，逐步还原每个荒诞故事背后的真相
            </p>

            {/* 统计数字 */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-game-500">{stories.length}+</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">精选故事</span>
              </div>
              <div className="w-px h-8 bg-gray-300 dark:bg-dark-600 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-purple-500">12.8K</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">玩家挑战</span>
              </div>
              <div className="w-px h-8 bg-gray-300 dark:bg-dark-600 hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-pink-500">98%</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">用户好评</span>
              </div>
            </div>

            {/* 快速开始按钮 */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  const hotStory = getStoriesByHot()[0]
                  if (hotStory) navigate(`/game/${hotStory.id}`)
                }}
                className="px-6 py-3 bg-gradient-to-r from-game-500 to-purple-500 hover:from-game-400 hover:to-purple-400 text-white font-bold rounded-xl shadow-lg shadow-game-500/30 hover:shadow-game-500/50 transition-all active:scale-95 flex items-center gap-2"
              >
                <span>🚀</span>
                <span>开始挑战</span>
              </button>
              <Link
                to="/generate"
                className="px-6 py-3 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 hover:border-game-500/50 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all flex items-center gap-2"
              >
                <span>✨</span>
                <span>AI生成</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 每日挑战 + 用户状态 - 整合设计 */}
        {(() => {
          const isCompleted = challenge?.progress?.completed

          return (
            <section className="mb-8">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* 每日挑战卡片 */}
                {challenge && challengeStory ? (
                  <div className="flex-1 relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-[2px] animate-glow">
                    <div className="relative bg-dark-900 rounded-[18px] p-4 overflow-hidden">
                      <div className="flex items-center gap-4">
                        {/* 图标 */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shadow-lg">
                          📅
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-bold">每日挑战</h3>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {isCompleted ? '✓ 已完成' : '🔥 进行中'}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm truncate">{challengeStory.title}</p>
                        </div>

                        <button
                          onClick={() => navigate(`/game/${challengeStory.id}`)}
                          className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-white font-bold rounded-xl text-sm shadow-lg whitespace-nowrap"
                        >
                          {isCompleted ? '再次挑战' : '开始挑战'}
                        </button>
                      </div>

                      {/* 奖励提示 */}
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <span>奖励</span>
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">x{challenge.bonusMultiplier || 2}</span>
                        <span>经验值</span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* 用户状态卡片 - 仅登录用户显示 */}
                {user && (
                  <div className="lg:w-80 relative bg-gradient-to-br from-game-500/10 to-purple-500/10 dark:from-game-500/20 dark:to-purple-500/20 rounded-2xl border border-game-500/30 p-4 overflow-hidden">
                    {/* 装饰角 */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-game-500/20 to-transparent rounded-bl-full" />
                    {/* 底部装饰线 */}
                    <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-game-500/20 to-transparent" />

                    <div className="relative flex items-center gap-4">
                      {/* 头像区 */}
                      <div className="relative">
                        <Avatar username={user.username} size="lg" level={stats.rank || 1} />
                        {/* 头像光晕 */}
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-game-400 to-purple-400 opacity-30 blur-sm -z-10" />
                      </div>

                      {/* 用户信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 dark:text-white truncate">{user.username}</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-game-500 to-purple-500 text-white shadow-md">
                            LV.{stats.rank || 1}
                          </span>
                        </div>

                        {/* 经验值进度条 - 精致版 */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-gray-500 flex items-center gap-1">
                              <span>✨</span> 经验值
                            </span>
                            <span className="text-game-500 font-medium">{stats.totalGames * 10} / 100</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-game-500 to-purple-500 rounded-full transition-all duration-500 relative"
                              style={{ width: `${Math.min((stats.totalGames * 10) / 100 * 100, 100)}%` }}
                            >
                              {/* 进度条光泽 */}
                              <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 统计数据行 - 卡片式 */}
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="flex-1 text-center p-2 bg-white/50 dark:bg-dark-800/50 rounded-lg border border-gray-100 dark:border-dark-700/50 hover:border-game-500/30 transition-colors">
                        <div className="text-lg font-bold text-game-500">{stats.totalGames || 0}</div>
                        <div className="text-[10px] text-gray-500">总局数</div>
                      </div>
                      <div className="flex-1 text-center p-2 bg-white/50 dark:bg-dark-800/50 rounded-lg border border-gray-100 dark:border-dark-700/50 hover:border-purple-500/30 transition-colors">
                        <div className="text-lg font-bold text-purple-500">{stats.totalWins || 0}</div>
                        <div className="text-[10px] text-gray-500">已解谜</div>
                      </div>
                      <div className="flex-1 text-center p-2 bg-white/50 dark:bg-dark-800/50 rounded-lg border border-gray-100 dark:border-dark-700/50 hover:border-pink-500/30 transition-colors">
                        <div className="text-lg font-bold text-pink-500">{stats.perfectGames || 0}</div>
                        <div className="text-[10px] text-gray-500">完美解</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )
        })()}

        {/* 热门案例 */}
        {hotStories.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 flex items-center justify-center">
                  <span className="text-xl">🔥</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">热门案例</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">玩家们都在挑战这些</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSortType('hottest')
                  document.querySelector('#story-list')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="px-4 py-2 text-sm text-game-500 hover:text-game-400 font-medium flex items-center gap-1 transition-colors"
              >
                查看全部
                <span>→</span>
              </button>
            </div>

            <div className="relative group">
              {/* 左侧渐变遮罩 */}
              <div className="absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-gray-50 dark:from-dark-900 to-transparent z-10 pointer-events-none" />
              {/* 右侧渐变遮罩 */}
              <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-gray-50 dark:from-dark-900 to-transparent z-10 pointer-events-none" />

              <div className="flex gap-5 overflow-x-auto pb-4 px-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-dark-600 scrollbar-track-transparent">
                {hotStories.map((story, index) => (
                  <CaseFileCard
                    key={story.id}
                    story={story}
                    index={index}
                    isPlayed={playedIds.includes(story.id)}
                  />
                ))}
              </div>

              {/* 滚动指示器 */}
              <div className="flex justify-center gap-1.5 mt-2">
                {hotStories.slice(0, 5).map((_, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-dark-600" />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 分割线 */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-dark-600 to-transparent" />
          <div className="flex items-center gap-2 text-gray-400">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-game-400 to-purple-400" />
            <span className="text-sm font-medium">全部故事</span>
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-dark-600 to-transparent" />
        </div>

        {/* 筛选栏 */}
        <div id="story-list" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">故事列表</h2>
            {searchQuery && (
              <span className="text-sm text-game-500">
                搜索: "{searchQuery}"
              </span>
            )}
            {selectedDifficulties.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-game-500/20 text-game-500 rounded-full">
                {selectedDifficulties.length}个难度筛选
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* 搜索框 */}
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="搜索故事..."
                className="w-48 sm:w-64 px-4 py-2 pl-10 text-sm bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-game-500/50 focus:border-game-500 transition-all"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    searchInputRef.current?.focus()
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 难度筛选 */}
            <div className="relative">
              <button
                onClick={() => setShowDifficultyFilter(!showDifficultyFilter)}
                className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all flex items-center gap-2 ${
                  selectedDifficulties.length > 0
                    ? 'bg-game-500/10 border-game-500/50 text-game-500'
                    : 'bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-700 text-gray-600 dark:text-gray-400 hover:border-game-500/50'
                }`}
              >
                <span>🎯</span>
                <span>难度</span>
                {selectedDifficulties.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-game-500 text-white rounded-full">
                    {selectedDifficulties.length}
                  </span>
                )}
              </button>

              {/* 难度筛选下拉 */}
              {showDifficultyFilter && (
                <div className="absolute right-0 top-full mt-2 p-3 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-xl z-20 min-w-[200px]">
                  <div className="space-y-2">
                    {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map(diff => {
                      const config = DIFFICULTY_CONFIG[diff]
                      const isSelected = selectedDifficulties.includes(diff)
                      return (
                        <button
                          key={diff}
                          onClick={() => {
                            setSelectedDifficulties(prev =>
                              isSelected
                                ? prev.filter(d => d !== diff)
                                : [...prev, diff]
                            )
                            setCurrentPage(1)
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                            isSelected
                              ? 'bg-game-500/10 text-game-500'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected
                              ? 'bg-game-500 border-game-500'
                              : 'border-gray-300 dark:border-dark-600'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.bg} ${config.text}`}>
                            {config.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {selectedDifficulties.length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedDifficulties([])
                        setCurrentPage(1)
                      }}
                      className="w-full mt-2 pt-2 border-t border-gray-200 dark:border-dark-700 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      清除筛选
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 排序筛选 */}
            <div className="flex items-center gap-1 p-1.5 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 shadow-sm">
              {sortOptions.map(option => (
                <button
                  key={option.type}
                  onClick={() => setSortType(option.type)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                    sortType === option.type
                      ? 'bg-gradient-to-r from-game-500 to-purple-500 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 故事网格 */}
        {paginatedStories.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedStories.map((story, index) => (
                <GameCard
                  key={story.id}
                  story={story}
                  isPlayed={playedIds.includes(story.id)}
                  index={index}
                />
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  ← 上一页
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 text-sm font-medium rounded-xl transition-all ${
                          pageNum === currentPage
                            ? 'bg-gradient-to-r from-game-500 to-purple-500 text-white shadow-lg'
                            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  下一页 →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-dark-800 flex items-center justify-center">
              <span className="text-4xl">🐢</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {sortType === 'unplayed' ? '已全部挑战完成！太厉害了！🎉' : '暂无故事'}
            </p>
          </div>
        )}

        {/* 游戏规则 */}
        <FadeIn delay={300}>
          <section className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-game-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl blur-xl" />
            <div className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-game-500/20 to-purple-500/20 flex items-center justify-center">
                  <span className="text-xl">📜</span>
                </div>
                <h3 className="text-gray-900 dark:text-white font-bold text-lg">游戏规则</h3>
              </div>

              <ul className="space-y-3">
                {[
                  { icon: '1', text: '每轮只能提问可以用「是」「否」或「无关」回答的问题' },
                  { icon: '2', text: 'AI将根据汤底进行判断，回答「是」「否」或「无关」' },
                  { icon: '3', text: '尽可能用最少的提问次数还原真相' },
                  { icon: '4', text: '当你认为已经还原真相时，可以选择「猜答案」' },
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-600 dark:text-gray-400 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br from-game-500 to-purple-500 text-white text-xs font-bold flex items-center justify-center">
                      {rule.icon}
                    </span>
                    <span>{rule.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </FadeIn>

        {/* 页脚 */}
        <footer className="mt-12 pb-8 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            © 2026 AI海龟汤 · 用逻辑穿透迷雾
          </p>
        </footer>
      </main>

      {/* 好友抽屉 */}
      <FriendsDrawer isOpen={showFriendsDrawer} onClose={() => setShowFriendsDrawer(false)} />
      </div>
    </PageTransition>
  )
}

export default Home
