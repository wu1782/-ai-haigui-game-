/**
 * 用户状态与成就下拉组件
 * 包含登录按钮 / 头像 + 等级光环 / 下拉菜单（用户信息、成就、统计、设置、退出）
 */
import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Avatar from './Avatar'
import { AchievementBadge } from './AchievementBadge'
import { getUserStats } from '../data/userData'
import { RANKS } from '../types/user'

// ==================== 类型定义 ====================

/** 用户资料完整信息 */
export interface UserProfile {
  avatar?: string
  username: string
  level: number
  title: string
  currentExp: number
  maxExp: number
  totalGames: number
  totalWins: number
  solvedCount: number
  perfectSolve: number
  achievements: string[]
}

// ==================== 工具函数 ====================

/** 根据等级获取渐变色 */
function getLevelGradient(level: number): { ring: string; bg: string; text: string } {
  if (level >= 10) return { ring: 'from-amber-400 to-orange-500', bg: 'from-amber-400/20 to-orange-500/20', text: 'text-amber-400' }
  if (level >= 8) return { ring: 'from-purple-400 to-pink-500', bg: 'from-purple-400/20 to-pink-500/20', text: 'text-purple-400' }
  if (level >= 6) return { ring: 'from-blue-400 to-cyan-500', bg: 'from-blue-400/20 to-cyan-500/20', text: 'text-blue-400' }
  if (level >= 4) return { ring: 'from-emerald-400 to-teal-500', bg: 'from-emerald-400/20 to-teal-500/20', text: 'text-emerald-400' }
  return { ring: 'from-gray-300 to-gray-400', bg: 'from-gray-300/20 to-gray-400/20', text: 'text-gray-400' }
}

// ==================== 自定义 Hook ====================

/** 点击外部关闭 */
function useClickOutside(ref: React.RefObject<HTMLElement | null>, callback: () => void) {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, callback])
}

// ==================== Mock 数据（用于预览） ====================

export const MOCK_USER_PROFILE: UserProfile = {
  avatar: undefined,
  username: '推理达人',
  level: 4,
  title: '汤高手',
  currentExp: 450,
  maxExp: 1000,
  totalGames: 47,
  totalWins: 23,
  solvedCount: 23,
  perfectSolve: 8,
  achievements: ['first_win', 'win_10', 'win_streak_3', 'perfect_5', 'medium_clear', 'easy_clear', 'play_20', 'question_3'],
}

// ==================== 子组件 ====================

/** 经验值进度条 */
function ExpProgressBar({ current, max, level }: { current: number; max: number; level: number }) {
  const progress = Math.min((current / max) * 100, 100)
  const gradient = getLevelGradient(level)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-gray-400">
          <span>✨</span>
          经验值
        </span>
        <span className="font-medium text-gray-300">
          {current} / {max} EXP
        </span>
      </div>
      <div className="relative h-2 bg-dark-700/80 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${gradient.ring} rounded-full transition-all duration-500 relative`}
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </div>
    </div>
  )
}

/** 菜单列表项 */
interface MenuItemProps {
  icon: string
  label: string
  badge?: string | number
  onClick?: () => void
  to?: string
  variant?: 'default' | 'danger'
}

function MenuItem({ icon, label, badge, onClick, to, variant = 'default' }: MenuItemProps) {
  const isDanger = variant === 'danger'

  const content = (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 text-sm
        transition-all duration-200 group
        ${isDanger
          ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
          : 'text-gray-300 hover:text-white hover:bg-white/10'
        }
      `}
    >
      <span className={`
        w-8 h-8 rounded-lg flex items-center justify-center text-lg
        transition-transform duration-200 group-hover:translate-x-0.5
        ${isDanger ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400'}
      `}>
        {icon}
      </span>

      <span className="flex-1 text-left group-hover:translate-x-0.5 transition-transform duration-200">
        {label}
      </span>

      {badge !== undefined && (
        <span className={`
          px-2 py-0.5 text-xs font-bold rounded-full
          ${isDanger ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400'}
        `}>
          {badge}
        </span>
      )}

      <span className="w-4 h-4 text-gray-500 opacity-0 -rotate-90 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 flex items-center justify-center text-sm">
        ›
      </span>
    </button>
  )

  if (to) {
    return <Link to={to}>{content}</Link>
  }
  return content
}

// ==================== 主组件 ====================

/**
 * 用户状态下拉组件
 * - 未登录：显示紫色登录按钮
 * - 已登录：显示头像 + 等级光环，点击展开下拉菜单
 */
export default function UserProfileDropdown() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useClickOutside(dropdownRef, () => setIsOpen(false))

  // 获取本地统计
  const localStats = getUserStats()

  // 构建用户资料（优先使用 user 数据，否则使用本地统计）
  const profile: UserProfile | null = user
    ? {
        avatar: user.avatar,
        username: user.username,
        level: user.stats?.rank || localStats.rank || 1,
        title: RANKS.find(r => r.level === (user.stats?.rank || localStats.rank || 1))?.title || '汤新人',
        currentExp: user.stats?.totalGames ? user.stats.totalGames * 10 : localStats.totalGames * 10,
        maxExp: 100,
        totalGames: user.stats?.totalGames || localStats.totalGames || 0,
        totalWins: user.stats?.totalWins || localStats.totalWins || 0,
        solvedCount: user.stats?.totalWins || localStats.totalWins || 0,
        perfectSolve: localStats.perfectGames || 0,
        achievements: user.stats?.achievements || localStats.achievements || [],
      }
    : null

  const gradient = profile ? getLevelGradient(profile.level) : null

  // 未登录状态：显示紫色登录按钮
  if (!isAuthenticated || !user) {
    return (
      <Link
        to="/auth"
        className="px-5 py-2.5 bg-gradient-to-r from-game-500 to-purple-500 hover:from-game-600 hover:to-purple-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-game-500/30 transition-all active:scale-95"
      >
        登录
      </Link>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 头像触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/10 transition-colors group"
      >
        <div className="relative">
          {/* 等级光环 */}
          <div
            className={`absolute -inset-1.5 rounded-full bg-gradient-to-r ${gradient?.ring} opacity-40 blur-sm group-hover:opacity-60 transition-opacity -z-10`}
          />
          <Avatar
            src={profile.avatar}
            username={profile.username}
            size="md"
            level={profile.level}
          />
        </div>
        <span className="text-gray-700 dark:text-gray-200 text-sm font-medium hidden sm:inline">
          {profile.username}
        </span>
        <span className={`w-4 h-4 flex items-center justify-center text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* 下拉菜单 */}
      <div
        className={`absolute right-0 top-full mt-2 w-80 origin-top-right transition-all duration-200 ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
          {/* 顶部用户信息区域 */}
          <div className={`relative p-4 bg-gradient-to-br ${gradient?.bg} border-b border-white/5`}>
            {/* 装饰 */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full" />

            <div className="relative flex items-center gap-3">
              {/* 头像带光环 */}
              <div className="relative">
                <div
                  className={`absolute -inset-1.5 rounded-full bg-gradient-to-r ${gradient?.ring} opacity-30 blur-md -z-10`}
                />
                <Avatar
                  src={profile.avatar}
                  username={profile.username}
                  size="lg"
                  level={profile.level}
                />
              </div>

              {/* 用户名 & 等级 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-white truncate">{profile.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r ${gradient?.ring} text-white`}>
                    Lv.{profile.level}
                  </span>
                  <span className="text-sm text-gray-300">{profile.title}</span>
                </div>
              </div>
            </div>

            {/* 经验值进度条 */}
            <div className="mt-3">
              <ExpProgressBar current={profile.currentExp} max={profile.maxExp} level={profile.level} />
            </div>
          </div>

          {/* 已解锁成就展示 */}
          {profile.achievements.length > 0 && (
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <span>🏆</span>
                  已解锁成就
                </span>
                <span className="text-xs text-gray-500">{profile.achievements.length} 个</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {profile.achievements.slice(0, 8).map((achId) => (
                  <AchievementBadge key={achId} achievementId={achId} size="sm" />
                ))}
                {profile.achievements.length > 8 && (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
                    +{profile.achievements.length - 8}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 统计信息 */}
          <div className="px-4 py-3 border-b border-white/5">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-white/5">
                <div className="text-lg font-bold text-white">{profile.totalGames}</div>
                <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                  <span>📖</span>
                  总局数
                </div>
              </div>
              <div className="text-center p-2 rounded-lg bg-white/5">
                <div className="text-lg font-bold text-emerald-400">{profile.solvedCount}</div>
                <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                  <span>📈</span>
                  已解谜
                </div>
              </div>
              <div className="text-center p-2 rounded-lg bg-white/5">
                <div className="text-lg font-bold text-amber-400">{profile.perfectSolve}</div>
                <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                  <span>❓</span>
                  完美解
                </div>
              </div>
            </div>
          </div>

          {/* 菜单列表 */}
          <div className="p-2 space-y-0.5">
            <MenuItem
              icon="🏆"
              label="我的成就"
              badge={profile.achievements.length}
              to="/achievements"
            />
            <MenuItem
              icon="📖"
              label="已解开的汤"
              to="/profile?tab=solved"
            />
            <MenuItem
              icon="💬"
              label="我的提问统计"
              to="/profile?tab=questions"
            />
            <MenuItem
              icon="⚙️"
              label="设置"
              to="/profile?tab=settings"
            />

            {/* 分割线 */}
            <div className="my-2 border-t border-white/5" />

            <MenuItem
              icon="🚪"
              label="退出登录"
              variant="danger"
              onClick={() => {
                setIsOpen(false)
                logout()
                navigate('/')
              }}
            />
          </div>

          {/* 底部装饰 */}
          <div className={`h-1 bg-gradient-to-r ${gradient?.ring} opacity-60`} />
        </div>
      </div>
    </div>
  )
}
