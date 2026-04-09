/**
 * 共享常量
 */

// 难度配置 - 清晰的浅色/深色模式适配
export const DIFFICULTY_CONFIG = {
  easy: {
    label: '入门',
    bg: 'bg-emerald-100 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-300 dark:border-emerald-500/30'
  },
  medium: {
    label: '中等',
    bg: 'bg-amber-100 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-300 dark:border-amber-500/30'
  },
  hard: {
    label: '困难',
    bg: 'bg-red-100 dark:bg-red-500/20',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-300 dark:border-red-500/30'
  },
  extreme: {
    label: '极难',
    bg: 'bg-purple-100 dark:bg-purple-500/20',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-300 dark:border-purple-500/30'
  }
} as const

export type Difficulty = keyof typeof DIFFICULTY_CONFIG

// localStorage keys
export const STORAGE_KEYS = {
  RECORDS: 'turtle-soup-records',
  STATS: 'turtle-soup-stats',
  SETTINGS: 'turtle-soup-settings',
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
  CUSTOM_STORY: 'turtle-soup-custom-story',
  FAVORITES: 'turtle-soup-favorites',
  REPLAYS: 'turtle-soup-replays',
  DAILY_CHALLENGE: 'turtle-soup-daily',
  STORY_RATINGS: 'turtle-soup-ratings'
} as const

// API 配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

// 生产环境必须有 API_BASE_URL，否则请求会失败
const getApiUrl = (path: string) => {
  if (API_BASE_URL) {
    return `${API_BASE_URL}${path}`
  }
  // 开发环境使用相对路径，通过 Vite proxy 转发
  return path
}

export const API_CONFIG = {
  AI_JUDGE: getApiUrl('/api/v1/ai/judge'),
  AI_GENERATE: getApiUrl('/api/v1/ai/generate'),
  AI_HINT: getApiUrl('/api/v1/ai/hint'),
  CHAT: getApiUrl('/api/chat')
} as const
