interface AvatarProps {
  src?: string
  username?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  showBorder?: boolean
  isOnline?: boolean
  level?: number
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-xl',
  '2xl': 'w-28 h-28 text-3xl'
}

const borderClasses = {
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-[3px]',
  xl: 'border-4',
  '2xl': 'border-4'
}

const levelBadgeSizes = {
  sm: 'w-4 h-4 text-[8px]',
  md: 'w-5 h-5 text-[10px]',
  lg: 'w-6 h-6 text-xs',
  xl: 'w-8 h-8 text-sm',
  '2xl': 'w-10 h-10 text-base'
}

const defaultAvatars = ['🐢', '🦎', '🐙', '🦑', '🐳', '🦈', '🐠', '🦩', '🦀', '🐙', '🦑', '🐟']

function getDefaultAvatar(username?: string): string {
  if (!username) return defaultAvatars[0]
  const index = username.charCodeAt(0) % defaultAvatars.length
  return defaultAvatars[index]
}

// 根据等级获取边框颜色
function getLevelBorderColor(level: number): string {
  if (level >= 100) return 'border-amber-400 shadow-amber-400/50' // 传说
  if (level >= 50) return 'border-purple-400 shadow-purple-400/50' // 史诗
  if (level >= 20) return 'border-blue-400 shadow-blue-400/50' // 稀有
  if (level >= 10) return 'border-emerald-400 shadow-emerald-400/50' // 优秀
  return 'border-gray-300 dark:border-gray-600 shadow-gray-400/30' // 普通
}

// 根据等级获取背景
function getLevelBg(level: number): string {
  if (level >= 100) return 'bg-gradient-to-br from-amber-400 to-orange-500'
  if (level >= 50) return 'bg-gradient-to-br from-purple-400 to-pink-500'
  if (level >= 20) return 'bg-gradient-to-br from-blue-400 to-cyan-500'
  if (level >= 10) return 'bg-gradient-to-br from-emerald-400 to-teal-500'
  return 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-500 dark:to-gray-600'
}

export default function Avatar({
  src,
  username,
  size = 'md',
  className = '',
  isOnline,
  level
}: AvatarProps) {
  const sizeClass = sizeClasses[size]
  const borderClass = borderClasses[size]
  const levelBadgeClass = levelBadgeSizes[size]

  const borderColorClass = level ? getLevelBorderColor(level) : 'border-transparent'
  const bgClass = level ? getLevelBg(level) : ''

  return (
    <div className={`relative inline-flex ${className}`}>
      {/* 主头像 */}
      <div
        className={`
          ${sizeClass} ${borderClass} ${borderColorClass} rounded-full
          overflow-hidden flex items-center justify-center
          shadow-md hover:shadow-lg transition-shadow duration-200
          ${bgClass}
          ${!src && !level ? 'bg-gradient-to-br from-game-100 to-game-200 dark:from-game-700 dark:to-game-800' : ''}
        `}
      >
        {src ? (
          <img
            src={src}
            alt={username || 'avatar'}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            role="img"
            aria-label="avatar"
            className={level ? 'drop-shadow-sm' : ''}
          >
            {getDefaultAvatar(username)}
          </span>
        )}
      </div>

      {/* 等级徽章 */}
      {level !== undefined && level > 0 && (
        <div
          className={`
            absolute -bottom-1 -right-1 ${levelBadgeClass}
            ${levelBadgeClass.includes('text-xs') ? 'px-1' : levelBadgeClass.includes('text-[8px]') ? 'px-0.5' : 'px-1.5'}
            ${getLevelBg(level)} rounded-full flex items-center justify-center
            border-2 border-white dark:border-gray-800
            shadow-lg font-bold text-white
          `}
        >
          {level}
        </div>
      )}

      {/* 在线状态指示 */}
      {isOnline !== undefined && (
        <div
          className={`
            absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full
            border-2 border-white dark:border-gray-800
            ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}
          `}
        />
      )}
    </div>
  )
}
