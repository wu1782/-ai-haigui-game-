import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db/sqlite.js'
import { createRateLimiter } from '../middleware/rateLimiter.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { authMiddleware } from '../middleware/auth.js'
import {
  validateQuery,
  validateBody,
  leaderboardQuerySchema,
  userRankQuerySchema,
  updateLeaderboardSchema
} from '../utils/validation.js'

const router = express.Router()

// Leaderboard rate limiter (more lenient than AI)
const leaderboardRateLimiter = createRateLimiter('general')

/**
 * @typedef {Object} LeaderboardEntry
 * @property {string} userId - User ID
 * @property {string} username - Username
 * @property {string} [avatar] - Avatar URL
 * @property {number} value - Score value
 * @property {string} [storyId] - Related story ID
 * @property {string} createdAt - Entry creation timestamp
 */

/**
 * @typedef {Object} UserRank
 * @property {string} userId - User ID
 * @property {string} type - Leaderboard type
 * @property {number|null} rank - User rank (null if no entry)
 * @property {number|null} value - User's value (null if no entry)
 */

/**
 * @swagger
 * /api/v1/leaderboard:
 *   get:
 *     summary: 获取排行榜
 *     description: 返回指定类型和时间维度的排行榜
 *     tags: [排行榜]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [fastest, fewestQuestions, streak, totalWins]
 *         description: 排行榜类型
 *         default: totalWins
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [all, week, month]
 *         description: 时间维度
 *         default: all
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: 返回条目数量
 *         default: 20
 *     responses:
 *       200:
 *         description: 成功返回排行榜
 */
router.get('/', validateQuery(leaderboardQuerySchema), asyncHandler(async (req, res) => {
  const { type = 'totalWins', period = 'all', limit = 20 } = req.query

  const validTypes = ['fastest', 'fewestQuestions', 'streak', 'totalWins']
  const validPeriods = ['all', 'week', 'month']
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: '无效的排行榜类型',
      code: 'VALIDATION_ERROR',
      requestId: req.requestId
    })
  }
  if (!validPeriods.includes(period)) {
    return res.status(400).json({
      success: false,
      error: '无效的时间维度',
      code: 'VALIDATION_ERROR',
      requestId: req.requestId
    })
  }

  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 20), 100)

  const entries = db.prepare(`
    SELECT l.userId, l.value, l.storyId, l.createdAt,
           u.username, u.avatar
    FROM leaderboard l
    JOIN users u ON u.id = l.userId
    WHERE l.entryType = ? AND l.period = ?
    ORDER BY l.value DESC
    LIMIT ?
  `).all(type, period, safeLimit)

  // 获取当前用户的历史最高记录（如果有）
  let historicalBest = null
  if (req.userId) {
    const best = db.prepare(`
      SELECT bestRank, bestValue, achievedAt FROM leaderboard_history
      WHERE odId = ? AND entryType = ? AND period = ?
    `).get(req.userId, type, period)
    historicalBest = best ? {
      bestRank: best.bestRank,
      bestValue: best.bestValue,
      achievedAt: best.achievedAt
    } : null
  }

  res.json({
    success: true,
    data: {
      type,
      period,
      entries: entries.map(e => ({
        userId: e.userId,
        username: e.username,
        avatar: e.avatar,
        value: e.value,
        storyId: e.storyId,
        createdAt: e.createdAt
      })),
      historicalBest
    },
    requestId: req.requestId
  })
}))

/**
 * @swagger
 * /api/v1/leaderboard/rank/{userId}:
 *   get:
 *     summary: 获取用户在排行榜中的排名
 *     description: 返回指定用户在排行榜中的排名和数值
 *     tags: [排行榜]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户 ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [fastest, fewestQuestions, streak, totalWins]
 *         description: 排行榜类型
 *         default: totalWins
 *     responses:
 *       200:
 *         description: 成功返回用户排名
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserRank'
 *                 requestId:
 *                   type: string
 */
router.get('/rank/:userId', validateQuery(userRankQuerySchema), asyncHandler(async (req, res) => {
  const { userId } = req.params
  const { type = 'totalWins', period = 'all' } = req.query

  const validTypes = ['fastest', 'fewestQuestions', 'streak', 'totalWins']
  const validPeriods = ['all', 'week', 'month']
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: '无效的排行榜类型',
      code: 'VALIDATION_ERROR',
      requestId: req.requestId
    })
  }
  if (!validPeriods.includes(period)) {
    return res.status(400).json({
      success: false,
      error: '无效的时间维度',
      code: 'VALIDATION_ERROR',
      requestId: req.requestId
    })
  }

  // Get user rank
  const rankResult = db.prepare(`
    SELECT COUNT(*) + 1 as rank
    FROM leaderboard l
    WHERE l.entryType = ? AND l.period = ? AND l.value > (
      SELECT COALESCE(value, 0) FROM leaderboard
      WHERE userId = ? AND entryType = ? AND period = ?
    )
  `).get(type, period, userId, type, period)

  // Get user entry
  const userEntry = db.prepare(`
    SELECT value FROM leaderboard
    WHERE userId = ? AND entryType = ? AND period = ?
  `).get(userId, type, period)

  // Get historical best rank
  const historical = db.prepare(`
    SELECT bestRank, bestValue, achievedAt FROM leaderboard_history
    WHERE odId = ? AND entryType = ? AND period = ?
  `).get(userId, type, period)

  res.json({
    success: true,
    data: {
      userId,
      type,
      period,
      rank: rankResult?.rank || null,
      value: userEntry?.value || null,
      historicalBest: historical ? {
        bestRank: historical.bestRank,
        bestValue: historical.bestValue,
        achievedAt: historical.achievedAt
      } : null
    },
    requestId: req.requestId
  })
}))

/**
 * @swagger
 * /api/v1/leaderboard:
 *   post:
 *     summary: 更新排行榜数据
 *     description: 更新用户在排行榜中的数据（需要限流）
 *     tags: [排行榜]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - entryType
 *               - value
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 用户 ID
 *               entryType:
 *                 type: string
 *                 enum: [fastest, fewestQuestions, streak, totalWins]
 *                 description: 排行榜类型
 *               value:
 *                 type: number
 *                 description: 分数值
 *               storyId:
 *                 type: string
 *                 description: 关联的故事 ID
 *     responses:
 *       200:
 *         description: 排行榜更新成功
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 用户不存在
 *       429:
 *         description: 请求过于频繁
 */
router.post('/', authMiddleware, leaderboardRateLimiter, validateBody(updateLeaderboardSchema), asyncHandler(async (req, res) => {
  const { userId, entryType, value, storyId, period = 'all' } = req.body

  const validTypes = ['fastest', 'fewestQuestions', 'streak', 'totalWins']
  const validPeriods = ['all', 'week', 'month']
  if (!validTypes.includes(entryType)) {
    return res.status(400).json({
      success: false,
      error: '无效的排行榜类型',
      code: 'VALIDATION_ERROR',
      requestId: req.requestId
    })
  }
  if (!validPeriods.includes(period)) {
    return res.status(400).json({
      success: false,
      error: '无效的时间维度',
      code: 'VALIDATION_ERROR',
      requestId: req.requestId
    })
  }

  // Check user exists
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId)
  if (!user) {
    return res.status(404).json({
      success: false,
      error: '用户不存在',
      code: 'NOT_FOUND',
      requestId: req.requestId
    })
  }

  const now = new Date().toISOString()

  // Check existing entry
  const existing = db.prepare(`
    SELECT id, value FROM leaderboard
    WHERE userId = ? AND entryType = ? AND period = ?
  `).get(userId, entryType, period)

  if (existing) {
    let newValue = value
    if (entryType === 'streak' || entryType === 'totalWins') {
      newValue = Math.max(existing.value, value)
    } else if (['fastest', 'fewestQuestions'].includes(entryType)) {
      newValue = Math.min(existing.value, value)
    } else {
      newValue = Math.max(existing.value, value)
    }

    if (newValue !== existing.value) {
      db.prepare(`
        UPDATE leaderboard SET value = ?, storyId = ?, createdAt = ?
        WHERE userId = ? AND entryType = ? AND period = ?
      `).run(newValue, storyId || null, now, userId, entryType, period)
    }
  } else {
    db.prepare(`
      INSERT INTO leaderboard (id, userId, entryType, value, storyId, createdAt, period)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, entryType, value, storyId || null, now, period)
  }

  // 更新历史最高排名
  const currentRank = db.prepare(`
    SELECT COUNT(*) + 1 as rank
    FROM leaderboard l
    WHERE l.entryType = ? AND l.period = ? AND l.value > (
      SELECT COALESCE(value, 0) FROM leaderboard
      WHERE userId = ? AND entryType = ? AND period = ?
    )
  `).get(entryType, period, userId, entryType, period)

  const histExisting = db.prepare(`
    SELECT bestRank FROM leaderboard_history
    WHERE odId = ? AND entryType = ? AND period = ?
  `).get(userId, entryType, period)

  if (!histExisting || currentRank.rank < histExisting.bestRank) {
    db.prepare(`
      INSERT OR REPLACE INTO leaderboard_history (odId, entryType, bestRank, bestValue, achievedAt, period)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, entryType, currentRank.rank, value, now, period)
  }

  res.json({
    success: true,
    message: '排行榜更新成功',
    currentRank: currentRank.rank,
    requestId: req.requestId
  })
}))

export default router
