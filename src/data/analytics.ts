// 游戏统计分析 - 追踪玩家行为数据
// 用于分析热门问题、失败率、难度统计等

import type { GameRecord } from '../types/game'
import { STORAGE_KEYS } from '../constants'

/**
 * 问题分析数据结构
 */
export interface QuestionAnalysis {
  question: string
  count: number
  successRate: number  // 问这个问题后最终胜利的比例
  avgQuestionsAfter: number  // 问这个问题后还需要多少问题才能解答
}

/**
 * 故事失败率统计
 */
export interface StoryFailureStats {
  storyId: string
  title: string
  totalPlays: number
  failCount: number
  failRate: number
  avgQuestionCount: number
  avgTime: number  // 平均通关时间(ms)
}

/**
 * 难度统计
 */
export interface DifficultyStats {
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  totalPlays: number
  winCount: number
  winRate: number
  avgQuestions: number
  avgTime: number
}

/**
 * 热门问题数据结构
 */
export interface PopularQuestion {
  question: string
  normalizedQuestion: string  // 标准化后的问题（去掉细节保留结构）
  playCount: number
  winRate: number
  avgPosition: number  // 平均在第几个问题出现
}

/**
 * 玩家统计
 */
export interface PlayerStats {
  totalGames: number
  totalWins: number
  totalQuestions: number
  totalTime: number
  currentStreak: number
  maxStreak: number
  favoriteDimension: string  // 最常问的维度
  achievementProgress: Record<string, number>  // 成就进度
}

// 本地存储键
const ANALYTICS_KEY = 'turtle-soup-analytics'

/**
 * 获取分析数据
 */
function getAnalyticsData(): Record<string, unknown> {
  try {
    const data = localStorage.getItem(ANALYTICS_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

/**
 * 保存分析数据
 */
function saveAnalyticsData(data: Record<string, unknown>): void {
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('Failed to save analytics:', e)
  }
}

/**
 * 标准化问题文本（用于聚合相似问题）
 */
function normalizeQuestion(question: string): string {
  return question
    // 移除具体数字
    .replace(/\d+/g, 'X')
    // 移除标点
    .replace(/[？?。，！!,.!?]/g, '')
    // 转小写
    .toLowerCase()
    .trim()
}

/**
 * 判断问题维度
 */
function getQuestionDimension(question: string): string {
  const q = question.toLowerCase()
  if (q.includes('谁') || q.includes('什么人') || q.includes('身份')) return '人物'
  if (q.includes('什么') && (q.includes('东西') || q.includes('物品') || q.includes('东西'))) return '物品'
  if (q.includes('在哪里') || q.includes('在哪') || q.includes('地点')) return '位置'
  if (q.includes('什么时候') || q.includes('时间') || q.includes('几点')) return '时间'
  if (q.includes('为什么') || q.includes('为何') || q.includes('原因')) return '原因'
  if (q.includes('做了') || q.includes('发生') || q.includes('事件')) return '事件'
  if (q.includes('是') && !q.includes('不是') && q.length < 15) return '确认'
  return '其他'
}

/**
 * 记录一局游戏的问题
 */
export function recordGameQuestions(
  storyId: string,
  questions: Array<{ question: string; answer: string }>,
  isWin: boolean,
  endType: 'guess' | 'giveup' | 'timeout'
): void {
  const analytics = getAnalyticsData()

  // 初始化数据结构
  if (!analytics.questionStats) {
    analytics.questionStats = {}
  }
  if (!analytics.storyStats) {
    analytics.storyStats = {}
  }

  const questionStats = analytics.questionStats as Record<string, QuestionAnalysis>
  const storyStats = analytics.storyStats as Record<string, StoryFailureStats>

  // 更新问题统计
  questions.forEach((item, index) => {
    const normalizedQ = normalizeQuestion(item.question)
    const dimension = getQuestionDimension(item.question)

    if (!questionStats[normalizedQ]) {
      questionStats[normalizedQ] = {
        question: item.question,
        count: 0,
        successRate: 0,
        avgQuestionsAfter: 0
      }
    }

    const stats = questionStats[normalizedQ]
    stats.count++

    // 更新后续问题统计（简化处理）
    if (isWin) {
      const remainingQuestions = questions.length - index - 1
      stats.avgQuestionsAfter = (stats.avgQuestionsAfter * (stats.count - 1) + remainingQuestions) / stats.count
    }
  })

  // 更新故事统计
  if (!storyStats[storyId]) {
    storyStats[storyId] = {
      storyId,
      title: '',
      totalPlays: 0,
      failCount: 0,
      failRate: 0,
      avgQuestionCount: 0,
      avgTime: 0
    }
  }

  const sStats = storyStats[storyId]
  sStats.totalPlays++
  if (!isWin) {
    sStats.failCount++
  }
  sStats.failRate = sStats.failCount / sStats.totalPlays
  sStats.avgQuestionCount = (sStats.avgQuestionCount * (sStats.totalPlays - 1) + questions.length) / sStats.totalPlays

  saveAnalyticsData(analytics)
}

/**
 * 获取热门问题
 */
export function getPopularQuestions(limit: number = 10): PopularQuestion[] {
  const analytics = getAnalyticsData()
  const questionStats = (analytics.questionStats || {}) as Record<string, QuestionAnalysis>

  const questions = Object.values(questionStats)
    .filter(q => q.count >= 3)  // 至少出现3次才计入
    .map(q => ({
      question: q.question,
      normalizedQuestion: normalizeQuestion(q.question),
      playCount: q.count,
      winRate: q.successRate,
      avgPosition: q.avgQuestionsAfter
    }))
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, limit)

  return questions
}

/**
 * 获取失败率最高的故事
 */
export function getHardestStories(limit: number = 5): StoryFailureStats[] {
  const analytics = getAnalyticsData()
  const storyStats = (analytics.storyStats || {}) as Record<string, StoryFailureStats>

  return Object.values(storyStats)
    .filter(s => s.totalPlays >= 5)  // 至少5次游玩
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, limit)
}

/**
 * 获取各难度统计
 */
export function getDifficultyStats(): DifficultyStats[] {
  const analytics = getAnalyticsData()
  const records = (analytics.recentRecords || []) as GameRecord[]

  const statsByDifficulty: Record<string, DifficultyStats> = {
    easy: { difficulty: 'easy', totalPlays: 0, winCount: 0, winRate: 0, avgQuestions: 0, avgTime: 0 },
    medium: { difficulty: 'medium', totalPlays: 0, winCount: 0, winRate: 0, avgQuestions: 0, avgTime: 0 },
    hard: { difficulty: 'hard', totalPlays: 0, winCount: 0, winRate: 0, avgQuestions: 0, avgTime: 0 },
    extreme: { difficulty: 'extreme', totalPlays: 0, winCount: 0, winRate: 0, avgQuestions: 0, avgTime: 0 }
  }

  // 这个功能需要故事难度信息，需要从外部传入
  // 简化实现，返回空统计
  return Object.values(statsByDifficulty)
}

/**
 * 获取热门问题维度分布
 */
export function getDimensionDistribution(): Record<string, number> {
  const popularQuestions = getPopularQuestions(50)
  const distribution: Record<string, number> = {}

  popularQuestions.forEach(q => {
    const dimension = getQuestionDimension(q.question)
    distribution[dimension] = (distribution[dimension] || 0) + q.playCount
  })

  return distribution
}

/**
 * 获取推荐问题（基于热门和当前位置）
 */
export function getRecommendedQuestions(
  currentDimension: string,
  askedDimensions: string[],
  limit: number = 5
): string[] {
  const popularQuestions = getPopularQuestions(100)

  // 过滤掉已问过的维度
  const recommendations = popularQuestions
    .filter(q => {
      const dimension = getQuestionDimension(q.question)
      return !askedDimensions.includes(dimension)
    })
    .slice(0, limit)
    .map(q => q.question)

  return recommendations
}

/**
 * 清除所有分析数据
 */
export function clearAnalytics(): void {
  localStorage.removeItem(ANALYTICS_KEY)
}

/**
 * 导出分析数据（用于调试）
 */
export function exportAnalytics(): string {
  return JSON.stringify(getAnalyticsData(), null, 2)
}
