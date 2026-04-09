/**
 * 用户数据管理
 * 处理 localStorage 读写和统计更新
 */
import type { UserStats } from '../types/auth'
import type { Achievement, UserRank, UserSettings } from '../types/user'
import { RANKS, ACHIEVEMENTS } from '../types/user'
import { STORAGE_KEYS } from '../constants'

const USER_STATS_KEY = STORAGE_KEYS.STATS
const USER_SETTINGS_KEY = STORAGE_KEYS.SETTINGS

// 默认用户统计
export const defaultUserStats: UserStats = {
  totalGames: 0,
  totalWins: 0,
  totalLosses: 0,
  currentStreak: 0,
  bestStreak: 0,
  winRate: 0,
  perfectGames: 0,
  achievements: [],
  rank: 1,
  difficultyWins: { easy: 0, medium: 0, hard: 0, extreme: 0 },
}

// 默认用户设置
export const defaultUserSettings: UserSettings = {
  soundEnabled: true,
  volume: 50,
  theme: 'dark',
  animationSpeed: 'normal',
}

// 获取用户统计
export const getUserStats = (): UserStats => {
  try {
    const saved = localStorage.getItem(USER_STATS_KEY)
    return saved ? { ...defaultUserStats, ...JSON.parse(saved) } : defaultUserStats
  } catch {
    return defaultUserStats
  }
}

// 保存用户统计
export const saveUserStats = (stats: UserStats): void => {
  localStorage.setItem(USER_STATS_KEY, JSON.stringify(stats))
}

// 获取用户设置
export const getUserSettings = (): UserSettings => {
  try {
    const saved = localStorage.getItem(USER_SETTINGS_KEY)
    return saved ? { ...defaultUserSettings, ...JSON.parse(saved) } : defaultUserSettings
  } catch {
    return defaultUserSettings
  }
}

// 保存用户设置
export const saveUserSettings = (settings: UserSettings): void => {
  localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings))
}

// 根据胜场数计算等级
export const calculateRank = (wins: number): number => {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (wins >= RANKS[i].minWins) return RANKS[i].level
  }
  return 1
}

// 检查成就解锁
// difficulty: 当前游戏的难度（仅在获胜时用于检查难度成就）
export const checkAchievements = (stats: UserStats, difficulty?: string): string[] => {
  const unlocked: string[] = [...stats.achievements]

  for (const achievement of ACHIEVEMENTS) {
    if (unlocked.includes(achievement.id)) continue

    let isUnlocked = false
    switch (achievement.type) {
      case 'win':
        isUnlocked = stats.totalWins >= (achievement.id === 'first_win' ? 1 : achievement.id === 'win_10' ? 10 : 50)
        break
      case 'streak':
        isUnlocked = stats.bestStreak >= (achievement.id === 'win_streak_3' ? 3 : 5)
        break
      case 'play':
        isUnlocked = stats.totalGames >= 20
        break
      case 'special':
        // special类型包含多种成就：完美游戏、3次内破案、20次内破案、收藏、回放等
        if (achievement.id === 'perfect_5') {
          isUnlocked = stats.perfectGames >= 1
        } else if (achievement.id === 'question_3') {
          // 3次内破案需要在游戏时额外检查，此处仅检查基础条件
          isUnlocked = stats.perfectGames >= 1 // 简化判断
        } else if (achievement.id === 'question_10') {
          isUnlocked = stats.totalGames >= 1 // 简化判断
        } else {
          isUnlocked = false
        }
        break
      case 'difficulty':
        // 难度成就：需要通关对应难度
        if (difficulty && stats.difficultyWins) {
          const diffMap: Record<string, string> = {
            'easy': 'easy_clear',
            'medium': 'medium_clear',
            'hard': 'hard_clear',
            'extreme': 'extreme_clear'
          }
          if (diffMap[difficulty] === achievement.id) {
            isUnlocked = (stats.difficultyWins[difficulty] || 0) >= 1
          }
        }
        break
    }

    if (isUnlocked) {
      unlocked.push(achievement.id)
    }
  }

  return unlocked
}

// 获取下一级需要的胜场
export const getNextRankWins = (currentRank: number): number => {
  const nextRank = RANKS.find(r => r.level === currentRank + 1)
  if (!nextRank) return 0
  const currentRankData = RANKS.find(r => r.level === currentRank)
  const currentWins = currentRankData?.minWins || 0
  return nextRank.minWins - currentWins
}

// 更新游戏后的统计
// difficulty: 游戏难度，用于解锁难度成就
export const updateStatsAfterGame = (isWin: boolean, questionCount: number, difficulty?: string): { stats: UserStats; newAchievements: string[] } => {
  const stats = getUserStats()
  const previousAchievements = [...stats.achievements]

  // 初始化 difficultyWins 如果不存在
  if (!stats.difficultyWins) {
    stats.difficultyWins = { easy: 0, medium: 0, hard: 0, extreme: 0 }
  }

  stats.totalGames++
  if (isWin) {
    stats.totalWins++
    stats.currentStreak++
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak
    }
    // 记录难度通关次数
    if (difficulty && stats.difficultyWins.hasOwnProperty(difficulty)) {
      stats.difficultyWins[difficulty]++
    }
    if (questionCount <= 5) {
      stats.perfectGames++
    }
  } else {
    stats.currentStreak = 0
    stats.totalLosses++
  }

  stats.winRate = Math.round((stats.totalWins / stats.totalGames) * 100)
  stats.lastPlayedAt = new Date().toISOString()
  stats.rank = calculateRank(stats.totalWins)

  // 检查新成就（传入难度用于检查难度成就）
  stats.achievements = checkAchievements(stats, difficulty)

  const newAchievements = stats.achievements.filter(a => !previousAchievements.includes(a))

  saveUserStats(stats)
  return { stats, newAchievements }
}

// 获取所有成就定义
export const getAllAchievements = (): Achievement[] => ACHIEVEMENTS

// 获取当前段位信息
export const getCurrentRank = (stats: UserStats): UserRank => {
  return RANKS.find(r => r.level === stats.rank) || RANKS[0]
}

// 计算连胜加成倍率
export const calculateStreakBonus = (streak: number): number => {
  if (streak <= 1) return 1.0
  if (streak === 2) return 1.1
  if (streak === 3) return 1.2
  if (streak === 4) return 1.3
  if (streak >= 5) return 1.5
  return 1.0
}

// 获取连胜加成显示文本
export const getStreakBonusText = (streak: number): string => {
  if (streak <= 1) return ''
  const bonus = calculateStreakBonus(streak)
  return `🔥 ${streak}连胜 x${bonus}`
}
