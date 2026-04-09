import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TStory } from '../types'
import { DIFFICULTY_CONFIG } from '../constants'

interface CaseFileCardProps {
  story: TStory
  isPlayed?: boolean
  index?: number
}

// 卡片颜色主题
const cardThemes = [
  { from: 'from-rose-500', to: 'to-pink-500', ring: 'ring-rose-500/30' },
  { from: 'from-blue-500', to: 'to-cyan-500', ring: 'ring-blue-500/30' },
  { from: 'from-emerald-500', to: 'to-teal-500', ring: 'ring-emerald-500/30' },
  { from: 'from-amber-500', to: 'to-orange-500', ring: 'ring-amber-500/30' },
  { from: 'from-purple-500', to: 'to-violet-500', ring: 'ring-purple-500/30' },
  { from: 'from-cyan-500', to: 'to-sky-500', ring: 'ring-cyan-500/30' },
]

function getCardTheme(id: string) {
  const index = (parseInt(id) || id.charCodeAt(0)) % cardThemes.length
  return cardThemes[index]
}

/**
 * 案例卡片组件 - 横向滚动列表样式
 */
const CaseFileCard = memo(function CaseFileCard({ story, isPlayed, index = 0 }: CaseFileCardProps) {
  const navigate = useNavigate()
  const theme = getCardTheme(story.id)
  const diffConfig = DIFFICULTY_CONFIG[story.difficulty]

  const handleClick = () => {
    navigate(`/game/${story.id}`)
  }

  return (
    <button
      onClick={handleClick}
      className={`
        flex-shrink-0 w-72 text-left relative rounded-2xl overflow-hidden
        bg-white dark:bg-dark-800/90 backdrop-blur-sm
        border border-gray-200 dark:border-dark-700
        transition-all duration-300 cursor-pointer group
        hover:shadow-xl hover:-translate-y-1
        ${isPlayed ? 'opacity-75' : ''}
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* 左侧彩色条 */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${theme.from} ${theme.to}`} />

      {/* 已玩标记 */}
      {isPlayed && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
          ✓ 已完成
        </div>
      )}

      <div className="p-4 pl-5">
        {/* 标题 */}
        <h3 className="text-white font-bold text-base mb-2 pr-12 line-clamp-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-rose-400 group-hover:to-pink-400 transition-all">
          {story.title}
        </h3>

        {/* 难度和星级 */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${diffConfig.bg} ${diffConfig.text}`}>
            {diffConfig.label}
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
              <span
                key={star}
                className={`text-xs ${
                  star <= story.starLevel
                    ? 'text-amber-400'
                    : 'text-gray-600'
                }`}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* 描述预览 */}
        <p className="text-gray-400 text-xs line-clamp-2 mb-3">
          {story.surface}
        </p>

        {/* 底部信息 */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="text-lg">👁</span>
            <span>{story.playCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg">🔥</span>
            <span>{story.hotScore}</span>
          </div>
        </div>
      </div>

      {/* 悬停时的光晕 */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r ${theme.from} ${theme.to} -z-10 blur-md opacity-10`} />
    </button>
  )
})

export default CaseFileCard
