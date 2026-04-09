/**
 * 成就徽章组件 - 3D 翻转效果
 */
import { memo } from 'react'
import { ACHIEVEMENTS } from '../types/user'
import { getUserStats } from '../data/userData'

interface AchievementBadgeProps {
  achievementId: string
  size?: 'sm' | 'md' | 'lg'
  showDescription?: boolean
  isNew?: boolean
  isFlipped?: boolean
}

function AchievementBadge({
  achievementId,
  size = 'md',
  showDescription = false,
  isNew = false,
  isFlipped = false
}: AchievementBadgeProps) {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId)
  const stats = getUserStats()
  const isUnlocked = stats.achievements.includes(achievementId)

  const sizeClasses = {
    sm: { container: 'w-12 h-12', text: 'text-base', badge: 'text-xs' },
    md: { container: 'w-16 h-16', text: 'text-xl', badge: 'text-sm' },
    lg: { container: 'w-20 h-20', text: 'text-2xl', badge: 'text-base' }
  }

  if (!achievement) return null

  return (
    <div
      className={`relative group perspective-500 ${!isUnlocked ? 'opacity-50' : ''}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* 3D 翻转效果 */}
      <div
        className={`
          relative ${sizeClasses[size].container} rounded-full
          transition-all duration-500 cursor-pointer
          group-hover:scale-110
          ${isNew ? 'animate-glow-pulse' : ''}
        `}
        style={{
          transformStyle: 'preserve-3d',
          perspective: '500px',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* 正面 */}
        <div
          className={`
            absolute inset-0 rounded-full
            bg-gradient-to-br from-amber-500/20 to-orange-500/20
            border-2 border-amber-400/30
            flex items-center justify-center
            ${sizeClasses[size].text}
            transition-all duration-300
            group-hover:border-amber-400/50
            ${isNew ? 'border-amber-500 shadow-lg shadow-amber-500/30' : ''}
          `}
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          {achievement.icon}
        </div>

        {/* 背面 (解锁后显示) */}
        {isUnlocked && (
          <div
            className={`
              absolute inset-0 rounded-full
              bg-gradient-to-br from-amber-500 to-orange-500
              flex flex-col items-center justify-center
              ${sizeClasses[size].text}
              shadow-lg
            `}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <span className={sizeClasses[size].text}>{achievement.icon}</span>
          </div>
        )}

        {/* 解锁光环 */}
        {isUnlocked && (
          <div className="absolute inset-0 rounded-full animate-pulse">
            <div className="absolute inset-1 rounded-full border-2 border-amber-400/20" />
          </div>
        )}
      </div>

      {/* 显示描述 */}
      {showDescription && (
        <div className="text-center mt-2">
          <div className={`${sizeClasses[size].badge} text-white font-medium`}>{achievement.title}</div>
          <div className="text-[10px] text-gray-400">{achievement.description}</div>
        </div>
      )}

      {/* 新成就标记 */}
      {isNew && (
        <div className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[8px] font-bold bg-amber-500 text-white rounded-full animate-bounce-soft">
          新
        </div>
      )}
    </div>
  )
}

// 成就网格
interface AchievementGridProps {
  newAchievements?: string[]
}

function AchievementGrid({ newAchievements = [] }: AchievementGridProps) {
  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {ACHIEVEMENTS.map(achievement => (
        <AchievementBadge
          key={achievement.id}
          achievementId={achievement.id}
          size="md"
          showDescription={true}
          isNew={newAchievements.includes(achievement.id)}
        />
      ))}
    </div>
  )
}

// 成就解锁特效组件
interface AchievementUnlockEffectProps {
  achievementId: string
  onComplete?: () => void
  duration?: number
}

export function AchievementUnlockEffect({
  achievementId,
  onComplete,
  duration = 3000
}: AchievementUnlockEffectProps) {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId)

  if (!achievement) return null

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center unlock-overlay"
      style={{ animationDuration: `${duration}ms` }}
    >
      {/* 中心成就 */}
      <div
        className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-5xl shadow-2xl shadow-amber-500/50 unlock-icon"
        style={{ animationDuration: `${duration * 0.6}ms` }}
      >
        {achievement.icon}
      </div>

      {/* 环绕粒子 */}
      {[...Array(16)].map((_, i) => (
        <div
          key={i}
          className="absolute w-4 h-4 bg-amber-400 rounded-full unlock-orbit"
          style={{
            animationDelay: `${i * 50}ms`,
            '--angle': `${i * 22.5}deg`
          } as React.CSSProperties}
        />
      ))}

      {/* 星星爆发 */}
      {[...Array(20)].map((_, i) => (
        <div
          key={`star-${i}`}
          className="absolute text-2xl unlock-star"
          style={{
            animationDelay: `${i * 30}ms`,
            '--burst-angle': `${i * 18}deg`,
            '--burst-distance': `${100 + Math.random() * 100}px`
          } as React.CSSProperties}
        >
          ⭐
        </div>
      ))}
    </div>
  )
}

export { AchievementBadge, AchievementGrid }
export default AchievementBadge
