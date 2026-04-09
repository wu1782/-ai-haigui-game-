// Stories API Routes - CRUD operations for stories

import express from 'express'
import Story from '../db/models/Story.js'
import { authMiddleware } from '../middleware/auth.js'
import { getConnectionStatus } from '../db/mongodb.js'

const router = express.Router()

// Middleware to check MongoDB availability
const requireMongo = (req, res, next) => {
  const { isConnected } = getConnectionStatus()
  if (!isConnected) {
    return res.status(503).json({
      success: false,
      error: '故事服务暂时不可用，请稍后再试',
      code: 'SERVICE_UNAVAILABLE'
    })
  }
  next()
}

// HTML 转义函数，防止 XSS
function escapeHtml(str) {
  if (typeof str !== 'string') return str
  return str.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]))
}

// 转义故事内容中的用户可见字段
function sanitizeStory(story) {
  return {
    ...story,
    title: escapeHtml(story.title),
    surface: escapeHtml(story.surface),
    tags: Array.isArray(story.tags) ? story.tags.map(t => escapeHtml(t)) : []
  }
}

/**
 * GET /api/stories
 * List stories with pagination, filtering, and sorting
 */
router.get('/', requireMongo, async (req, res) => {
  try {
    const {
      difficulty,
      tags,
      isAiGenerated,
      search,
      sortBy = 'hotScore',
      order = 'desc',
      page = 1,
      limit = 20,
      status // Support status filter, defaults to 'approved' for public access
    } = req.query

    const filters = {}
    // Default to approved stories for public listing
    if (status) {
      filters.status = status
    } else {
      filters.status = 'approved'
    }
    if (difficulty) filters.difficulty = difficulty
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags]
    if (isAiGenerated !== undefined) filters.isAiGenerated = isAiGenerated === 'true'
    if (search) filters.search = search

    const options = {
      sortBy,
      order,
      page: Math.max(1, parseInt(page)),
      limit: Math.min(100, Math.max(1, parseInt(limit)))
    }

    const result = await Story.findWithFilters(filters, options)

    res.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('[Stories] List error:', error)
    res.status(500).json({ error: '获取故事列表失败' })
  }
})

/**
 * GET /api/stories/search
 * Search stories by title/keywords
 */
router.get('/search', requireMongo, async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: '搜索关键词至少2个字符' })
    }

    const searchQuery = q.trim()
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum

    const [stories, total] = await Promise.all([
      Story.find({
        $text: { $search: searchQuery }
      })
      .select('-bottom')
      .sort({ score: { $meta: 'textScore' }, hotScore: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
      Story.countDocuments({
        $text: { $search: searchQuery }
      })
    ])

    res.json({
      success: true,
      stories: stories.map(s => sanitizeStory({
        ...s,
        id: s._id.toString()
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('[Stories] Search error:', error)
    res.status(500).json({ error: '搜索故事失败' })
  }
})

/**
 * GET /api/stories/hot
 * Get hot/popular stories
 */
router.get('/hot', requireMongo, async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)))

    const stories = await Story.find()
      .select('-bottom')
      .sort({ hotScore: -1, playCount: -1 })
      .limit(limitNum)
      .lean()

    res.json({
      success: true,
      stories: stories.map(s => sanitizeStory({
        ...s,
        id: s._id.toString()
      }))
    })
  } catch (error) {
    console.error('[Stories] Hot error:', error)
    res.status(500).json({ error: '获取热门故事失败' })
  }
})

/**
 * GET /api/stories/latest
 * Get latest stories
 */
router.get('/latest', requireMongo, async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)))

    const stories = await Story.find()
      .select('-bottom')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean()

    res.json({
      success: true,
      stories: stories.map(s => sanitizeStory({
        ...s,
        id: s._id.toString()
      }))
    })
  } catch (error) {
    console.error('[Stories] Latest error:', error)
    res.status(500).json({ error: '获取最新故事失败' })
  }
})

/**
 * GET /api/stories/difficulty/:level
 * Get stories by difficulty
 */
router.get('/difficulty/:level', requireMongo, async (req, res) => {
  try {
    const { level } = req.params
    const { page = 1, limit = 20 } = req.query

    if (!['easy', 'medium', 'hard', 'extreme'].includes(level)) {
      return res.status(400).json({ error: '难度必须是 easy, medium, hard, 或 extreme' })
    }

    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum

    const [stories, total] = await Promise.all([
      Story.find({ difficulty: level })
        .select('-bottom')
        .sort({ hotScore: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Story.countDocuments({ difficulty: level })
    ])

    res.json({
      success: true,
      stories: stories.map(s => sanitizeStory({
        ...s,
        id: s._id.toString()
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('[Stories] Difficulty error:', error)
    res.status(500).json({ error: '获取故事失败' })
  }
})

/**
 * GET /api/stories/:id
 * Get single story by ID (includes bottom for game end)
 */
router.get('/:id', requireMongo, async (req, res) => {
  try {
    const { id } = req.params
    const { includeBottom } = req.query

    const story = await Story.findById(id).lean()

    if (!story) {
      return res.status(404).json({ error: '故事不存在' })
    }

    // Only include bottom if explicitly requested (for game completion)
    const result = sanitizeStory({
      id: story._id.toString(),
      title: story.title,
      surface: story.surface,
      difficulty: story.difficulty,
      starLevel: story.starLevel,
      keywords: story.keywords,
      tags: story.tags,
      hint: story.hint,
      isAiGenerated: story.isAiGenerated,
      creatorId: story.creatorId,
      hotScore: story.hotScore,
      playCount: story.playCount,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt
    })

    // Include bottom only for game completion
    if (includeBottom === 'true') {
      result.bottom = story.bottom
    }

    res.json({
      success: true,
      story: result
    })
  } catch (error) {
    console.error('[Stories] Get error:', error)
    res.status(500).json({ error: '获取故事失败' })
  }
})

/**
 * POST /api/stories
 * Create a custom story
 */
router.post('/', authMiddleware, requireMongo, async (req, res) => {
  try {
    const { title, surface, bottom, difficulty, starLevel, keywords, tags, hint } = req.body

    // Validation
    if (!title || !surface || !bottom || !difficulty) {
      return res.status(400).json({ error: '缺少必填字段：title, surface, bottom, difficulty' })
    }

    if (title.length > 100) {
      return res.status(400).json({ error: '标题最多100个字符' })
    }

    if (surface.length < 10 || surface.length > 500) {
      return res.status(400).json({ error: '汤面长度应在10-500个字符之间' })
    }

    if (bottom.length < 10 || bottom.length > 1000) {
      return res.status(400).json({ error: '汤底长度应在10-1000个字符之间' })
    }

    if (!['easy', 'medium', 'hard', 'extreme'].includes(difficulty)) {
      return res.status(400).json({ error: '难度必须是 easy, medium, hard, 或 extreme' })
    }

    if (starLevel && (starLevel < 1 || starLevel > 5)) {
      return res.status(400).json({ error: '星级必须在1-5之间' })
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
      creatorId: req.userId
    })

    await story.save()

    res.status(201).json({
      success: true,
      message: '故事创建成功',
      story: {
        id: story._id.toString(),
        title: story.title,
        surface: story.surface,
        difficulty: story.difficulty,
        starLevel: story.starLevel,
        keywords: story.keywords,
        tags: story.tags,
        hint: story.hint,
        isAiGenerated: story.isAiGenerated,
        createdAt: story.createdAt
      }
    })
  } catch (error) {
    console.error('[Stories] Create error:', error)
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: '创建故事失败' })
  }
})

/**
 * PUT /api/stories/:id
 * Update story (only creator can update)
 */
router.put('/:id', authMiddleware, requireMongo, async (req, res) => {
  try {
    const { id } = req.params
    const { title, surface, bottom, difficulty, starLevel, keywords, tags, hint } = req.body

    const story = await Story.findById(id)

    if (!story) {
      return res.status(404).json({ error: '故事不存在' })
    }

    // Check if user is the creator
    if (story.creatorId && story.creatorId.toString() !== req.userId) {
      return res.status(403).json({ error: '无权修改此故事' })
    }

    // Update fields if provided
    if (title !== undefined) {
      if (title.length > 100) {
        return res.status(400).json({ error: '标题最多100个字符' })
      }
      story.title = title
    }

    if (surface !== undefined) {
      if (surface.length < 10 || surface.length > 500) {
        return res.status(400).json({ error: '汤面长度应在10-500个字符之间' })
      }
      story.surface = surface
    }

    if (bottom !== undefined) {
      if (bottom.length < 10 || bottom.length > 1000) {
        return res.status(400).json({ error: '汤底长度应在10-1000个字符之间' })
      }
      story.bottom = bottom
    }

    if (difficulty !== undefined) {
      if (!['easy', 'medium', 'hard', 'extreme'].includes(difficulty)) {
        return res.status(400).json({ error: '难度必须是 easy, medium, hard, 或 extreme' })
      }
      story.difficulty = difficulty
    }

    if (starLevel !== undefined) {
      if (starLevel < 1 || starLevel > 5) {
        return res.status(400).json({ error: '星级必须在1-5之间' })
      }
      story.starLevel = starLevel
    }

    if (keywords !== undefined) {
      story.keywords = keywords
    }

    if (tags !== undefined) {
      story.tags = tags
    }

    if (hint !== undefined) {
      story.hint = hint
    }

    await story.save()

    res.json({
      success: true,
      message: '故事更新成功',
      story: {
        id: story._id.toString(),
        title: story.title,
        surface: story.surface,
        bottom: story.bottom,
        difficulty: story.difficulty,
        starLevel: story.starLevel,
        keywords: story.keywords,
        tags: story.tags,
        hint: story.hint,
        isAiGenerated: story.isAiGenerated,
        updatedAt: story.updatedAt
      }
    })
  } catch (error) {
    console.error('[Stories] Update error:', error)
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: '更新故事失败' })
  }
})

/**
 * DELETE /api/stories/:id
 * Delete story (only creator can delete)
 */
router.delete('/:id', authMiddleware, requireMongo, async (req, res) => {
  try {
    const { id } = req.params

    const story = await Story.findById(id)

    if (!story) {
      return res.status(404).json({ error: '故事不存在' })
    }

    // Check if user is the creator
    if (story.creatorId && story.creatorId.toString() !== req.userId) {
      return res.status(403).json({ error: '无权删除此故事' })
    }

    await Story.findByIdAndDelete(id)

    res.json({
      success: true,
      message: '故事删除成功'
    })
  } catch (error) {
    console.error('[Stories] Delete error:', error)
    res.status(500).json({ error: '删除故事失败' })
  }
})

/**
 * POST /api/stories/:id/play
 * Record a play of the story (increment play count and hot score)
 */
router.post('/:id/play', authMiddleware, requireMongo, async (req, res) => {
  try {
    const { id } = req.params

    const story = await Story.findByIdAndUpdate(
      id,
      {
        $inc: { playCount: 1, hotScore: 1 }
      },
      { new: true }
    )

    if (!story) {
      return res.status(404).json({ error: '故事不存在' })
    }

    res.json({
      success: true,
      message: '记录成功',
      playCount: story.playCount,
      hotScore: story.hotScore
    })
  } catch (error) {
    console.error('[Stories] Play error:', error)
    res.status(500).json({ error: '记录游戏失败' })
  }
})

/**
 * GET /api/stories/user/:userId
 * Get stories created by a specific user
 */
router.get('/user/:userId', requireMongo, async (req, res) => {
  try {
    const { userId } = req.params
    const { page = 1, limit = 20 } = req.query

    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
    const skip = (pageNum - 1) * limitNum

    const [stories, total] = await Promise.all([
      Story.find({ creatorId: userId })
        .select('-bottom')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Story.countDocuments({ creatorId: userId })
    ])

    res.json({
      success: true,
      stories: stories.map(s => sanitizeStory({
        ...s,
        id: s._id.toString()
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
  } catch (error) {
    console.error('[Stories] User stories error:', error)
    res.status(500).json({ error: '获取用户故事失败' })
  }
})

export default router
