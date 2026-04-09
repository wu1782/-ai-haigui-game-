/**
 * 游戏数据分析 Hook
 * 收集和分析用户游戏数据
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { STORAGE_KEYS } from '../constants'

interface GameRecord {
  storyId: string
  playedAt: string
  questionCount: number
  isWin: boolean
  endType: 'guess' | 'giveup'
  difficulty?: string
  timeSpent?: number
}

interface GameAnalytics {
  totalGames: number
  totalWins: number
  totalLosses: number
  winRate: number
  averageQuestions: number
  bestPerformance: {
    storyId: string
    questions: number
    date: string
  } | null
  difficultyBreakdown: Record<string, { total: number; wins: number; winRate: number }>
  recentTrend: number[] // 最近10场的胜率趋势
  favoriteDifficulty: string | null
  mostUsedHints: string[]
  averageTimePerGame: number
  playingTimeDistribution: number[]
  achievementProgress: Record<string, number>
}

const DEFAULT_ANALYTICS: GameAnalytics = {
  totalGames: 0,
  totalWins: 0,
  totalLosses: 0,
  winRate: 0,
  averageQuestions: 0,
  bestPerformance: null,
  difficultyBreakdown: {},
  recentTrend: [],
  favoriteDifficulty: null,
  mostUsedHints: [],
  averageTimePerGame: 0,
  playingTimeDistribution: [],
  achievementProgress: {}
}

export function useAnalytics(): GameAnalytics {
  const [analytics, setAnalytics] = useState<GameAnalytics>(DEFAULT_ANALYTICS)
  const [isLoading, setIsLoading] = useState(true)

  // 加载数据
  const loadAnalytics = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RECORDS)
      const records: GameRecord[] = saved ? JSON.parse(saved) : []

      if (records.length === 0) {
        setAnalytics(DEFAULT_ANALYTICS)
        setIsLoading(false)
        return
      }

      // 基本统计
      const totalGames = records.length
      const totalWins = records.filter(r => r.isWin).length
      const totalLosses = totalGames - totalWins
      const winRate = Math.round((totalWins / totalGames) * 100)

      // 平均提问数
      const totalQuestions = records.reduce((sum, r) => sum + r.questionCount, 0)
      const averageQuestions = Math.round(totalQuestions / totalGames * 10) / 10

      // 最佳表现
      const wins = records.filter(r => r.isWin)
      const bestPerformance = wins.length > 0
        ? wins.reduce((best, record) =>
            record.questionCount < best.questions ? {
              storyId: record.storyId,
              questions: record.questionCount,
              date: record.playedAt
            } : best,
            { storyId: '', questions: Infinity, date: '' }
          )
        : null

      // 难度分布
      const difficultyBreakdown: Record<string, { total: number; wins: number; winRate: number }> = {}
      records.forEach(record => {
        const difficulty = record.difficulty || 'unknown'
        if (!difficultyBreakdown[difficulty]) {
          difficultyBreakdown[difficulty] = { total: 0, wins: 0, winRate: 0 }
        }
        difficultyBreakdown[difficulty].total++
        if (record.isWin) {
          difficultyBreakdown[difficulty].wins++
        }
        difficultyBreakdown[difficulty].winRate = Math.round(
          (difficultyBreakdown[difficulty].wins / difficultyBreakdown[difficulty].total) * 100
        )
      })

      // 最喜欢的难度
      const difficultyCounts = Object.entries(difficultyBreakdown)
        .filter(([_, data]) => data.total >= 2)
        .sort(([, a], [, b]) => b.total - a.total)
      const favoriteDifficulty = difficultyCounts.length > 0 ? difficultyCounts[0][0] : null

      // 最近趋势 (最近10场)
      const recentRecords = records.slice(-10)
      const recentTrend = recentRecords.map(r => r.isWin ? 1 : 0)
      const cumulativeWins: number[] = []
      let runningSum = 0
      recentRecords.forEach((r, i) => {
        runningSum += r.isWin ? 1 : 0
        cumulativeWins.push(Math.round((runningSum / (i + 1)) * 100))
      })

      // 平均游戏时长
      const totalTime = records.reduce((sum, r) => sum + (r.timeSpent || 0), 0)
      const averageTimePerGame = Math.round(totalTime / totalGames / 1000) // 转换为秒

      // 游戏时长分布
      const timeRanges = [0, 60, 120, 300, 600, 900, 1200] // 0-1min, 1-2min, 2-5min, 5-10min, 10-15min, 15-20min, 20min+
      const playingTimeDistribution = new Array(timeRanges.length).fill(0)
      records.forEach(record => {
        const time = record.timeSpent ? record.timeSpent / 1000 : 0 // 转换为秒
        for (let i = timeRanges.length - 1; i >= 0; i--) {
          if (time >= timeRanges[i]) {
            playingTimeDistribution[i]++
            break
          }
        }
      })

      // 成就进度
      const achievementProgress: Record<string, number> = {
        'first_win': totalWins >= 1 ? 100 : 0,
        'streak_3': Math.min(100, (totalWins / 3) * 100),
        'streak_5': Math.min(100, (totalWins / 5) * 100),
        'hard_mode': difficultyBreakdown['hard']?.wins >= 1 ? 100 : 0,
        'perfect_game': bestPerformance && bestPerformance.questions <= 3 ? 100 : 0,
        'dedicated_player': Math.min(100, (totalGames / 50) * 100)
      }

      setAnalytics({
        totalGames,
        totalWins,
        totalLosses,
        winRate,
        averageQuestions,
        bestPerformance,
        difficultyBreakdown,
        recentTrend,
        favoriteDifficulty,
        mostUsedHints: [],
        averageTimePerGame,
        playingTimeDistribution,
        achievementProgress
      })
    } catch (error) {
      console.error('Failed to load analytics:', error)
      setAnalytics(DEFAULT_ANALYTICS)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初始化加载
  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  // 刷新数据
  const refresh = useCallback(() => {
    setIsLoading(true)
    loadAnalytics()
  }, [loadAnalytics])

  return {
    ...analytics,
    isLoading,
    refresh
  }
}

// 格式化游戏时长
export function formatGameTime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${minutes}分${secs}秒` : `${minutes}分钟`
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}小时${minutes}分钟`
}

// 获取难度标签
export function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    easy: '入门',
    medium: '中等',
    hard: '困难',
    extreme: '极难',
    unknown: '未知'
  }
  return labels[difficulty] || difficulty
}
