import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db/sqlite.js'
import { createRateLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

// 排行榜专用限流（比 AI 更宽松）
const leaderboardRateLimiter = createRateLimiter('general')

/**
 * 获取排行榜
 * GET /api/leaderboard?type=fastest&limit=10
 */
router.get('/', (req, res) => {
  try {
    const { type = 'totalWins', limit = 20 } = req.query

    const validTypes = ['fastest', 'fewestQuestions', 'streak', 'totalWins']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: '无效的排行榜类型' })
    }

    // 限制最大返回条数，防止滥用
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 20), 100)

    const entries = db.prepare(`
      SELECT l.userId, l.value, l.storyId, l.createdAt,
             u.username, u.avatar
      FROM leaderboard l
      JOIN users u ON u.id = l.userId
      WHERE l.entryType = ?
      ORDER BY l.value DESC
      LIMIT ?
    `).all(type, safeLimit)

    res.json({
      type,
      entries: entries.map(e => ({
        userId: e.userId,
        username: e.username,
        avatar: e.avatar,
        value: e.value,
        storyId: e.storyId,
        createdAt: e.createdAt
      }))
    })
  } catch (error) {
    console.error('获取排行榜错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * 获取用户排名
 * GET /api/leaderboard/rank/:userId
 */
router.get('/rank/:userId', (req, res) => {
  try {
    const { userId } = req.params
    const { type = 'totalWins' } = req.query

    const validTypes = ['fastest', 'fewestQuestions', 'streak', 'totalWins']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: '无效的排行榜类型' })
    }

    // 获取用户在指定类型排行榜中的排名
    const rankResult = db.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM leaderboard l
      WHERE l.entryType = ? AND l.value > (
        SELECT COALESCE(value, 0) FROM leaderboard
        WHERE userId = ? AND entryType = ?
      )
    `).get(type, userId, type)

    // 获取用户在该类型的数据
    const userEntry = db.prepare(`
      SELECT value FROM leaderboard
      WHERE userId = ? AND entryType = ?
    `).get(userId, type)

    res.json({
      userId,
      type,
      rank: rankResult?.rank || null,
      value: userEntry?.value || null
    })
  } catch (error) {
    console.error('获取排名错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * 更新排行榜
 * POST /api/leaderboard
 */
router.post('/', leaderboardRateLimiter, (req, res) => {
  try {
    const { userId, entryType, value, storyId } = req.body

    if (!userId || !entryType || value === undefined) {
      return res.status(400).json({ error: '缺少必要参数' })
    }

    const validTypes = ['fastest', 'fewestQuestions', 'streak', 'totalWins']
    if (!validTypes.includes(entryType)) {
      return res.status(400).json({ error: '无效的排行榜类型' })
    }

    // 检查用户是否存在
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const now = new Date().toISOString()

    // 更新或插入排行榜数据
    const existing = db.prepare(`
      SELECT id, value FROM leaderboard
      WHERE userId = ? AND entryType = ?
    `).get(userId, entryType)

    if (existing) {
      // 根据类型决定是更新还是保留更好的值
      let newValue = value
      if (entryType === 'streak' || entryType === 'totalWins') {
        // 这些类型需要累加
        newValue = Math.max(existing.value, value)
      } else {
        // 其他类型取更好的值（更小或更大取决于类型）
        if (['fastest', 'fewestQuestions'].includes(entryType)) {
          newValue = Math.min(existing.value, value)
        } else {
          newValue = Math.max(existing.value, value)
        }
      }

      if (newValue !== existing.value) {
        db.prepare(`
          UPDATE leaderboard SET value = ?, storyId = ?, createdAt = ?
          WHERE userId = ? AND entryType = ?
        `).run(newValue, storyId || null, now, userId, entryType)
      }
    } else {
      db.prepare(`
        INSERT INTO leaderboard (id, userId, entryType, value, storyId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, entryType, value, storyId || null, now)
    }

    res.json({ message: '排行榜更新成功' })
  } catch (error) {
    console.error('更新排行榜错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

export default router
