// Contributions API Routes - Story submission and review

import express from 'express'
import Story from '../db/models/Story.js'
import User from '../db/models/User.js'
import Notification from '../db/models/Notification.js'
import { authMiddleware } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { getConnectionStatus } from '../db/mongodb.js'

const router = express.Router()

// 投稿封禁配置
const BAN_THRESHOLD = 5            // 被拒5次
const BAN_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30天
const MAX_RESUBMIT = 3             // 被拒后最多重提3次
const REVIEW_TIMEOUT_MS = 72 * 60 * 60 * 1000     // 72小时未审核提醒

// 检查用户是否被禁止投稿（从MongoDB获取）
async function checkContributionBan(odId) {
  try {
    const user = await User.findById(odId).select('contributionBanInfo').lean()
    if (!user || !user.contributionBanInfo) return null

    const { bannedUntil } = user.contributionBanInfo
    if (bannedUntil && Date.now() < bannedUntil.getTime()) {
      const daysLeft = Math.ceil((bannedUntil.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      return { banned: true, until: bannedUntil, daysLeft }
    }
    return null
  } catch (e) {
    console.error('[Contributions] Check ban error:', e.message)
    return null
  }
}

// 记录一次拒稿（持久化到MongoDB）
async function recordRejection(odId) {
  try {
    const user = await User.findById(odId)
    if (!user) return

    if (!user.contributionBanInfo) {
      user.contributionBanInfo = { rejectionCount: 0, bannedUntil: null, lastRejectionAt: null }
    }

    user.contributionBanInfo.rejectionCount++
    user.contributionBanInfo.lastRejectionAt = new Date()

    if (user.contributionBanInfo.rejectionCount >= BAN_THRESHOLD) {
      user.contributionBanInfo.bannedUntil = new Date(Date.now() + BAN_DURATION_MS)
      console.log(`[Contributions] User ${odId} banned from contributing for ${BAN_DURATION_MS / (24 * 60 * 60 * 1000)} days`)
    }

    await user.save()
  } catch (e) {
    console.error('[Contributions] Record rejection error:', e.message)
  }
}

// 72小时未审核自动提醒（每10分钟检查一次）
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - REVIEW_TIMEOUT_MS).toISOString()
    const overdue = await Story.find({
      status: 'pending',
      createdAt: { $lt: cutoff }
    }).select('_id title contributorId').lean()

    for (const story of overdue) {
      console.warn(`[Contributions] 故事 "${story.title}" (${story._id}) 已超过72小时未审核`)
      // 实际应发送通知给管理员，这里仅记录日志
    }
  } catch (e) {
    console.error('[Contributions] Timeout check error:', e.message)
  }
}, 10 * 60 * 1000)

// Middleware to check MongoDB availability
const requireMongo = (req, res, next) => {
  const { isConnected } = getConnectionStatus()
  if (!isConnected) {
    return res.status(503).json({
      success: false,
      error: '投稿功能暂时不可用，请稍后再试',
      code: 'SERVICE_UNAVAILABLE'
    })
  }
  next()
}

/**
 * POST /api/stories/contribute
 * Submit a new story for review (user)
 */
router.post('/contribute', authMiddleware, requireMongo, async (req, res) => {
  try {
    // 检查投稿封禁
    const banStatus = checkContributionBan(req.userId)
    if (banStatus) {
      return res.status(403).json({
        success: false,
        error: `因投稿质量原因，您已被禁止投稿${banStatus.daysLeft}天`,
        code: 'CONTRIBUTION_BANNED',
        bannedUntil: banStatus.until
      })
    }

    const { title, surface, bottom, difficulty, starLevel, keywords, tags, hint } = req.body

    // Validation
    if (!title || !surface || !bottom || !difficulty) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段：title, surface, bottom, difficulty',
        code: 'VALIDATION_ERROR'
      })
    }

    if (title.length > 100) {
      return res.status(400).json({
        success: false,
        error: '标题最多100个字符',
        code: 'VALIDATION_ERROR'
      })
    }

    if (surface.length < 10 || surface.length > 500) {
      return res.status(400).json({
        success: false,
        error: '汤面长度应在10-500个字符之间',
        code: 'VALIDATION_ERROR'
      })
    }

    if (bottom.length < 10 || bottom.length > 1000) {
      return res.status(400).json({
        success: false,
        error: '汤底长度应在10-1000个字符之间',
        code: 'VALIDATION_ERROR'
      })
    }

    if (!['easy', 'medium', 'hard', 'extreme'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        error: '难度必须是 easy, medium, hard, 或 extreme',
        code: 'VALIDATION_ERROR'
      })
    }

    if (starLevel && (starLevel < 1 || starLevel > 5)) {
      return res.status(400).json({
        success: false,
        error: '星级必须在1-5之间',
        code: 'VALIDATION_ERROR'
      })
    }

    // Check for duplicate title (pending or approved)
    const existing = await Story.findOne({
      title,
      status: { $in: ['pending', 'approved'] }
    })
    if (existing) {
      return res.status(400).json({
        success: false,
        error: '已存在相同标题的故事',
        code: 'VALIDATION_ERROR'
      })
    }

    const story = new Story({
      title,
      surface,
      bottom,
      difficulty,
      starLevel: starLevel || 3,
      keywords: keywords || [],
      tags: tags || [],
      hint: hint || null,
      isAiGenerated: false,
      creatorId: req.userId,
      contributorId: req.userId,
      status: 'pending'
    })

    await story.save()

    res.status(201).json({
      success: true,
      message: '投稿成功，等待审核',
      data: {
        id: story._id.toString(),
        title: story.title,
        status: story.status,
        createdAt: story.createdAt
      }
    })
  } catch (error) {
    console.error('[Contributions] Submit error:', error)
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'VALIDATION_ERROR'
      })
    }
    res.status(500).json({
      success: false,
      error: '投稿失败',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * GET /api/stories/my-contributions
 * Get current user's contributions
 */
router.get('/my-contributions', authMiddleware, requireMongo, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query

    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum

    const query = { contributorId: req.userId }
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status
    }

    const [stories, total] = await Promise.all([
      Story.find(query)
        .select('title surface difficulty starLevel status reviewInfo createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Story.countDocuments(query)
    ])

    res.json({
      success: true,
      data: {
        contributions: stories.map(s => ({
          id: s._id.toString(),
          title: s.title,
          surface: s.surface,
          difficulty: s.difficulty,
          starLevel: s.starLevel,
          status: s.status,
          rejectionReason: s.reviewInfo?.rejectionReason || null,
          createdAt: s.createdAt
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    })
  } catch (error) {
    console.error('[Contributions] List error:', error)
    res.status(500).json({
      success: false,
      error: '获取投稿列表失败',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * GET /api/stories/pending
 * Get pending stories for review (admin only)
 */
router.get('/pending', authMiddleware, requireAdmin, requireMongo, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query

    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum

    const query = { status: 'pending' }

    const [stories, total] = await Promise.all([
      Story.find(query)
        .select('title surface difficulty starLevel keywords tags hint contributorId createdAt')
        .sort({ createdAt: 1 }) // Oldest first
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Story.countDocuments(query)
    ])

    // Get contributor info
    const contributorIds = [...new Set(stories.map(s => s.contributorId).filter(Boolean))]
    const contributors = await User.find({ _id: { $in: contributorIds } })
      .select('username avatar')
      .lean()
    const contributorMap = new Map(contributors.map(c => [c._id.toString(), c]))

    res.json({
      success: true,
      data: {
        stories: stories.map(s => {
          const contributor = s.contributorId ? contributorMap.get(s.contributorId.toString()) : null
          return {
            id: s._id.toString(),
            title: s.title,
            surface: s.surface,
            difficulty: s.difficulty,
            starLevel: s.starLevel,
            keywords: s.keywords,
            tags: s.tags,
            hint: s.hint,
            contributor: contributor ? {
              id: contributor._id.toString(),
              username: contributor.username,
              avatar: contributor.avatar
            } : null,
            createdAt: s.createdAt
          }
        }),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    })
  } catch (error) {
    console.error('[Contributions] Pending error:', error)
    res.status(500).json({
      success: false,
      error: '获取待审核列表失败',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * GET /api/stories/review/:status
 * Get stories by status for review (admin only)
 */
router.get('/review/:status', authMiddleware, requireAdmin, requireMongo, async (req, res) => {
  try {
    const { status } = req.params
    const { page = 1, limit = 20 } = req.query

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: '状态必须是 pending, approved, 或 rejected',
        code: 'VALIDATION_ERROR'
      })
    }

    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum

    const query = { status }

    const [stories, total] = await Promise.all([
      Story.find(query)
        .select('title surface difficulty starLevel keywords tags hint contributorId reviewInfo createdAt')
        .sort({ reviewedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Story.countDocuments(query)
    ])

    // Get contributor info
    const contributorIds = [...new Set(stories.map(s => s.contributorId).filter(Boolean))]
    const contributors = await User.find({ _id: { $in: contributorIds } })
      .select('username avatar')
      .lean()
    const contributorMap = new Map(contributors.map(c => [c._id.toString(), c]))

    res.json({
      success: true,
      data: {
        stories: stories.map(s => {
          const contributor = s.contributorId ? contributorMap.get(s.contributorId.toString()) : null
          return {
            id: s._id.toString(),
            title: s.title,
            surface: s.surface,
            difficulty: s.difficulty,
            starLevel: s.starLevel,
            keywords: s.keywords,
            tags: s.tags,
            hint: s.hint,
            contributor: contributor ? {
              id: contributor._id.toString(),
              username: contributor.username,
              avatar: contributor.avatar
            } : null,
            reviewInfo: s.reviewInfo,
            createdAt: s.createdAt
          }
        }),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    })
  } catch (error) {
    console.error('[Contributions] Review list error:', error)
    res.status(500).json({
      success: false,
      error: '获取审核列表失败',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * GET /api/stories/review/detail/:id
 * Get story detail for review (admin only)
 */
router.get('/review/detail/:id', authMiddleware, requireAdmin, requireMongo, async (req, res) => {
  try {
    const { id } = req.params

    const story = await Story.findById(id).lean()

    if (!story) {
      return res.status(404).json({
        success: false,
        error: '故事不存在',
        code: 'NOT_FOUND'
      })
    }

    // Get contributor info
    let contributor = null
    if (story.contributorId) {
      const user = await User.findById(story.contributorId).select('username avatar').lean()
      if (user) {
        contributor = {
          id: user._id.toString(),
          username: user.username,
          avatar: user.avatar
        }
      }
    }

    // Get reviewer info
    let reviewer = null
    if (story.reviewInfo?.reviewedBy) {
      const user = await User.findById(story.reviewInfo.reviewedBy).select('username avatar').lean()
      if (user) {
        reviewer = {
          id: user._id.toString(),
          username: user.username
        }
      }
    }

    res.json({
      success: true,
      data: {
        id: story._id.toString(),
        title: story.title,
        surface: story.surface,
        bottom: story.bottom,
        difficulty: story.difficulty,
        starLevel: story.starLevel,
        keywords: story.keywords,
        tags: story.tags,
        hint: story.hint,
        status: story.status,
        contributor,
        reviewInfo: story.reviewInfo ? {
          reviewedAt: story.reviewInfo.reviewedAt,
          rejectionReason: story.reviewInfo.rejectionReason,
          reviewer
        } : null,
        createdAt: story.createdAt
      }
    })
  } catch (error) {
    console.error('[Contributions] Detail error:', error)
    res.status(500).json({
      success: false,
      error: '获取故事详情失败',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * PUT /api/stories/:id/review
 * Review a story (admin only)
 */
router.put('/:id/review', authMiddleware, requireAdmin, requireMongo, async (req, res) => {
  try {
    const { id } = req.params
    const { action, rejectionReason } = req.body

    if (!action || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'action 必须是 approved 或 rejected',
        code: 'VALIDATION_ERROR'
      })
    }

    if (action === 'rejected' && (!rejectionReason || rejectionReason.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        error: '拒绝时必须填写原因',
        code: 'VALIDATION_ERROR'
      })
    }

    if (rejectionReason && rejectionReason.length > 200) {
      return res.status(400).json({
        success: false,
        error: '拒绝原因最多200个字符',
        code: 'VALIDATION_ERROR'
      })
    }

    const story = await Story.findById(id)

    if (!story) {
      return res.status(404).json({
        success: false,
        error: '故事不存在',
        code: 'NOT_FOUND'
      })
    }

    if (story.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: '只能审核待审核状态的故事',
        code: 'VALIDATION_ERROR'
      })
    }

    story.status = action
    story.reviewInfo = {
      reviewedBy: req.userId,
      reviewedAt: new Date(),
      rejectionReason: action === 'rejected' ? rejectionReason.trim() : null
    }
    if (action === 'rejected') {
      story.rejectionCount = (story.rejectionCount || 0) + 1
      story.lastRejectedAt = new Date()
      // 记录投稿人拒稿次数，达到阈值则封禁
      const contributorOdId = story.contributorId?.toString()
      if (contributorOdId) {
        recordRejection(contributorOdId)
      }
    }

    await story.save()

    // 发送通知给投稿人
    const contributorOdId = story.contributorId?.toString()
    if (contributorOdId) {
      try {
        if (action === 'approved') {
          await Notification.create({
            odId: contributorOdId,
            type: 'review_approved',
            title: '投稿已通过审核',
            content: `您投稿的故事《${story.title}》已通过审核，正式上线！`,
            data: { storyId: story._id.toString() }
          })
        } else {
          await Notification.create({
            odId: contributorOdId,
            type: 'review_rejected',
            title: '投稿未通过审核',
            content: `您投稿的故事《${story.title}》未通过审核。原因：${rejectionReason}`,
            data: { storyId: story._id.toString(), rejectionReason }
          })
        }
      } catch (notifyError) {
        console.error('[Contributions] 发送通知失败:', notifyError.message)
      }
    }

    res.json({
      success: true,
      message: action === 'approved' ? '已批准上架' : '已拒绝',
      data: {
        id: story._id.toString(),
        status: story.status,
        reviewedAt: story.reviewInfo.reviewedAt
      }
    })
  } catch (error) {
    console.error('[Contributions] Review error:', error)
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'VALIDATION_ERROR'
      })
    }
    res.status(500).json({
      success: false,
      error: '审核操作失败',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * PUT /api/stories/:id/resubmit
 * 修改被拒稿的故事并重新提交（限3次）
 */
router.put('/:id/resubmit', authMiddleware, requireMongo, async (req, res) => {
  try {
    const { id } = req.params
    const { title, surface, bottom, difficulty, starLevel, keywords, tags, hint } = req.body

    const story = await Story.findById(id)

    if (!story) {
      return res.status(404).json({
        success: false,
        error: '故事不存在',
        code: 'NOT_FOUND'
      })
    }

    if (story.contributorId?.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        error: '无权修改此故事',
        code: 'FORBIDDEN'
      })
    }

    if (story.status === 'approved') {
      return res.status(400).json({
        success: false,
        error: '已通过审核的故事不能重提',
        code: 'ALREADY_APPROVED'
      })
    }

    if ((story.rejectionCount || 0) >= MAX_RESUBMIT) {
      return res.status(400).json({
        success: false,
        error: `该故事已被拒绝${MAX_RESUBMIT}次，不能再重提`,
        code: 'MAX_RESUBMIT_EXCEEDED'
      })
    }

    const banStatus = checkContributionBan(req.userId)
    if (banStatus) {
      return res.status(403).json({
        success: false,
        error: `因投稿质量原因，您已被禁止投稿${banStatus.daysLeft}天`,
        code: 'CONTRIBUTION_BANNED'
      })
    }

    if (title !== undefined) {
      if (title.length > 100) return res.status(400).json({ error: '标题最多100字符', code: 'VALIDATION_ERROR' })
      story.title = title
    }
    if (surface !== undefined) {
      if (surface.length < 10 || surface.length > 500) return res.status(400).json({ error: '汤面长度应在10-500字符', code: 'VALIDATION_ERROR' })
      story.surface = surface
    }
    if (bottom !== undefined) {
      if (bottom.length < 10 || bottom.length > 1000) return res.status(400).json({ error: '汤底长度应在10-1000字符', code: 'VALIDATION_ERROR' })
      story.bottom = bottom
    }
    if (difficulty !== undefined) {
      if (!['easy', 'medium', 'hard', 'extreme'].includes(difficulty)) return res.status(400).json({ error: '难度无效', code: 'VALIDATION_ERROR' })
      story.difficulty = difficulty
    }
    if (starLevel !== undefined) {
      if (starLevel < 1 || starLevel > 5) return res.status(400).json({ error: '星级必须在1-5', code: 'VALIDATION_ERROR' })
      story.starLevel = starLevel
    }
    if (keywords !== undefined) story.keywords = keywords
    if (tags !== undefined) story.tags = tags
    if (hint !== undefined) story.hint = hint

    story.status = 'pending'
    story.reviewInfo = { reviewedBy: null, reviewedAt: null, rejectionReason: null }
    story.rejectionCount = (story.rejectionCount || 0) + 1
    story.lastRejectedAt = new Date()

    await story.save()

    res.json({
      success: true,
      message: '已重新提交，等待审核',
      data: {
        id: story._id.toString(),
        status: story.status,
        rejectionCount: story.rejectionCount
      }
    })
  } catch (error) {
    console.error('[Contributions] Resubmit error:', error)
    res.status(500).json({ success: false, error: '重提失败', code: 'INTERNAL_ERROR' })
  }
})

/**
 * GET /api/stories/stats
 * Get contribution stats (admin only)
 */
router.get('/stats', authMiddleware, requireAdmin, requireMongo, async (req, res) => {
  try {
    const [pending, approved, rejected, total] = await Promise.all([
      Story.countDocuments({ status: 'pending' }),
      Story.countDocuments({ status: 'approved' }),
      Story.countDocuments({ status: 'rejected' }),
      Story.countDocuments({})
    ])

    res.json({
      success: true,
      data: {
        pending,
        approved,
        rejected,
        total
      }
    })
  } catch (error) {
    console.error('[Contributions] Stats error:', error)
    res.status(500).json({
      success: false,
      error: '获取统计数据失败',
      code: 'INTERNAL_ERROR'
    })
  }
})

export default router
