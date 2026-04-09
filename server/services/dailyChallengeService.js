// 每日挑战服务 - 服务端统一管理（防前端伪造）
//
// 【规则定义】
// 1. 重置时间: UTC 0 点（次日 00:00 UTC 自动重置）
// 2. 挑战次数: 每天 1 次（开始挑战即消耗）
// 3. 完成条件: 在限定问题数内(20题)猜出答案
// 4. 放弃/超时/20题未破案 = 挑战失败，不返还次数
// 5. 奖励: 胜利后获得 2倍积分（bonusMultiplier）
//
// ⚠️ 生产环境警告：
// 当前实现使用内存存储挑战进度，存在以下限制：
// 1. 服务器重启后用户进行中的挑战会丢失
// 2. 多实例部署时不共享挑战进度
// 建议后续使用 Redis 或 MongoDB 存储挑战进度

import Story from '../db/models/Story.js'
import User from '../db/models/User.js'

// 每日挑战缓存（按日期存储故事，3天过期）
const dailyCache = new Map()
// 用户挑战进度缓存: odId -> { status, storyId, questions, startedAt, completed, won, challenge }
const challengeProgress = new Map()

const CHALLENGE_LIMIT = 1
const BONUS_MULTIPLIER = 2.0
const MAX_QUESTIONS = 20
const RESET_HOUR_UTC = 0
const CHALLENGE_TIMEOUT_MS = 30 * 60 * 1000 // 30分钟超时

/**
 * 调用 AI API 判定用户答案
 * @param {string} question - 用户的问题或猜测
 * @param {object} story - 故事对象，包含 surface 和 bottom
 * @param {boolean} isGuess - 是否为猜答案模式
 * @returns {Promise<{answer: string, isVictory: boolean}>}
 */
async function judgeWithAI(question, story, isGuess = false) {
  const apiKey = process.env.DEEPSEEK_API_KEY

  // 如果没有 API Key，返回错误
  if (!apiKey) {
    console.error('[DailyChallenge] DEEPSEEK_API_KEY not configured')
    throw new Error('AI service not available')
  }

  const judgeType = isGuess ? '猜答案' : '提问'
  const prompt = `你是"海龟汤"推理游戏的裁判。

【游戏规则】
- 玩家通过提问（只能问是非题）来推理故事真相
- 你只能回答："是"、"不是"、"与此无关"、"已破案"
- 只能回答单个词语，不需要解释

【判断标准】
- "是"：玩家问题与汤底事实一致
- "不是"：玩家问题与汤底事实矛盾
- "与此无关"：无法根据汤底判断
- "已破案"：玩家猜出了完整的汤底真相

【当前故事】
故事背景：${story.surface}
汤底：${story.bottom}

玩家${judgeType}：${question}

请判断并回答（只输出一个词）：`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        temperature: 0.1
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error('AI API error')
    }

    const data = await response.json()
    const answer = data.choices?.[0]?.message?.content?.trim() || '无法获取回答'
    const isVictory = answer === '已破案'

    return { answer, isVictory }
  } catch (error) {
    console.error('[DailyChallenge] AI judgment failed:', error.message)
    throw error
  }
}

/**
 * 获取今日 UTC 日期字符串
 */
export function getTodayUTC() {
  return new Date().toISOString().split('T')[0]
}

/**
 * 获取今日每日挑战故事
 */
export async function getTodayChallenge(odId = null) {
  const today = getTodayUTC()

  // 先检查缓存
  if (dailyCache.has(today)) {
    return dailyCache.get(today)
  }

  try {
    // 聚合查询随机选一个故事
    const count = await Story.countDocuments({ status: 'approved' })
    if (count === 0) return null

    const skip = Math.floor(Math.random() * Math.min(count, 100))
    const story = await Story.findOne({ status: 'approved' })
      .select('_id title difficulty surface bottom')
      .skip(skip)
      .lean()

    if (!story) return null

    const challenge = {
      date: today,
      storyId: story._id.toString(),
      title: story.title,
      difficulty: story.difficulty,
      surface: story.surface,
      bottom: story.bottom, // AI 判定需要汤底
      bonusMultiplier: BONUS_MULTIPLIER,
      maxQuestions: MAX_QUESTIONS
    }

    dailyCache.set(today, challenge)

    // 清理 3 天前的缓存
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    for (const key of dailyCache.keys()) {
      if (key < cutoff) dailyCache.delete(key)
    }

    return challenge
  } catch {
    return null
  }
}

/**
 * 获取用户当前挑战进度
 */
export function getChallengeProgress(odId) {
  const progress = challengeProgress.get(odId)
  if (!progress) return null

  // 检查是否超时
  if (Date.now() - progress.startedAt > CHALLENGE_TIMEOUT_MS) {
    challengeProgress.delete(odId)
    return null
  }

  return {
    odId,
    status: progress.status,
    storyId: progress.storyId,
    questions: progress.questions,
    startedAt: progress.startedAt,
    completed: progress.completed,
    won: progress.won
  }
}

/**
 * 开始每日挑战
 */
export async function startChallenge(odId) {
  // 检查是否已有进行中的挑战
  const existing = getChallengeProgress(odId)
  if (existing && existing.status === 'in_progress') {
    return { success: false, error: '已有进行中的挑战', code: 'ALREADY_STARTED' }
  }

  // 获取今日挑战故事
  const challenge = await getTodayChallenge(odId)
  if (!challenge) {
    return { success: false, error: '今日暂无挑战', code: 'NO_CHALLENGE' }
  }

  // 记录挑战进度
  challengeProgress.set(odId, {
    status: 'in_progress',
    storyId: challenge.storyId,
    questions: 0,
    startedAt: Date.now(),
    completed: false,
    won: false,
    challenge
  })

  return {
    success: true,
    data: {
      storyId: challenge.storyId,
      title: challenge.title,
      difficulty: challenge.difficulty,
      surface: challenge.surface,
      maxQuestions: challenge.maxQuestions,
      bonusMultiplier: challenge.bonusMultiplier,
      questions: 0
    }
  }
}

/**
 * 回答挑战问题
 */
export async function answerQuestion(odId, question) {
  const progress = challengeProgress.get(odId)

  if (!progress || progress.status !== 'in_progress') {
    return { error: '无进行中的挑战', code: 'NO_ACTIVE_CHALLENGE' }
  }

  if (progress.completed) {
    return { error: '挑战已完成', code: 'ALREADY_COMPLETED' }
  }

  if (progress.questions >= MAX_QUESTIONS) {
    return { error: '已达到最大问题数', code: 'MAX_QUESTIONS_REACHED' }
  }

  // 检查超时
  if (Date.now() - progress.startedAt > CHALLENGE_TIMEOUT_MS) {
    progress.status = 'timeout'
    progress.completed = true
    return { error: '挑战已超时', code: 'TIMEOUT' }
  }

  // 调用 AI 判定
  let answer = '继续提问'
  let isVictory = false
  try {
    const result = await judgeWithAI(question, progress.challenge, false)
    answer = result.answer
    isVictory = result.isVictory
  } catch (error) {
    // AI 服务不可用时，拒绝回答以保护挑战完整性
    return { error: 'AI 服务暂时不可用，请稍后再试', code: 'AI_SERVICE_UNAVAILABLE' }
  }

  progress.questions++

  if (isVictory) {
    progress.status = 'completed'
    progress.completed = true
    progress.won = true
  }

  return {
    isVictory,
    questionCount: progress.questions,
    answer, // 返回实际 AI 回答（是/否/无关/已破案）
    remainingQuestions: MAX_QUESTIONS - progress.questions
  }
}

/**
 * 猜答案
 */
export async function guessAnswer(odId, guess) {
  const progress = challengeProgress.get(odId)

  if (!progress || progress.status !== 'in_progress') {
    return { error: '无进行中的挑战', code: 'NO_ACTIVE_CHALLENGE' }
  }

  if (progress.completed) {
    return { error: '挑战已完成', code: 'ALREADY_COMPLETED' }
  }

  if (Date.now() - progress.startedAt > CHALLENGE_TIMEOUT_MS) {
    progress.status = 'timeout'
    progress.completed = true
    return { error: '挑战已超时', code: 'TIMEOUT' }
  }

  // 调用 AI 判定猜答案是否正确
  let isCorrect = false
  try {
    const result = await judgeWithAI(guess, progress.challenge, true)
    isCorrect = result.isVictory
  } catch (error) {
    // AI 服务不可用时，拒绝判定以保护挑战完整性
    return { error: 'AI 服务暂时不可用，请稍后再试', code: 'AI_SERVICE_UNAVAILABLE' }
  }

  if (isCorrect) {
    progress.status = 'completed'
    progress.completed = true
    progress.won = true

    return {
      isCorrect: true,
      won: true,
      bonusMultiplier: BONUS_MULTIPLIER,
      questionCount: progress.questions,
      message: '挑战胜利！获得2倍积分奖励'
    }
  } else {
    progress.questions++

    if (progress.questions >= MAX_QUESTIONS) {
      progress.status = 'failed'
      progress.completed = true
      progress.won = false
      return {
        isCorrect: false,
        won: false,
        questionCount: progress.questions,
        message: '挑战失败，问题数达到上限'
      }
    }

    return {
      isCorrect: false,
      won: false,
      questionCount: progress.questions,
      remainingQuestions: MAX_QUESTIONS - progress.questions,
      message: '答案错误，继续挑战'
    }
  }
}

/**
 * 放弃挑战
 */
export function giveUpChallenge(odId) {
  const progress = challengeProgress.get(odId)

  if (!progress || progress.status !== 'in_progress') {
    return { success: false, error: '无进行中的挑战', code: 'NO_ACTIVE_CHALLENGE' }
  }

  progress.status = 'give_up'
  progress.completed = true
  progress.won = false

  return {
    success: true,
    data: {
      completed: true,
      won: false,
      questionCount: progress.questions,
      reason: '主动放弃'
    }
  }
}

/**
 * 领取挑战奖励（在排行榜提交时调用）
 */
export function claimChallengeReward(odId) {
  const progress = challengeProgress.get(odId)

  if (!progress) {
    return { success: false, error: '无挑战记录', code: 'NO_CHALLENGE' }
  }

  if (!progress.won) {
    return { success: false, error: '挑战未胜利，无法领取奖励', code: 'NOT_WON' }
  }

  if (progress.rewardClaimed) {
    return { success: false, error: '奖励已领取', code: 'ALREADY_CLAIMED' }
  }

  progress.rewardClaimed = true

  return {
    success: true,
    data: {
      bonusMultiplier: BONUS_MULTIPLIER,
      claimed: true
    }
  }
}

/**
 * 验证每日挑战完成（游戏结束时调用）
 * @param {string} odId - 用户 odId
 * @param {object} gameResult - 游戏结果
 * @param {boolean} gameResult.won - 是否胜利
 * @param {number} gameResult.questionCount - 提问次数
 * @returns {{ eligible, reward, reason }}
 */
export async function verifyDailyChallenge(odId, { won, questionCount }) {
  const today = getTodayUTC()
  const challenge = await getTodayChallenge(odId)

  if (!challenge) {
    return { eligible: false, reward: 0, reason: '今日无挑战' }
  }

  const progress = challengeProgress.get(odId)

  if (!progress || progress.storyId !== challenge.storyId) {
    return { eligible: false, reward: 0, reason: '未开始今日挑战' }
  }

  if (progress.completed) {
    return {
      eligible: true,
      reward: 0,
      reason: progress.won ? '挑战已完成并获得奖励' : '挑战已完成未获得奖励',
      completed: true,
      won: progress.won,
      bonusApplied: progress.won
    }
  }

  if (!won) {
    return {
      eligible: true,
      reward: 0,
      reason: '挑战未胜利',
      completed: false,
      bonusApplied: false
    }
  }

  if (questionCount > MAX_QUESTIONS) {
    return {
      eligible: true,
      reward: 0,
      reason: `超过${MAX_QUESTIONS}题，无法获得奖励`,
      completed: false,
      bonusApplied: false
    }
  }

  // 挑战胜利，获得奖励
  progress.status = 'completed'
  progress.completed = true
  progress.won = true

  return {
    eligible: true,
    reward: BONUS_MULTIPLIER,
    reason: '挑战胜利！获得2倍积分奖励',
    completed: true,
    bonusApplied: true,
    challenge
  }
}
