import { memo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TStory } from '../types'
import { DIFFICULTY_CONFIG } from '../constants'
import FavoriteButton from './FavoriteButton'

interface GameCardProps {
  story: TStory
  isPlayed?: boolean
  index?: number
}

// 卡片颜色主题
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

/**
 * 星级难度显示
 */
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

/**
 * 难度标签
 */
const DifficultyBadge = memo(({ difficulty }: { difficulty: TStory['difficulty'] }) => {
  const { label, bg, text, border } = DIFFICULTY_CONFIG[difficulty]

  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${bg} ${text} border ${border} shadow-sm`}>
      {label}
    </span>
  )
})

/**
 * 游戏卡片组件 - 游戏化风格
 */
const GameCard = memo(function GameCard({ story, isPlayed, index = 0 }: GameCardProps) {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)
  const theme = getCardTheme(story.id)

  const handleClick = () => {
    navigate(`/game/${story.id}`)
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        {/* 顶部行：状态徽章 + 收藏 */}
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

          <FavoriteButton storyId={story.id} size="sm" />
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
    </button>
  )
})

export default GameCard
