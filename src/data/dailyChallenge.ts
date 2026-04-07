/**
 * 每日挑战数据层
 */
import { STORAGE_KEYS } from '../constants'
import { stories } from './stories'

export interface DailyChallenge {
  date: string  // YYYY-MM-DD
  storyId: string
  bonusMultiplier: number
  completed: boolean
  rewardClaimed: boolean
}

const DAILY_KEY = STORAGE_KEYS.DAILY_CHALLENGE || 'turtle-soup-daily'

/**
 * 获取今日日期字符串
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * 获取每日挑战
 */
export function getDailyChallenge(): DailyChallenge | null {
  try {
    const saved = localStorage.getItem(DAILY_KEY)
    const today = getTodayString()

    if (saved) {
      const challenge: DailyChallenge = JSON.parse(saved)
      if (challenge.date === today) {
        return challenge
      }
    }

    // 生成新的每日挑战
    const randomIndex = Math.floor(Math.random() * stories.length)
    const newChallenge: DailyChallenge = {
      date: today,
      storyId: stories[randomIndex].id,
      bonusMultiplier: 2.0,
      completed: false,
      rewardClaimed: false
    }

    localStorage.setItem(DAILY_KEY, JSON.stringify(newChallenge))
    return newChallenge
  } catch {
    return null
  }
}

/**
 * 完成每日挑战
 */
export function completeDailyChallenge(): void {
  const challenge = getDailyChallenge()
  if (challenge && !challenge.completed) {
    challenge.completed = true
    localStorage.setItem(DAILY_KEY, JSON.stringify(challenge))
  }
}

/**
 * 领取奖励
 */
export function claimDailyReward(): void {
  const challenge = getDailyChallenge()
  if (challenge && challenge.completed && !challenge.rewardClaimed) {
    challenge.rewardClaimed = true
    localStorage.setItem(DAILY_KEY, JSON.stringify(challenge))
  }
}

/**
 * 检查是否有未完成的今日挑战
 */
export function hasUncompletedDailyChallenge(): boolean {
  const challenge = getDailyChallenge()
  return challenge !== null && !challenge.completed
}

/**
 * 检查是否可以领取奖励
 */
export function canClaimDailyReward(): boolean {
  const challenge = getDailyChallenge()
  return challenge !== null && challenge.completed && !challenge.rewardClaimed
}

/**
 * 获取每日挑战的故事
 */
export function getDailyChallengeStory() {
  const challenge = getDailyChallenge()
  if (!challenge) return null
  return stories.find(s => s.id === challenge.storyId) || null
}
