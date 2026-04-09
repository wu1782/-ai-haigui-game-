/**
 * 每日挑战数据层 - 服务端验证
 * 防止前端伪造挑战完成状态
 */
import { API_CONFIG } from '../constants'

export interface DailyChallengeProgress {
  date: string
  storyId: string
  bonusMultiplier: number
  maxQuestions: number
  progress: {
    status: 'in_progress' | 'completed' | 'give_up' | 'timeout' | 'failed'
    questions: number
    completed: boolean
    won: boolean
    startedAt: number
  } | null
}

export interface DailyChallengeStartResult {
  storyId: string
  title: string
  difficulty: string
  surface: string
  maxQuestions: number
  bonusMultiplier: number
  questions: number
}

export interface DailyChallengeCompleteResult {
  eligible: boolean
  bonusApplied: boolean
  bonusMultiplier: number
  reason: string
  completed: boolean
  won: boolean
}

// 获取 API Base URL
const getApiBaseUrl = () => {
  const base = API_CONFIG.AI_JUDGE.replace('/ai/judge', '')
  return base
}

const getApiUrl = (path: string) => {
  return `${getApiBaseUrl()}${path}`
}

/**
 * 获取今日每日挑战信息
 */
export async function getDailyChallenge(): Promise<DailyChallengeProgress | null> {
  try {
    const response = await fetch(getApiUrl('/daily-challenge'), {
      credentials: 'include'
    })
    if (!response.ok) {
      console.error('[DailyChallenge] Server error:', response.status, response.statusText)
      return null
    }
    const text = await response.text()
    if (!text) {
      return null
    }
    const data = JSON.parse(text)
    if (!data.data || !data.data.available) {
      return null
    }
    return data.data as DailyChallengeProgress
  } catch (error) {
    console.error('[DailyChallenge] Failed to get challenge:', error)
    return null
  }
}

/**
 * 开始每日挑战
 */
export async function startDailyChallenge(): Promise<DailyChallengeStartResult | null> {
  try {
    const response = await fetch(getApiUrl('/daily-challenge/start'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) {
      console.error('[DailyChallenge] Server error:', response.status, response.statusText)
      return null
    }
    const text = await response.text()
    if (!text) return null
    const data = JSON.parse(text)
    return data.data
  } catch (error) {
    console.error('[DailyChallenge] Failed to start challenge:', error)
    return null
  }
}

/**
 * 完成每日挑战（游戏结束时调用）
 */
export async function completeDailyChallenge(
  won: boolean,
  questionCount: number
): Promise<DailyChallengeCompleteResult | null> {
  try {
    const response = await fetch(getApiUrl('/daily-challenge/complete'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ won, questionCount })
    })
    if (!response.ok) {
      console.error('[DailyChallenge] Server error:', response.status, response.statusText)
      return null
    }
    const text = await response.text()
    if (!text) return null
    const data = JSON.parse(text)
    return data.data
  } catch (error) {
    console.error('[DailyChallenge] Failed to complete challenge:', error)
    return null
  }
}

/**
 * 获取每日挑战的故事（通过常规故事接口）
 */
export async function getDailyChallengeStory(): Promise<import('../types/story').TStory | null> {
  const challenge = await getDailyChallenge()
  if (!challenge) return null

  try {
    const response = await fetch(getApiUrl(`/stories/${challenge.storyId}`), {
      credentials: 'include'
    })
    if (!response.ok) {
      console.error('[DailyChallenge] Server error:', response.status, response.statusText)
      return null
    }
    const text = await response.text()
    if (!text) return null
    const data = JSON.parse(text)
    return data.data
  } catch (error) {
    console.error('[DailyChallenge] Failed to get story:', error)
    return null
  }
}

/**
 * 检查是否有未完成的今日挑战
 */
export async function hasUncompletedDailyChallenge(): Promise<boolean> {
  const challenge = await getDailyChallenge()
  return challenge !== null && challenge.progress !== null && !challenge.progress.completed
}

/**
 * 检查是否可以领取奖励
 */
export async function canClaimDailyReward(): Promise<boolean> {
  const challenge = await getDailyChallenge()
  return (
    challenge !== null &&
    challenge.progress !== null &&
    challenge.progress.completed &&
    challenge.progress.won
  )
}

/**
 * 领取每日挑战奖励
 */
export async function claimDailyReward(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(getApiUrl('/daily-challenge/claim'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) {
      console.error('[DailyChallenge] Server error:', response.status, response.statusText)
      return { success: false, message: '领取失败，请稍后重试' }
    }
    const text = await response.text()
    if (!text) return { success: false, message: '领取失败，请稍后重试' }
    const data = JSON.parse(text)
    if (data.success || data.code === 0) {
      return { success: true, message: '奖励领取成功！' }
    }
    return { success: false, message: data.message || '领取失败' }
  } catch (error) {
    console.error('[DailyChallenge] Failed to claim reward:', error)
    return { success: false, message: '领取失败，请稍后重试' }
  }
}
