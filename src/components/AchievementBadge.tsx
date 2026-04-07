/**
 * 成就徽章组件
 */
import { ACHIEVEMENTS } from '../types'
import { getUserStats } from '../data/userData'

interface AchievementBadgeProps {
  achievementId: string
  size?: 'sm' | 'md' | 'lg'
  showDescription?: boolean
  isNew?: boolean
}

function AchievementBadge({ achievementId, size = 'md', showDescription = false, isNew = false }: AchievementBadgeProps) {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId)

  if (!achievement) return null

  const stats = getUserStats()
  const isUnlocked = stats.achievements.includes(achievementId)

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-lg',
    lg: 'w-14 h-14 text-xl',
  }

  return (
    <div className={`flex flex-col items-center ${!isUnlocked ? 'opacity-40 grayscale' : ''} ${isNew ? 'animate-glow' : ''}`}>
      <div className={`${sizeClasses[size]} rounded-full bg-soup-700 border border-ink-400/20
                       flex items-center justify-center transition-all
                       ${isNew ? 'border-amber-500/50 bg-amber-500/10' : ''}`}>
        {achievement.icon}
      </div>
      {showDescription && (
        <div className="text-center mt-1">
          <div className="text-xs text-white font-medium">{achievement.title}</div>
          <div className="text-xs text-ink-400">{achievement.description}</div>
        </div>
      )}
      {isNew && (
        <div className="text-xs text-amber-400 mt-1 font-medium">新!</div>
      )}
    </div>
  )
}

// 展示所有成就的网格
interface AchievementGridProps {
  newAchievements?: string[]
}

function AchievementGrid({ newAchievements = [] }: AchievementGridProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {ACHIEVEMENTS.map(achievement => (
        <AchievementBadge
          key={achievement.id}
          achievementId={achievement.id}
          size="md"
          showDescription={false}
          isNew={newAchievements.includes(achievement.id)}
        />
      ))}
    </div>
  )
}

export { AchievementBadge, AchievementGrid }
export default AchievementBadge
