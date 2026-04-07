/**
 * 故事评分数据层
 */
import { STORAGE_KEYS } from '../constants'

export interface StoryRating {
  storyId: string
  difficulty: number      // 1-5 用户认为的难度
  enjoyability: number    // 1-5 有趣程度
  ratedAt: string
}

const RATINGS_KEY = STORAGE_KEYS.STORY_RATINGS || 'turtle-soup-ratings'

/**
 * 获取所有评分
 */
export function getAllRatings(): Record<string, StoryRating> {
  try {
    const saved = localStorage.getItem(RATINGS_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

/**
 * 获取故事的评分
 */
export function getStoryRating(storyId: string): StoryRating | undefined {
  return getAllRatings()[storyId]
}

/**
 * 评分故事
 */
export function rateStory(storyId: string, difficulty: number, enjoyability: number): void {
  const ratings = getAllRatings()
  ratings[storyId] = {
    storyId,
    difficulty: Math.max(1, Math.min(5, difficulty)),
    enjoyability: Math.max(1, Math.min(5, enjoyability)),
    ratedAt: new Date().toISOString()
  }
  localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings))
}

/**
 * 检查是否已评分
 */
export function hasRated(storyId: string): boolean {
  return !!getAllRatings()[storyId]
}

/**
 * 获取故事的平均评分
 */
export function getAverageRatings(): { difficulty: number; enjoyability: number } {
  const ratings = Object.values(getAllRatings())
  if (ratings.length === 0) return { difficulty: 0, enjoyability: 0 }

  const totalDifficulty = ratings.reduce((sum, r) => sum + r.difficulty, 0)
  const totalEnjoyability = ratings.reduce((sum, r) => sum + r.enjoyability, 0)

  return {
    difficulty: totalDifficulty / ratings.length,
    enjoyability: totalEnjoyability / ratings.length
  }
}

/**
 * 获取评分数量
 */
export function getRatingCount(): number {
  return Object.keys(getAllRatings()).length
}
