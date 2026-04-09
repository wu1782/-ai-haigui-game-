// 成就路由 - 后端成就验证和查询

import express from 'express'
import { processGameAchievements, getUserAchievements, ACHIEVEMENTS } from '../services/achievementService.js'
import Achievement from '../db/models/Achievement.js'
import { requireAdmin } from '../middleware/admin.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

/**
 * 获取当前用户已解锁的成就
 * GET /api/v1/achievements
 */
router.get('/', async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ error: '未登录' })
  }

  try {
    const unlocked = await getUserAchievements(req.userId)
    const unlockedIds = new Set(unlocked.map(a => a.id))

    // 合并已解锁和未解锁的成就列表
    const allAchievements = Object.values(ACHIEVEMENTS).map(def => ({
      id: def.id,
      name: def.name,
      desc: def.desc,
      type: def.type,
      unlocked: unlockedIds.has(def.id),
      unlockedAt: unlocked.find(u => u.id === def.id)?.unlockedAt || null
    }))

    res.json({
      success: true,
      data: {
        achievements: allAchievements,
        unlockedCount: unlocked.length,
        totalCount: Object.keys(ACHIEVEMENTS).length
      }
    })
  } catch (error) {
    console.error('Get achievements error:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

/**
 * 游戏结束时调用，解锁成就
 * POST /api/v1/achievements/unlock
 * Body: { won, difficulty, questionCount, storyId, storyMongoId }
 */
router.post('/unlock', async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ error: '未登录' })
  }

  const { won, difficulty, questionCount, storyId, storyMongoId } = req.body

  if (typeof won !== 'boolean') {
    return res.status(400).json({ error: '缺少 won 参数' })
  }

  try {
    const newUnlocks = await processGameAchievements(req.userId, {
      won,
      difficulty: difficulty || 'medium',
      questionCount: questionCount || 0,
      storyId,
      storyMongoId
    })

    res.json({
      success: true,
      data: {
        newlyUnlocked: newUnlocks,
        count: newUnlocks.length
      }
    })
  } catch (error) {
    console.error('Unlock achievements error:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

// ============ 管理员接口 ============

/**
 * GET /api/v1/achievements/admin/users/:userId
 * 管理员查看任意用户成就
 */
router.get('/admin/users/:userId', authMiddleware, requireAdmin, async (req, res) => {
  const { userId } = req.params

  try {
    const unlocked = await getUserAchievements(userId)
    const unlockedIds = new Set(unlocked.map(a => a.id))

    const allAchievements = Object.values(ACHIEVEMENTS).map(def => ({
      id: def.id,
      name: def.name,
      desc: def.desc,
      type: def.type,
      unlocked: unlockedIds.has(def.id),
      unlockedAt: unlocked.find(u => u.id === def.id)?.unlockedAt || null
    }))

    res.json({
      success: true,
      data: {
        achievements: allAchievements,
        unlockedCount: unlocked.length,
        totalCount: Object.keys(ACHIEVEMENTS).length,
        userId
      }
    })
  } catch (error) {
    console.error('[Admin] Get user achievements error:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

/**
 * DELETE /api/v1/achievements/admin/users/:userId/achievements/:achievementId
 * 管理员重置用户单个成就
 */
router.delete('/admin/users/:userId/achievements/:achievementId', authMiddleware, requireAdmin, async (req, res) => {
  const { userId, achievementId } = req.params

  try {
    const result = await Achievement.deleteOne({ userId, achievementId })

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: '成就记录不存在',
        code: 'NOT_FOUND'
      })
    }

    res.json({
      success: true,
      message: '成就已重置',
      achievementId
    })
  } catch (error) {
    console.error('[Admin] Reset achievement error:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

/**
 * DELETE /api/v1/achievements/admin/users/:userId
 * 管理员重置用户所有成就
 */
router.delete('/admin/users/:userId', authMiddleware, requireAdmin, async (req, res) => {
  const { userId } = req.params

  try {
    const result = await Achievement.deleteMany({ userId })

    res.json({
      success: true,
      message: `已重置 ${result.deletedCount} 个成就`,
      userId,
      deletedCount: result.deletedCount
    })
  } catch (error) {
    console.error('[Admin] Reset all achievements error:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

export default router
