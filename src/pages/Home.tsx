import { useState, useEffect, useMemo, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { stories, getStoriesByLatest, getStoriesByHot, getUnplayedStories } from '../data/stories'
import GameCard from '../components/GameCard'
import type { StorySortType, GameRecord, TStory } from '../types'
import ThemeToggle from '../components/ThemeToggle'
import SoundControl from '../components/SoundControl'
import Avatar from '../components/Avatar'
import { getUserStats } from '../data/userData'
import { useAuth } from '../hooks/useAuth'
import { getDailyChallenge, getDailyChallengeStory } from '../data/dailyChallenge'
import FriendsDrawer from '../components/FriendsDrawer'
import { DIFFICULTY_CONFIG, STORAGE_KEYS } from '../constants'

/**
 * 从localStorage获取已玩记录
 */
const getPlayedRecords = (): GameRecord[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.RECORDS)
    return saved ? JSON.parse(saved) : []
  } catch {
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

        {/* 案例编号 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500 tracking-wider">
            CASE {String(index + 1).padStart(3, '0')}
          </span>
          {isPlayed && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
              ✓ 已完成
            </span>
          )}
        </div>

        {/* 标题 */}
        <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-rose-500 group-hover:to-pink-500 transition-all duration-300 line-clamp-2 pr-16">
          {story.title}
        </h3>

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
 * 玩家等级卡
 */
const PlayerLevelCard = memo(function PlayerLevelCard({ username, level, xp, nextLevelXp }: { username: string; level: number; xp: number; nextLevelXp: number }) {
  const progress = Math.min((xp / nextLevelXp) * 100, 100)

  return (
    <div className="relative bg-gradient-to-br from-game-500/10 to-purple-500/10 dark:from-game-500/20 dark:to-purple-500/20 rounded-2xl border border-game-500/30 p-4 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-game-500/20 to-transparent rounded-bl-full" />

      <div className="relative flex items-center gap-4">
        {/* 头像 */}
        <div className="relative">
          <Avatar username={username} size="lg" level={level} />
          {/* 等级光环 */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-game-400 to-purple-400 opacity-30 blur-sm -z-10" />
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900 dark:text-white">{username}</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-game-500 to-purple-500 text-white">
              LV.{level}
            </span>
          </div>

          {/* 经验值进度条 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span>✨</span> 经验值
              </span>
              <span>{xp} / {nextLevelXp}</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-game-500 to-purple-500 rounded-full transition-all duration-500 relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                {/* 进度条光泽 */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  const { user, logout } = useAuth()
  const [sortType, setSortType] = useState<StorySortType>('hottest')
  const [playedIds] = useState<string[]>(getPlayedStoryIds())
  const [stats] = useState(() => getUserStats())
  const [currentPage, setCurrentPage] = useState(1)
  const [showFriendsDrawer, setShowFriendsDrawer] = useState(false)
  const itemsPerPage = 9

  useEffect(() => {
    setCurrentPage(1)
  }, [sortType])

  const sortedStories = useMemo(() => {
    switch (sortType) {
      case 'latest':
        return getStoriesByLatest()
      case 'hottest':
        return getStoriesByHot()
      case 'unplayed':
        return getUnplayedStories(playedIds)
      default:
        return stories
    }
  }, [sortType, playedIds])

  const hotStories = useMemo(() => getStoriesByHot().slice(0, 5), [])

  // 分页计算
  const totalPages = Math.ceil(sortedStories.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedStories = sortedStories.slice(startIndex, startIndex + itemsPerPage)

  const sortOptions: { type: StorySortType; label: string; icon: string }[] = [
    { type: 'hottest', label: '最热', icon: '🔥' },
    { type: 'latest', label: '最新', icon: '✨' },
    { type: 'unplayed', label: '未挑战', icon: '🎯' }
  ]

  return (
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
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
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
          </nav>

          {/* 右侧 */}
          <div className="flex items-center gap-3">
            <SoundControl />
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-dark-700">
                <button
                  onClick={() => setShowFriendsDrawer(true)}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
                  title="好友"
                >
                  <span className="text-lg">💬</span>
                </button>

                <Link to="/profile" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                  <Avatar src={user.avatar} username={user.username} size="sm" />
                  <span className="text-gray-700 dark:text-gray-200 text-sm font-medium hidden sm:inline">{user.username}</span>
                </Link>

                <button
                  onClick={logout}
                  className="text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-xs transition-colors"
                >
                  退出
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="px-5 py-2.5 bg-gradient-to-r from-game-500 to-purple-500 hover:from-game-600 hover:to-purple-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-game-500/30 transition-all active:scale-95"
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="relative max-w-7xl mx-auto px-6 py-8">
        {/* 标题区 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            准备好解开谜题了吗？
            <span className="inline-block ml-2 animate-bounce-soft">🎮</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base">
            通过提出只能用「是」或「否」回答的问题，逐步还原每个荒诞故事背后的真相
          </p>
        </div>

        {/* 每日挑战 */}
        {(() => {
          const challenge = getDailyChallenge()
          const challengeStory = getDailyChallengeStory()
          if (!challenge || !challengeStory) return null

          return (
            <section className="mb-8">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-[2px]">
                <div className="relative bg-dark-900 rounded-[18px] p-5">
                  {/* 内部装饰 */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/20 to-transparent rounded-bl-full" />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl shadow-lg">
                        📅
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-white font-bold text-lg">每日挑战</h3>
                          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white/20 text-white">
                            {challenge.completed ? '已完成' : '进行中'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          奖励 x{challenge.bonusMultiplier} 经验值
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <h4 className="text-white font-medium mb-1">{challengeStory.title}</h4>
                        <p className="text-gray-400 text-sm line-clamp-1 max-w-[200px]">{challengeStory.surface}</p>
                      </div>

                      <button
                        onClick={() => navigate(`/game/${challengeStory.id}`)}
                        className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95"
                      >
                        {challenge.completed ? '再次挑战' : '开始挑战'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )
        })()}

        {/* 玩家等级卡 */}
        {user && (
          <section className="mb-8">
            <PlayerLevelCard
              username={user.username}
              level={stats.rank || 1}
              xp={stats.totalGames * 10}
              nextLevelXp={100}
            />
          </section>
        )}

        {/* 热门案例 */}
        {hotStories.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">热门案例</h2>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-300 dark:from-dark-600 to-transparent" />
            </div>

            <div className="flex gap-5 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-thin">
              {hotStories.map((story, index) => (
                <CaseFileCard
                  key={story.id}
                  story={story}
                  index={index}
                  isPlayed={playedIds.includes(story.id)}
                />
              ))}
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            故事列表
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({sortedStories.length})
            </span>
          </h2>

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
  )
}

export default Home
