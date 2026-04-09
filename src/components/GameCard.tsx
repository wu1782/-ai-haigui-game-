import { memo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TStory } from '../types'
import { DIFFICULTY_CONFIG } from '../constants'
import { isFavorite, toggleFavorite } from '../data/favorites'
import { useToast } from '../context/ToastContext'

// ============================================
// 类型定义
// ============================================

interface GameCardProps {
  story: TStory
  isPlayed?: boolean
  index?: number
  /** 初始点赞状态 */
  isLiked?: boolean
  /** 初始收藏状态 */
  isBookmarked?: boolean
  /** 初始点赞数 */
  likeCount?: number
  /** 点赞数变化回调 */
  onLikeChange?: (isLiked: boolean, newCount: number) => void
  /** 收藏状态变化回调 */
  onBookmarkChange?: (isBookmarked: boolean) => void
}

// ============================================
// 主题颜色配置
// ============================================

const cardThemes = [
  { bg: 'from-rose-500 to-pink-500', accent: 'text-rose-500', glow: 'hover:shadow-rose-500/30' },
  { bg: 'from-blue-500 to-cyan-500', accent: 'text-blue-500', glow: 'hover:shadow-blue-500/30' },
  { bg: 'from-emerald-500 to-teal-500', accent: 'text-emerald-500', glow: 'hover:shadow-emerald-500/30' },
  { bg: 'from-amber-500 to-orange-500', accent: 'text-amber-500', glow: 'hover:shadow-amber-500/30' },
  { bg: 'from-purple-500 to-violet-500', accent: 'text-purple-500', glow: 'hover:shadow-purple-500/30' },
  { bg: 'from-cyan-500 to-sky-500', accent: 'text-cyan-500', glow: 'hover:shadow-cyan-500/30' },
  { bg: 'from-pink-500 to-rose-500', accent: 'text-pink-500', glow: 'hover:shadow-pink-500/30' },
  { bg: 'from-indigo-500 to-purple-500', accent: 'text-indigo-500', glow: 'hover:shadow-indigo-500/30' },
]

function getCardTheme(id: string) {
  const index = (parseInt(id) || id.charCodeAt(0)) % cardThemes.length
  return cardThemes[index]
}

// ============================================
// 子组件：星级难度
// ============================================

const StarRating = memo(({ level }: { level: number }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          className={`text-sm transition-all duration-200 ${
            star <= level
              ? 'text-amber-400 dark:text-amber-300 drop-shadow-sm'
              : 'text-gray-300 dark:text-gray-600'
          } ${star <= level ? 'scale-110' : ''}`}
        >
          ★
        </span>
      ))}
    </div>
  )
})

// ============================================
// 子组件：难度标签
// ============================================

const DifficultyBadge = memo(({ difficulty }: { difficulty: TStory['difficulty'] }) => {
  const { label, bg, text, border } = DIFFICULTY_CONFIG[difficulty]

  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${bg} ${text} border ${border} shadow-sm`}>
      {label}
    </span>
  )
})

// ============================================
// 子组件：互动按钮（点赞/收藏）
// ============================================

interface ActionButtonProps {
  type: 'like' | 'bookmark'
  isActive: boolean
  count: number
  onClick: (e: React.MouseEvent) => void
}

function ActionButton({ type, isActive, count, onClick }: ActionButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    // 触发动画
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)

    onClick(e)
  }

  const isLike = type === 'like'

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
        transition-all duration-200 active:scale-95
        ${isAnimating ? 'scale-110' : 'scale-100'}
        ${isActive
          ? isLike
            ? 'bg-red-50 dark:bg-red-500/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/30'
            : 'bg-purple-50 dark:bg-purple-500/20 text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-500/30'
          : 'bg-gray-100/80 dark:bg-dark-700/80 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600'
        }
      `}
      title={isLike ? (isActive ? '取消点赞' : '点赞') : (isActive ? '取消收藏' : '收藏')}
    >
      <span className={`text-base leading-none transition-transform ${isAnimating ? 'scale-125' : 'scale-100'}`}>
        {isLike ? (isActive ? '❤️' : '🤍') : (isActive ? '🔖' : '📑')}
      </span>
      {count > 0 && (
        <span className={`tabular-nums ${isActive ? 'font-semibold' : ''}`}>
          {count}
        </span>
      )}
    </button>
  )
}

// ============================================
// 主组件：游戏卡片
// ============================================

const GameCard = memo(function GameCard({
  story,
  isPlayed,
  index = 0,
  isLiked: initialLiked = false,
  isBookmarked: initialBookmarked,
  likeCount: initialLikeCount,
  onLikeChange,
  onBookmarkChange,
}: GameCardProps) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [isHovered, setIsHovered] = useState(false)
  const theme = getCardTheme(story.id)

  // 点赞状态（乐观 UI）
  const [isLiked, setIsLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount ?? Math.floor(story.playCount * 0.1))

  // 收藏状态（优先使用本地存储状态）
  const storedBookmark = isFavorite(story.id)
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked ?? storedBookmark)

  // 处理点赞
  const handleLike = useCallback((e: React.MouseEvent) => {
    const newLiked = !isLiked
    const newCount = newLiked ? likeCount + 1 : likeCount - 1

    // 乐观更新
    setIsLiked(newLiked)
    setLikeCount(newCount)

    onLikeChange?.(newLiked, newCount)
  }, [isLiked, likeCount, onLikeChange])

  // 处理收藏
  const handleBookmark = useCallback((e: React.MouseEvent) => {
    const newBookmarked = !isBookmarked

    // 乐观更新
    setIsBookmarked(newBookmarked)
    toggleFavorite(story.id)

    // 显示提示
    showToast(newBookmarked ? '已添加到收藏' : '已取消收藏', 'success')

    onBookmarkChange?.(newBookmarked)
  }, [isBookmarked, story.id, onBookmarkChange, showToast])

  const handleClick = () => {
    navigate(`/game/${story.id}`)
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={`
        w-full text-left relative rounded-2xl overflow-hidden
        bg-white dark:bg-dark-800
        border border-gray-200 dark:border-dark-700
        transition-all duration-300 cursor-pointer group
        hover:shadow-xl ${theme.glow} dark:hover:shadow-lg
        hover:-translate-y-1 hover:scale-[1.02]
        ${isHovered ? 'border-transparent shadow-lg' : ''}
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* 彩色顶部装饰条 */}
      <div className={`h-1.5 bg-gradient-to-r ${theme.bg}`} />

      {/* 背景装饰 */}
      <div
        className={`
          absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-10
          bg-gradient-to-br ${theme.bg} transition-opacity duration-300
          -translate-y-1/2 translate-x-1/2
        `}
      />

      <div className="p-5">
        {/* 顶部行：状态徽章 + 互动按钮 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* 已完成标记 */}
            {isPlayed && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-500/30">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                已完成
              </div>
            )}
          </div>

          {/* 互动按钮组 */}
          <div className="flex items-center gap-1">
            <ActionButton
              type="like"
              isActive={isLiked}
              count={likeCount}
              onClick={handleLike}
            />
            <ActionButton
              type="bookmark"
              isActive={isBookmarked}
              count={0}
              onClick={handleBookmark}
            />
          </div>
        </div>

        {/* 标题 */}
        <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-3 group-hover:text-game-500 transition-colors duration-200 leading-snug line-clamp-2">
          {story.title}
        </h3>

        {/* 难度星级 */}
        <div className="flex items-center gap-3 mb-3">
          <StarRating level={story.starLevel} />
          <DifficultyBadge difficulty={story.difficulty} />
        </div>

        {/* 汤面描述 */}
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-3 mb-4">
          {story.surface}
        </p>

        {/* 底部标签和热度 */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {story.tags?.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 rounded-md border border-gray-200 dark:border-dark-600"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 热度 */}
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{story.playCount}</span>
          </div>
        </div>
      </div>

      {/* 悬停时的彩色边框 */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-r ${theme.bg} -z-10 blur-[2px]`} />
    </div>
  )
})

export default GameCard
