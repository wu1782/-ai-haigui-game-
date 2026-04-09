import { useState } from 'react'

// ============================================
// 类型定义
// ============================================

export interface LeaderboardItem {
  rank: number
  playerName: string
  avatar?: string
  value: number
  unit: string
}

// ============================================
// Mock 数据
// ============================================

const TIME_LEADERBOARD: LeaderboardItem[] = [
  { rank: 1, playerName: '推理女王', value: 192, unit: '秒', avatar: undefined },
  { rank: 2, playerName: '谜题终结者', value: 215, unit: '秒', avatar: undefined },
  { rank: 3, playerName: '思维闪电', value: 238, unit: '秒', avatar: undefined },
  { rank: 4, playerName: '福尔摩斯迷', value: 256, unit: '秒', avatar: undefined },
  { rank: 5, playerName: '逻辑大师', value: 271, unit: '秒', avatar: undefined },
  { rank: 6, playerName: '侦探新星', value: 289, unit: '秒', avatar: undefined },
  { rank: 7, playerName: '推理狂人', value: 302, unit: '秒', avatar: undefined },
  { rank: 8, playerName: '波洛传人', value: 318, unit: '秒', avatar: undefined },
]

const QUESTIONS_LEADERBOARD: LeaderboardItem[] = [
  { rank: 1, playerName: '一击即中', value: 5, unit: '次', avatar: undefined },
  { rank: 2, playerName: '直觉之王', value: 6, unit: '次', avatar: undefined },
  { rank: 3, playerName: '问者无惑', value: 7, unit: '次', avatar: undefined },
  { rank: 4, playerName: '精简提问', value: 8, unit: '次', avatar: undefined },
  { rank: 5, playerName: '推理达人', value: 9, unit: '次', avatar: undefined },
  { rank: 6, playerName: '思维缜密', value: 10, unit: '次', avatar: undefined },
  { rank: 7, playerName: '好奇宝宝', value: 11, unit: '次', avatar: undefined },
  { rank: 8, playerName: '问题少年', value: 12, unit: '次', avatar: undefined },
]

// 默认头像表情
const defaultAvatars = ['🐢', '🦎', '🐙', '🦑', '🐳', '🦈', '🐠', '🦩', '🦀', '🐟']

function getDefaultAvatar(name?: string): string {
  if (!name) return defaultAvatars[0]
  const index = name.charCodeAt(0) % defaultAvatars.length
  return defaultAvatars[index]
}

// 格式化数值显示
function formatValue(value: number, unit: string): string {
  if (unit === '秒') {
    const minutes = Math.floor(value / 60)
    const seconds = value % 60
    return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`
  }
  return `${value}${unit}`
}

// ============================================
// 获取排名徽章
// ============================================

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
        <span className="text-sm">👑</span>
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg shadow-gray-400/20">
        <span className="text-sm">🥈</span>
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
        <span className="text-sm">🥉</span>
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{rank}</span>
    </div>
  )
}

// ============================================
// 列表行组件
// ============================================

function LeaderboardRow({ item, index }: { item: LeaderboardItem; index: number }) {
  const isTopThree = item.rank <= 3

  return (
    <div
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl
        transition-all duration-200 cursor-pointer
        hover:bg-game-50/70 dark:hover:bg-game-500/10
        ${isTopThree ? 'bg-gradient-to-r from-transparent to-transparent' : ''}
      `}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* 排名徽章 */}
      <RankBadge rank={item.rank} />

      {/* 头像 */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-game-100 to-purple-200 dark:from-game-700 dark:to-purple-800 flex items-center justify-center text-xs overflow-hidden">
        {item.avatar ? (
          <img src={item.avatar} alt={item.playerName} className="w-full h-full object-cover" />
        ) : (
          <span>{getDefaultAvatar(item.playerName)}</span>
        )}
      </div>

      {/* 昵称 */}
      <span className={`
        flex-1 text-sm font-medium truncate
        ${isTopThree ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}
      `}>
        {item.playerName}
      </span>

      {/* 成绩 */}
      <span className={`
        text-sm font-bold tabular-nums
        ${isTopThree ? 'text-game-600 dark:text-game-400' : 'text-gray-500 dark:text-gray-400'}
      `}>
        {formatValue(item.value, item.unit)}
      </span>
    </div>
  )
}

// ============================================
// 主组件：全球通关排行榜
// ============================================

interface GlobalLeaderboardProps {
  className?: string
}

export default function GlobalLeaderboard({ className = '' }: GlobalLeaderboardProps) {
  const [activeTab, setActiveTab] = useState<'time' | 'questions'>('time')
  const [isAnimating, setIsAnimating] = useState(false)

  const data = activeTab === 'time' ? TIME_LEADERBOARD : QUESTIONS_LEADERBOARD

  const handleTabChange = (tab: 'time' | 'questions') => {
    if (tab === activeTab) return
    setIsAnimating(true)
    setTimeout(() => {
      setActiveTab(tab)
      setIsAnimating(false)
    }, 150)
  }

  return (
    <div className={`
      bg-white/90 dark:bg-dark-800/90
      backdrop-blur-xl rounded-2xl
      border border-gray-200/60 dark:border-dark-700/60
      shadow-lg shadow-gray-900/5 dark:shadow-black/20
      overflow-hidden
      ${className}
    `}>
      {/* 顶部标题 */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🏆</span>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">全球排行榜</h3>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 p-1 bg-gray-100/80 dark:bg-dark-700/80 rounded-xl">
          <button
            onClick={() => handleTabChange('time')}
            className={`
              flex-1 py-2 px-3 text-xs font-bold rounded-lg
              transition-all duration-200 flex items-center justify-center gap-1.5
              ${activeTab === 'time'
                ? 'bg-white dark:bg-dark-600 text-game-600 dark:text-game-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            <span>⚡</span>
            <span>最快通关</span>
          </button>
          <button
            onClick={() => handleTabChange('questions')}
            className={`
              flex-1 py-2 px-3 text-xs font-bold rounded-lg
              transition-all duration-200 flex items-center justify-center gap-1.5
              ${activeTab === 'questions'
                ? 'bg-white dark:bg-dark-600 text-game-600 dark:text-game-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
          >
            <span>🧠</span>
            <span>最少提问</span>
          </button>
        </div>
      </div>

      {/* 列表内容 */}
      <div className={`
        relative transition-opacity duration-150 px-3 pb-3
        ${isAnimating ? 'opacity-0' : 'opacity-100'}
      `}>
        {/* 列标题 */}
        <div className="flex items-center gap-3 px-3 pb-2 text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          <span className="w-8 text-center">排名</span>
          <span className="w-7" />
          <span className="flex-1">玩家</span>
          <span className="text-right">成绩</span>
        </div>

        {/* 分割线 */}
        <div className="h-px bg-gray-100 dark:bg-dark-700/50 mx-3 mb-2" />

        {/* 列表 */}
        <div className="space-y-0.5">
          {data.map((item, index) => (
            <LeaderboardRow key={item.rank} item={item} index={index} />
          ))}
        </div>

        {/* 底部渐变遮罩 */}
        <div className="absolute bottom-3 left-0 right-3 h-8 bg-gradient-to-t from-white/90 dark:from-dark-800/90 to-transparent pointer-events-none" style={{ borderBottomLeftRadius: '1rem', borderBottomRightRadius: '1rem' }} />
      </div>

      {/* 底部边框装饰 */}
      <div className="h-1 bg-gradient-to-r from-amber-400 via-game-400 to-purple-500" />
    </div>
  )
}
