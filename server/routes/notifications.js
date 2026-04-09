// Notifications API Routes - 站内通知

import express from 'express'
import Notification from '../db/models/Notification.js'
import { authMiddleware } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { getConnectionStatus } from '../db/mongodb.js'

const router = express.Router()

const requireMongo = (req, res, next) => {
  const { isConnected } = getConnectionStatus()
  if (!isConnected) {
    return res.status(503).json({
      success: false,
      error: '通知服务暂时不可用',
      code: 'SERVICE_UNAVAILABLE'
    })
  }
  next()
}

/**
 * GET /api/v1/notifications
 * 获取当前用户的通知列表
 */
router.get('/', authMiddleware, requireMongo, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const skip = (pageNum - 1) * limitNum

  const query = { odId: req.userId }
  if (unreadOnly === 'true') {
    query.isRead = false
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(query),
    Notification.getUnreadCount(req.userId)
  ])

  res.json({
    success: true,
    data: {
      notifications: notifications.map(n => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        content: n.content,
        isRead: n.isRead,
        data: n.data,
        createdAt: n.createdAt
      })),
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  })
}))

/**
 * GET /api/v1/notifications/unread-count
 * 获取未读通知数
 */
router.get('/unread-count', authMiddleware, requireMongo, asyncHandler(async (req, res) => {
  const count = await Notification.getUnreadCount(req.userId)
  res.json({ success: true, data: { count } })
}))

/**
 * PUT /api/v1/notifications/:id/read
 * 标记单条通知为已读
 */
router.put('/:id/read', authMiddleware, requireMongo, asyncHandler(async (req, res) => {
  const { id } = req.params

  const notification = await Notification.findOneAndUpdate(
    { _id: id, odId: req.userId },
    { isRead: true },
    { new: true }
  )

  if (!notification) {
    return res.status(404).json({
      success: false,
      error: '通知不存在',
      code: 'NOT_FOUND'
    })
  }

  res.json({ success: true })
}))

/**
 * PUT /api/v1/notifications/read-all
 * 标记全部通知为已读
 */
router.put('/read-all', authMiddleware, requireMongo, asyncHandler(async (req, res) => {
  await Notification.markAllRead(req.userId)
  res.json({ success: true, message: '已全部标记为已读' })
}))

/**
 * DELETE /api/v1/notifications/:id
 * 删除单条通知
 */
router.delete('/:id', authMiddleware, requireMongo, asyncHandler(async (req, res) => {
  const { id } = req.params

  const result = await Notification.deleteOne({ _id: id, odId: req.userId })

  if (result.deletedCount === 0) {
    return res.status(404).json({
      success: false,
      error: '通知不存在',
      code: 'NOT_FOUND'
    })
  }

  res.json({ success: true, message: '通知已删除' })
}))

/**
 * POST /api/v1/notifications
 * 创建通知（供内部服务调用，不对外暴露）
 * @param {object} data - { odId, type, title, content, data }
 */
export async function createNotification({ odId, type, title, content, data = {} }) {
  try {
    const notification = await Notification.create({ odId, type, title, content, data })
    return notification
  } catch (error) {
    console.error('[Notification] 创建通知失败:', error.message)
    return null
  }
}

/**
 * 通知类型说明：
 * - system: 系统公告（全体用户）
 * - review_approved: 投稿被批准
 * - review_rejected: 投稿被拒绝
 * - friend_request: 收到好友请求
 * - friend_accepted: 好友请求被接受
 * - achievement: 成就解锁
 * - challenge: 对战邀请
 */

export default router
