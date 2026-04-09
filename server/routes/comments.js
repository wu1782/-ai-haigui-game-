// Comments API Routes - 故事评论 CRUD

import express from 'express'
import Comment from '../db/models/Comment.js'
import { authMiddleware, authMiddlewareWithRole } from '../middleware/auth.js'
import { getConnectionStatus } from '../db/mongodb.js'
import { containsSensitiveWords } from '../utils/sensitiveWords.js'

const router = express.Router()

const requireMongo = (req, res, next) => {
  const { isConnected } = getConnectionStatus()
  if (!isConnected) {
    return res.status(503).json({
      success: false,
      error: '评论服务暂时不可用',
      code: 'SERVICE_UNAVAILABLE'
    })
  }
  next()
}

// XSS 防护
function escapeHtml(str) {
  if (typeof str !== 'string') return str
  return str.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]))
}

/**
 * GET /api/comments/story/:storyId
 * 获取故事的所有评论
 */
router.get('/story/:storyId', requireMongo, async (req, res) => {
  try {
    const { storyId } = req.params
    const { page = 1, limit = 20 } = req.query

    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum

    const [comments, total] = await Promise.all([
      Comment.find({ storyId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Comment.countDocuments({ storyId })
    ])

    res.json({
      success: true,
      comments: comments.map(c => ({
        ...c,
        id: c._id.toString(),
        _id: undefined,
        __v: undefined,
        likedBy: undefined,
        content: escapeHtml(c.content)
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('[Comments] List error:', error)
    res.status(500).json({ error: '获取评论失败' })
  }
})

/**
 * POST /api/comments
 * 添加评论（需登录）
 */
router.post('/', authMiddleware, requireMongo, async (req, res) => {
  try {
    const { storyId, content, username, avatar } = req.body

    if (!storyId) {
      return res.status(400).json({ error: '缺少 storyId' })
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: '评论内容不能为空' })
    }

    const trimmed = content.trim()
    if (trimmed.length < 5) {
      return res.status(400).json({ error: '评论至少5个字符' })
    }
    if (trimmed.length > 500) {
      return res.status(400).json({ error: '评论最多500个字符' })
    }

    // 敏感词检查
    const { words } = containsSensitiveWords(trimmed)
    if (words.length > 0) {
      return res.status(400).json({
        error: '评论包含敏感词',
        blockedWords: words,
        code: 'SENSITIVE_WORD_DETECTED'
      })
    }

    const comment = new Comment({
      odId: req.userId,
      username: username || '匿名用户',
      avatar: avatar || null,
      storyId,
      content: trimmed
    })

    await comment.save()

    res.status(201).json({
      success: true,
      comment: {
        id: comment._id.toString(),
        odId: comment.odId,
        username: comment.username,
        avatar: comment.avatar,
        storyId: comment.storyId,
        content: escapeHtml(comment.content),
        likes: comment.likes,
        isEdited: comment.isEdited,
        editedAt: comment.editedAt,
        createdAt: comment.createdAt
      }
    })
  } catch (error) {
    console.error('[Comments] Create error:', error)
    res.status(500).json({ error: '发表评论失败' })
  }
})

/**
 * PUT /api/comments/:id
 * 编辑评论（仅作者，30分钟内）
 */
router.put('/:id', authMiddleware, requireMongo, async (req, res) => {
  try {
    const { id } = req.params
    const { content } = req.body

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: '评论内容不能为空' })
    }

    const trimmed = content.trim()
    if (trimmed.length < 5) {
      return res.status(400).json({ error: '评论至少5个字符' })
    }
    if (trimmed.length > 500) {
      return res.status(400).json({ error: '评论最多500个字符' })
    }

    // 敏感词检查
    const { words } = containsSensitiveWords(trimmed)
    if (words.length > 0) {
      return res.status(400).json({
        error: '评论包含敏感词',
        blockedWords: words,
        code: 'SENSITIVE_WORD_DETECTED'
      })
    }

    const comment = await Comment.findById(id)
    if (!comment) {
      return res.status(404).json({ error: '评论不存在' })
    }

    if (comment.odId !== req.userId) {
      return res.status(403).json({ error: '无权编辑此评论' })
    }

    const now = Date.now()
    const diff = now - comment.createdAt.getTime()
    const thirtyMinutes = 30 * 60 * 1000
    if (diff > thirtyMinutes) {
      return res.status(403).json({ error: '评论已超过30分钟编辑时限' })
    }

    comment.content = trimmed
    comment.isEdited = true
    comment.editedAt = new Date()
    await comment.save()

    res.json({
      success: true,
      comment: {
        id: comment._id.toString(),
        content: escapeHtml(comment.content),
        isEdited: comment.isEdited,
        editedAt: comment.editedAt,
        updatedAt: comment.updatedAt
      }
    })
  } catch (error) {
    console.error('[Comments] Edit error:', error)
    res.status(500).json({ error: '编辑评论失败' })
  }
})

/**
 * DELETE /api/comments/:id
 * 删除评论（仅作者或管理员）
 */
router.delete('/:id', authMiddlewareWithRole, requireMongo, async (req, res) => {
  try {
    const { id } = req.params

    const comment = await Comment.findById(id)
    if (!comment) {
      return res.status(404).json({ error: '评论不存在' })
    }

    // 仅作者或 admin 可删除
    if (comment.odId !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: '无权删除此评论' })
    }

    await Comment.findByIdAndDelete(id)

    res.json({ success: true, message: '评论已删除' })
  } catch (error) {
    console.error('[Comments] Delete error:', error)
    res.status(500).json({ error: '删除评论失败' })
  }
})

/**
 * POST /api/comments/:id/like
 * 点赞评论
 */
router.post('/:id/like', authMiddleware, requireMongo, async (req, res) => {
  try {
    const { id } = req.params

    const comment = await Comment.findById(id)
    if (!comment) {
      return res.status(404).json({ error: '评论不存在' })
    }

    const result = await comment.like(req.userId)
    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    res.json({ success: true, likes: result.likes })
  } catch (error) {
    console.error('[Comments] Like error:', error)
    res.status(500).json({ error: '点赞失败' })
  }
})

/**
 * DELETE /api/comments/:id/like
 * 取消点赞
 */
router.delete('/:id/like', authMiddleware, requireMongo, async (req, res) => {
  try {
    const { id } = req.params

    const comment = await Comment.findById(id)
    if (!comment) {
      return res.status(404).json({ error: '评论不存在' })
    }

    const result = await comment.unlike(req.userId)
    if (!result.success) {
      return res.status(400).json({ error: result.message })
    }

    res.json({ success: true, likes: result.likes })
  } catch (error) {
    console.error('[Comments] Unlike error:', error)
    res.status(500).json({ error: '取消点赞失败' })
  }
})

export default router
