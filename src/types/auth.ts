/**
 * 认证相关类型定义
 */

export interface User {
  id: string
  username: string
  email: string
  avatar?: string  // Base64 格式的头像
  role?: 'user' | 'admin'
  stats: UserStats
  createdAt?: string
}

export interface UserStats {
  totalGames: number
  totalWins: number
  totalLosses: number
  currentStreak: number
  bestStreak: number
  winRate: number
  perfectGames: number
  achievements: string[]
  rank: number
  lastPlayedAt?: string
  difficultyWins?: Record<string, number>
}

export interface AuthResponse {
  message: string
  token: string
  user: User
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterCredentials {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}
