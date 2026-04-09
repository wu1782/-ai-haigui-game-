/**
 * 成就解锁通知组件 - 增强版 3D 动画
 */
import { useState, useEffect, useCallback } from 'react'
import { ACHIEVEMENTS } from '../types/user'
import type { Achievement } from '../types/user'

interface AchievementToastProps {
  achievementId: string
  onDismiss: () => void
  autoDismissMs?: number
}

interface AchievementNotification {
  id: string
  achievementId: string
  timestamp: number
}

/**
 * 成就解锁通知组件
 * 带 3D 金币旋转、星星粒子爆发、全屏闪光动画
 */
export function AchievementToast({ achievementId, onDismiss, autoDismissMs = 5000 }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [showParticles, setShowParticles] = useState(false)
  const [showFlash, setShowFlash] = useState(false)

  const achievement: Achievement | undefined = ACHIEVEMENTS.find(a => a.id === achievementId)

  useEffect(() => {
    if (!achievement) return

    // 触发闪光效果
    const flashTimer = setTimeout(() => setShowFlash(true), 100)
    const particleTimer = setTimeout(() => setShowParticles(true), 200)
    const showTimer = setTimeout(() => setIsVisible(true), 50)

    // 自动消失
    const dismissTimer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(onDismiss, 500)
    }, autoDismissMs)

    return () => {
      clearTimeout(flashTimer)
      clearTimeout(particleTimer)
      clearTimeout(showTimer)
      clearTimeout(dismissTimer)
    }
  }, [autoDismissMs, onDismiss, achievement])

  if (!achievement) return null

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(onDismiss, 500)
  }

  return (
    <>
      {/* 全屏闪光效果 */}
      {showFlash && (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          <div className={`absolute inset-0 bg-gradient-to-r from-amber-400/50 via-yellow-300/30 to-amber-400/50 animate-flash ${isLeaving ? 'opacity-0' : 'opacity-100'}`} />
        </div>
      )}

      {/* 粒子爆发效果 */}
      {showParticles && (
        <div className="fixed top-24 right-20 z-[55] pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-amber-400 rounded-full animate-particle"
              style={{
                animationDelay: `${i * 30}ms`,
                '--angle': `${i * 30}deg`,
                transform: `rotate(${i * 30}deg) translateY(-30px)`
              } as React.CSSProperties}
            />
          ))}
          {[...Array(8)].map((_, i) => (
            <div
              key={`star-${i}`}
              className="absolute text-amber-400 animate-particle-text"
              style={{
                animationDelay: `${i * 40}ms`,
                fontSize: '12px',
                '--angle': `${i * 45}deg`,
                transform: `rotate(${i * 45}deg) translateY(-40px)`
              } as React.CSSProperties}
            >
              ⭐
            </div>
          ))}
        </div>
      )}

      {/* 主通知卡片 */}
      <div
        className={`fixed top-24 right-4 z-50 transition-all duration-500 ${
          isVisible && !isLeaving
            ? 'translate-x-0 opacity-100 scale-100'
            : 'translate-x-full opacity-0 scale-95'
        }`}
      >
        <div className="relative">
          {/* 3D 金币旋转装饰 */}
          <div className="absolute -top-6 -left-6 -right-6 -bottom-6 flex items-center justify-center pointer-events-none">
            <div className={`w-20 h-20 rounded-full border-4 border-amber-400/30 ${isVisible ? 'animate-coin-rotate' : ''}`}
                 style={{ animation: isVisible ? 'coinRotate 2s ease-in-out infinite' : 'none' }} />
          </div>

          <div className="relative bg-gradient-to-r from-amber-500/95 to-orange-500/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl shadow-amber-500/30 border border-amber-400/30 min-w-[300px] max-w-[340px] overflow-hidden">
            {/* 顶部装饰线 */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-300 to-transparent" />

            <div className="flex items-start gap-3">
              {/* 成就图标 - 带 3D 翻转动画 */}
              <div className="relative">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400/30 to-orange-400/30 border border-amber-300/40 flex items-center justify-center text-2xl shadow-lg transition-all duration-500`}
                     style={{ transformStyle: 'preserve-3d', transform: isVisible ? 'rotateY(360deg)' : 'rotateY(0deg)' }}>
                  {String(achievement.icon)}
                </div>
                {/* 环绕光环 */}
                <div className="absolute inset-0 rounded-xl border-2 border-amber-300/50 animate-pulse" />
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-100 text-xs font-medium">🏆 成就解锁</span>
                </div>
                <div className="text-white font-bold text-base truncate">
                  {achievement.title}
                </div>
                <div className="text-amber-100/80 text-xs mt-0.5 line-clamp-2">
                  {achievement.description}
                </div>
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={handleDismiss}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-amber-100/60 hover:text-white transition-colors shrink-0"
              >
                <span className="text-xs">×</span>
              </button>
            </div>

            {/* 进度条 - 带动画 */}
            <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 rounded-full animate-progress"
                style={{
                  animationDuration: `${autoDismissMs}ms`,
                  animationTimingFunction: 'linear'
                }}
              />
            </div>

            {/* 底部装饰 */}
            <div className="mt-2 flex items-center justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-amber-300/50 rounded-full animate-twinkle"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes coinRotate {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }

        @keyframes flash {
          0% { opacity: 0; }
          20% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes particle {
          0% {
            opacity: 1;
            transform: rotate(var(--angle)) translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: rotate(var(--angle)) translateY(-80px) scale(0);
          }
        }

        @keyframes particle-text {
          0% {
            opacity: 1;
            transform: rotate(var(--angle)) translateY(0) scale(1);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: rotate(var(--angle)) translateY(-100px) scale(0.5);
          }
        }

        @keyframes progress {
          0% { width: 100%; }
          100% { width: 0%; }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .animate-flash {
          animation: flash 0.5s ease-out forwards;
        }

        .animate-particle {
          animation: particle 1s ease-out forwards;
        }

        .animate-particle-text {
          animation: particle-text 1.5s ease-out forwards;
        }

        .animate-progress {
          animation: progress linear forwards;
        }

        .animate-twinkle {
          animation: twinkle 1.5s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}

/**
 * 成就通知管理器
 */
export function useAchievementNotifications() {
  const [notifications, setNotifications] = useState<AchievementNotification[]>([])

  const showAchievement = useCallback((achievementId: string) => {
    const id = `notif-${Date.now()}-${Math.random()}`
    setNotifications(prev => [...prev, { id, achievementId, timestamp: Date.now() }])
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const showAchievements = useCallback((achievementIds: string[]) => {
    const newNotifications = achievementIds.map((achievementId, index) => ({
      id: `notif-${Date.now()}-${index}`,
      achievementId,
      timestamp: Date.now() + index * 800
    }))
    setNotifications(prev => [...prev, ...newNotifications])
  }, [])

  return {
    notifications,
    showAchievement,
    showAchievements,
    dismissNotification
  }
}

/**
 * 成就通知容器
 */
export function AchievementToastContainer({
  notifications,
  onDismiss
}: {
  notifications: AchievementNotification[]
  onDismiss: (id: string) => void
}) {
  return (
    <>
      {notifications.map((notification) => (
        <AchievementToast
          key={notification.id}
          achievementId={notification.achievementId}
          onDismiss={() => onDismiss(notification.id)}
        />
      ))}
    </>
  )
}
