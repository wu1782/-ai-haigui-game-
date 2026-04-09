// 每日挑战 API 路由
// 每日挑战在服务端记录状态，实际游戏使用常规游戏流程

import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import {
  getTodayChallenge,
  getChallengeProgress,
  startChallenge,
  verifyDailyChallenge
} from '../services/dailyChallengeService.js'

const router = express.Router()

/**
 * GET /api/v1/daily-challenge
 * 获取今日每日挑战信息
 */
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const challenge = await getTodayChallenge(req.userId)
  const progress = getChallengeProgress(req.userId)

  if (!challenge) {
    return res.json({
      success: true,
      data: {
        available: false,
        message: '今日暂无挑战'
      }
    })
  }

  res.json({
    success: true,
    data: {
      available: true,
      date: challenge.date,
      storyId: challenge.storyId,
      title: challenge.title,
      difficulty: challenge.difficulty,
      surface: challenge.surface,
      bonusMultiplier: challenge.bonusMultiplier,
      maxQuestions: challenge.maxQuestions,
      progress: progress ? {
        status: progress.status,
        questions: progress.questions,
        completed: progress.completed,
        won: progress.won,
        startedAt: progress.startedAt
      } : null
    }
  })
}))

/**
 * POST /api/v1/daily-challenge/start
 * 开始每日挑战（标记已领取，返回故事信息）
 */
router.post('/start', authMiddleware, asyncHandler(async (req, res) => {
  const result = startChallenge(req.userId)

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: result.error,
      code: result.code
    })
  }

  res.json({
    success: true,
    data: result.data
  })
}))

/**
 * POST /api/v1/daily-challenge/complete
 * 每日挑战完成回调（游戏结束时调用）
 * @body { won: boolean, questionCount: number }
 */
router.post('/complete', authMiddleware, asyncHandler(async (req, res) => {
  const { won, questionCount } = req.body

  if (typeof won !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: '缺少 won 参数',
      code: 'MISSING_WON'
    })
  }

  const result = await verifyDailyChallenge(req.userId, { won, questionCount: questionCount || 0 })

  res.json({
    success: true,
    data: {
      eligible: result.eligible,
      bonusApplied: result.bonusApplied,
      bonusMultiplier: result.bonusApplied ? result.reward : 1,
      reason: result.reason,
      completed: result.completed,
      won: result.won
    }
  })
}))

export default router
