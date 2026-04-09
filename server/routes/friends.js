import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import friendsDb from '../db/friends.js'
import userDb from '../db/sqlite.js'
import { authMiddleware } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import Notification from '../db/models/Notification.js'
import {
  validateBody,
  validateQuery,
  friendSearchSchema,
  sendFriendRequestSchema,
  friendRequestActionSchema,
  deleteFriendSchema
} from '../utils/validation.js'

const router = express.Router()

// 好友请求72小时自动清理（每10分钟检查一次）
const REQUEST_EXPIRY_MS = 72 * 60 * 60 * 1000
setInterval(() => {
  const expiry = new Date(Date.now() - REQUEST_EXPIRY_MS).toISOString()
  const result = friendsDb.prepare(`
    DELETE FROM friend_requests
    WHERE status = 'pending' AND createdAt < ?
  `).run(expiry)
  if (result.changes > 0) {
    console.log(`[Friends] 清理了 ${result.changes} 个过期好友请求`)
  }
}, 10 * 60 * 1000)

/**
 * @typedef {Object} Friend
 * @property {string} id - Friend user ID
 * @property {string} username - Friend username
 * @property {string} [avatar] - Friend avatar URL
 * @property {string} status - Online status
 * @property {string} addedAt - When friendship was created
 */

/**
 * @typedef {Object} FriendRequest
 * @property {string} id - Request ID
 * @property {object} fromUser - Sender info
 * @property {object} toUser - Recipient info
 * @property {string} status - Request status
 * @property {string} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} SearchUser
 * @property {string} id - User ID
 * @property {string} username - Username
 * @property {string} [avatar] - Avatar URL
 * @property {boolean} isFriend - Is already a friend
 * @property {boolean} hasSentRequest - User sent request to them
 * @property {boolean} hasReceivedRequest - They sent request to user
 */

/**
 * Get user by ID helper
 * @param {string} userId - User ID
 * @returns {object|null} User object or null
 */
function getUserById(userId) {
  return userDb.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(userId)
}

/**
 * Check if user exists
 * @param {string} userId - User ID
 * @returns {boolean} Whether user exists
 */
function userExists(userId) {
  const user = userDb.prepare('SELECT id FROM users WHERE id = ?').get(userId)
  return !!user
}

/**
 * @swagger
 * /api/v1/friends:
 *   get:
 *     summary: 获取当前用户的好友列表
 *     description: 返回当前用户的所有好友信息
 *     tags: [好友]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回好友列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     friends:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Friend'
 *                 requestId:
 *                   type: string
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 服务器错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.userId

  // Get friendships
  const friendships = friendsDb.prepare(`
    SELECT friendId, createdAt FROM friendships
    WHERE userId = ?
    ORDER BY createdAt DESC
  `).all(userId)

  // Batch fetch user details
  const friendIds = friendships.map(f => f.friendId)
  let friendsById = new Map()
  if (friendIds.length > 0) {
    const placeholders = friendIds.map(() => '?').join(',')
    const users = userDb.prepare(`SELECT id, username, avatar FROM users WHERE id IN (${placeholders})`).all(...friendIds)
    users.forEach(user => friendsById.set(user.id, user))
  }

  const friends = friendships
    .map(f => {
      const user = friendsById.get(f.friendId)
      return {
        id: f.friendId,
        username: user?.username || '未知用户',
        avatar: user?.avatar || null,
        status: 'offline',
        addedAt: f.createdAt
      }
    })
    .filter(f => f.id)

  res.json({
    success: true,
    data: { friends },
    requestId: req.requestId
  })
}))

/**
 * @swagger
 * /api/v1/friends/requests:
 *   get:
 *     summary: 获取好友请求列表
 *     description: 返回当前用户发送和接收的好友请求
 *     tags: [好友]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功返回好友请求列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     received:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FriendRequest'
 *                     sent:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FriendRequest'
 *                 requestId:
 *                   type: string
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.get('/requests', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.userId

  // Get received requests
  const receivedReqs = friendsDb.prepare(`
    SELECT id, fromUserId, createdAt FROM friend_requests
    WHERE toUserId = ? AND status = 'pending'
    ORDER BY createdAt DESC
  `).all(userId)

  // Batch fetch received user info
  const receivedUserIds = receivedReqs.map(r => r.fromUserId)
  let receivedUsersMap = new Map()
  if (receivedUserIds.length > 0) {
    const placeholders = receivedUserIds.map(() => '?').join(',')
    const users = userDb.prepare(`SELECT id, username, avatar FROM users WHERE id IN (${placeholders})`).all(...receivedUserIds)
    users.forEach(u => receivedUsersMap.set(u.id, u))
  }

  const received = receivedReqs.map(r => {
    const user = receivedUsersMap.get(r.fromUserId)
    return {
      id: r.id,
      fromUser: {
        id: r.fromUserId,
        username: user?.username || '未知用户',
        avatar: user?.avatar || null
      },
      status: 'pending',
      createdAt: r.createdAt
    }
  }).filter(r => r.fromUser.id)

  // Get sent requests
  const sentReqs = friendsDb.prepare(`
    SELECT id, toUserId, createdAt FROM friend_requests
    WHERE fromUserId = ? AND status = 'pending'
    ORDER BY createdAt DESC
  `).all(userId)

  // Batch fetch sent user info
  const sentUserIds = sentReqs.map(r => r.toUserId)
  let sentUsersMap = new Map()
  if (sentUserIds.length > 0) {
    const placeholders = sentUserIds.map(() => '?').join(',')
    const users = userDb.prepare(`SELECT id, username, avatar FROM users WHERE id IN (${placeholders})`).all(...sentUserIds)
    users.forEach(u => sentUsersMap.set(u.id, u))
  }

  const sent = sentReqs.map(r => {
    const user = sentUsersMap.get(r.toUserId)
    return {
      id: r.id,
      toUser: {
        id: r.toUserId,
        username: user?.username || '未知用户',
        avatar: user?.avatar || null
      },
      status: 'pending',
      createdAt: r.createdAt
    }
  }).filter(r => r.toUser.id)

  res.json({
    success: true,
    data: { received, sent },
    requestId: req.requestId
  })
}))

/**
 * @swagger
 * /api/v1/friends/search:
 *   get:
 *     summary: 搜索用户
 *     description: 根据关键词搜索用户，返回好友关系状态
 *     tags: [好友]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词（可选，不传则返回随机用户）
 *         example: "海龟"
 *     responses:
 *       200:
 *         description: 成功返回用户列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SearchUser'
 *                 requestId:
 *                   type: string
 *       401:
 *         description: 未授权
 */
router.get('/search', authMiddleware, validateQuery(friendSearchSchema), asyncHandler(async (req, res) => {
  const userId = req.userId
  const { keyword, page = 1, limit = 20 } = req.query

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  let users = []
  let total = 0

  // Search by keyword or get all users
  if (keyword && keyword.trim()) {
    const trimmedKeyword = keyword.trim().slice(0, 50)
    // 转义 LIKE 中的特殊字符 % 和 _
    const escapedKeyword = trimmedKeyword.replace(/[%_]/g, '\\$&')

    // Get total count
    const countResult = userDb.prepare(
      'SELECT COUNT(*) as count FROM users WHERE username LIKE ? ESCAPE "\\" AND id != ?'
    ).get(`%${escapedKeyword}%`, userId)
    total = countResult.count

    // Get paginated users
    users = userDb.prepare(
      'SELECT id, username, avatar FROM users WHERE username LIKE ? ESCAPE "\\" AND id != ? LIMIT ? OFFSET ?'
    ).all(`%${escapedKeyword}%`, userId, limitNum, offset)
  } else {
    // Get total count (excluding self)
    const countResult = userDb.prepare('SELECT COUNT(*) as count FROM users WHERE id != ?').get(userId)
    total = countResult.count

    // Get paginated users
    users = userDb.prepare(
      'SELECT id, username, avatar FROM users WHERE id != ? LIMIT ? OFFSET ?'
    ).all(userId, limitNum, offset)
  }

  // Get existing friendships
  const friendships = friendsDb.prepare('SELECT friendId FROM friendships WHERE userId = ?').all(userId)

  // Get pending requests
  const requests = friendsDb.prepare(`
    SELECT id, fromUserId, toUserId, status FROM friend_requests
    WHERE (fromUserId = ? OR toUserId = ?) AND status = 'pending'
  `).all(userId, userId)

  // Build relationship maps
  const friendIds = new Set(friendships.map(f => f.friendId))
  const sentRequestTo = new Map()
  const receivedRequestFrom = new Map()
  requests.forEach(r => {
    if (r.fromUserId === userId) {
      sentRequestTo.set(r.toUserId, r.id)
    } else if (r.toUserId === userId) {
      receivedRequestFrom.set(r.fromUserId, r.id)
    }
  })

  // Build response
  const usersWithRelationship = users.map(user => {
    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      isFriend: friendIds.has(user.id),
      hasSentRequest: sentRequestTo.has(user.id),
      hasReceivedRequest: receivedRequestFrom.has(user.id)
    }
  })

  res.json({
    success: true,
    data: {
      users: usersWithRelationship,
      pagination: {
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
        hasMore: offset + users.length < total
      }
    },
    requestId: req.requestId
  })
}))

/**
 * @swagger
 * /api/v1/friends/request:
 *   post:
 *     summary: 发送好友请求
 *     description: 向指定用户发送好友请求
 *     tags: [好友]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toUserId
 *             properties:
 *               toUserId:
 *                 type: string
 *                 description: 目标用户 ID
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       201:
 *         description: 好友请求已发送
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "好友请求已发送"
 *                 data:
 *                   type: object
 *                   properties:
 *                     request:
 *                       $ref: '#/components/schemas/FriendRequest'
 *                 requestId:
 *                   type: string
 *       400:
 *         description: 请求参数错误或无法发送请求
 *       404:
 *         description: 用户不存在
 */
router.post('/request', authMiddleware, validateBody(sendFriendRequestSchema), asyncHandler(async (req, res) => {
  const userId = req.userId
  const { toUserId } = req.body

  // Check self-friend request
  if (toUserId === userId) {
    return res.status(400).json({
      success: false,
      error: '不能添加自己为好友',
      code: 'VALIDATION_ERROR',
      requestId: req.requestId
    })
  }

  // Check target user exists
  if (!userExists(toUserId)) {
    return res.status(404).json({
      success: false,
      error: '用户不存在',
      code: 'NOT_FOUND',
      requestId: req.requestId
    })
  }

  // Check existing friendship
  const existingFriendship = friendsDb.prepare(`
    SELECT id FROM friendships
    WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)
  `).get(userId, toUserId, toUserId, userId)

  if (existingFriendship) {
    return res.status(400).json({
      success: false,
      error: '你们已经是好友了',
      code: 'VALIDATION_ERROR',
      requestId: req.requestId
    })
  }

  // Check existing request (pending or rejected)
  const existingRequest = friendsDb.prepare(`
    SELECT id, status FROM friend_requests
    WHERE ((fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?))
    AND status IN ('pending', 'rejected')
  `).get(userId, toUserId, toUserId, userId)

  if (existingRequest) {
    // 如果是被拒绝的请求，允许重新发送（更新状态为pending）
    if (existingRequest.status === 'rejected') {
      friendsDb.prepare(`
        UPDATE friend_requests SET status = 'pending', createdAt = ? WHERE id = ?
      `).run(new Date().toISOString(), existingRequest.id)

      const fromUser = getUserById(userId)
      const toUser = getUserById(toUserId)

      return res.status(201).json({
        success: true,
        message: '好友请求已重新发送',
        data: {
          request: {
            id: existingRequest.id,
            fromUser: {
              id: fromUser.id,
              username: fromUser.username,
              avatar: fromUser.avatar
            },
            toUser: {
              id: toUser.id,
              username: toUser.username,
              avatar: toUser.avatar
            },
            status: 'pending',
            createdAt: new Date().toISOString()
          }
        },
        requestId: req.requestId
      })
    }

    return res.status(400).json({
      success: false,
      error: '已有待处理的好友请求',
      code: 'VALIDATION_ERROR',
      requestId: req.requestId
    })
  }

  const fromUser = getUserById(userId)
  const toUser = getUserById(toUserId)

  const requestId = uuidv4()
  const now = new Date().toISOString()

  friendsDb.prepare(`
    INSERT INTO friend_requests (id, fromUserId, toUserId, status, createdAt)
    VALUES (?, ?, ?, 'pending', ?)
  `).run(requestId, userId, toUserId, now)

  res.status(201).json({
    success: true,
    message: '好友请求已发送',
    data: {
      request: {
        id: requestId,
        fromUser: {
          id: fromUser.id,
          username: fromUser.username,
          avatar: fromUser.avatar
        },
        toUser: {
          id: toUser.id,
          username: toUser.username,
          avatar: toUser.avatar
        },
        status: 'pending',
        createdAt: now
      }
    },
    requestId: req.requestId
  })
}))

/**
 * @swagger
 * /api/v1/friends/request/{requestId}/accept:
 *   post:
 *     summary: 接受好友请求
 *     description: 接受指定的好友请求
 *     tags: [好友]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: 好友请求 ID
 *     responses:
 *       200:
 *         description: 已接受好友请求
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "已接受好友请求"
 *                 data:
 *                   type: object
 *                   properties:
 *                     friend:
 *                       $ref: '#/components/schemas/Friend'
 *                 requestId:
 *                   type: string
 *       404:
 *         description: 好友请求不存在或已处理
 */
router.post('/request/:requestId/accept', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.userId
  const { requestId } = req.params

  const request = friendsDb.prepare(`
    SELECT * FROM friend_requests
    WHERE id = ? AND toUserId = ? AND status = 'pending'
  `).get(requestId, userId)

  if (!request) {
    return res.status(404).json({
      success: false,
      error: '好友请求不存在或已处理',
      code: 'NOT_FOUND',
      requestId: req.requestId
    })
  }

  const now = new Date().toISOString()
  const friendshipId1 = uuidv4()
  const friendshipId2 = uuidv4()

  // Create bidirectional friendship
  friendsDb.prepare(`
    INSERT INTO friendships (id, userId, friendId, createdAt)
    VALUES (?, ?, ?, ?)
  `).run(friendshipId1, userId, request.fromUserId, now)

  friendsDb.prepare(`
    INSERT INTO friendships (id, userId, friendId, createdAt)
    VALUES (?, ?, ?, ?)
  `).run(friendshipId2, request.fromUserId, userId, now)

  // Update request status
  friendsDb.prepare(`
    UPDATE friend_requests SET status = 'accepted' WHERE id = ?
  `).run(requestId)

  const fromUser = getUserById(request.fromUserId)

  // 发送通知给请求发起者
  try {
    await Notification.create({
      odId: request.fromUserId,
      type: 'friend_accepted',
      title: '好友请求已接受',
      content: `${fromUser.username} 已同意您的好友请求，现在你们是好友了`,
      data: { friendId: userId, friendName: fromUser.username }
    })
  } catch (e) {
    console.error('[Friends] 发送好友通知失败:', e.message)
  }

  res.json({
    success: true,
    message: '已接受好友请求',
    data: {
      friend: {
        id: fromUser.id,
        username: fromUser.username,
        avatar: fromUser.avatar,
        status: 'offline',
        addedAt: now
      }
    },
    requestId: req.requestId
  })
}))

/**
 * @swagger
 * /api/v1/friends/request/{requestId}/reject:
 *   post:
 *     summary: 拒绝好友请求
 *     description: 拒绝指定的好友请求
 *     tags: [好友]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: 好友请求 ID
 *     responses:
 *       200:
 *         description: 已拒绝好友请求
 *       404:
 *         description: 好友请求不存在或已处理
 */
router.post('/request/:requestId/reject', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.userId
  const { requestId } = req.params

  const request = friendsDb.prepare(`
    SELECT * FROM friend_requests
    WHERE id = ? AND toUserId = ? AND status = 'pending'
  `).get(requestId, userId)

  if (!request) {
    return res.status(404).json({
      success: false,
      error: '好友请求不存在或已处理',
      code: 'NOT_FOUND',
      requestId: req.requestId
    })
  }

  friendsDb.prepare(`
    UPDATE friend_requests SET status = 'rejected' WHERE id = ?
  `).run(requestId)

  res.json({
    success: true,
    message: '已拒绝好友请求',
    requestId: req.requestId
  })
}))

/**
 * @swagger
 * /api/v1/friends/friend/{friendId}:
 *   delete:
 *     summary: 删除好友
 *     description: 删除指定的好友关系
 *     tags: [好友]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: string
 *         description: 好友用户 ID
 *     responses:
 *       200:
 *         description: 已删除好友
 *       404:
 *         description: 好友关系不存在
 */
router.delete('/friend/:friendId', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.userId
  const { friendId } = req.params

  const result1 = friendsDb.prepare(`
    DELETE FROM friendships WHERE userId = ? AND friendId = ?
  `).run(userId, friendId)

  const result2 = friendsDb.prepare(`
    DELETE FROM friendships WHERE userId = ? AND friendId = ?
  `).run(friendId, userId)

  if (result1.changes === 0 && result2.changes === 0) {
    return res.status(404).json({
      success: false,
      error: '好友关系不存在',
      code: 'NOT_FOUND',
      requestId: req.requestId
    })
  }

  res.json({
    success: true,
    message: '已删除好友',
    requestId: req.requestId
  })
}))

/**
 * @swagger
 * /api/v1/friends/request/{requestId}:
 *   delete:
 *     summary: 取消发送的好友请求
 *     description: 取消当前用户发送的待处理好友请求
 *     tags: [好友]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *         description: 好友请求 ID
 *     responses:
 *       200:
 *         description: 已取消好友请求
 *       404:
 *         description: 请求不存在或无权取消
 */
router.delete('/request/:requestId', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.userId
  const { requestId } = req.params

  const result = friendsDb.prepare(`
    DELETE FROM friend_requests
    WHERE id = ? AND fromUserId = ? AND status = 'pending'
  `).run(requestId, userId)

  if (result.changes === 0) {
    return res.status(404).json({
      success: false,
      error: '请求不存在或无权取消',
      code: 'NOT_FOUND',
      requestId: req.requestId
    })
  }

  res.json({
    success: true,
    message: '已取消好友请求',
    requestId: req.requestId
  })
}))

/**
 * POST /api/v1/friends/block/:friendId
 * 拉黑用户（同时删除好友关系、拒绝所有相关请求）
 */
router.post('/block/:friendId', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.userId
  const { friendId } = req.params

  if (friendId === userId) {
    return res.status(400).json({
      success: false,
      error: '不能拉黑自己',
      code: 'VALIDATION_ERROR',
      requestId: req.requestId
    })
  }

  if (!userExists(friendId)) {
    return res.status(404).json({
      success: false,
      error: '用户不存在',
      code: 'NOT_FOUND',
      requestId: req.requestId
    })
  }

  // 检查是否已拉黑
  const existing = friendsDb.prepare('SELECT id FROM blocks WHERE blockerId = ? AND blockedId = ?').get(userId, friendId)
  if (existing) {
    return res.status(400).json({
      success: false,
      error: '已拉黑此用户',
      code: 'ALREADY_BLOCKED',
      requestId: req.requestId
    })
  }

  const now = new Date().toISOString()

  // 添加拉黑记录
  friendsDb.prepare('INSERT INTO blocks (id, blockerId, blockedId, createdAt) VALUES (?, ?, ?, ?)').run(uuidv4(), userId, friendId, now)

  // 删除双向好友关系
  friendsDb.prepare('DELETE FROM friendships WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)').run(userId, friendId, friendId, userId)

  // 拒绝所有相关的好友请求
  friendsDb.prepare(`
    UPDATE friend_requests
    SET status = 'rejected'
    WHERE ((fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?))
    AND status = 'pending'
  `).run(userId, friendId, friendId, userId)

  res.json({
    success: true,
    message: '已拉黑该用户',
    requestId: req.requestId
  })
}))

/**
 * DELETE /api/v1/friends/block/:friendId
 * 取消拉黑
 */
router.delete('/block/:friendId', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.userId
  const { friendId } = req.params

  const result = friendsDb.prepare('DELETE FROM blocks WHERE blockerId = ? AND blockedId = ?').run(userId, friendId)

  if (result.changes === 0) {
    return res.status(404).json({
      success: false,
      error: '未拉黑此用户',
      code: 'NOT_BLOCKED',
      requestId: req.requestId
    })
  }

  res.json({
    success: true,
    message: '已取消拉黑',
    requestId: req.requestId
  })
}))

/**
 * GET /api/v1/friends/blocked
 * 获取已拉黑的用户列表
 */
router.get('/blocked', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.userId

  const blocks = friendsDb.prepare('SELECT blockedId, createdAt FROM blocks WHERE blockerId = ? ORDER BY createdAt DESC').all(userId)

  const blockedIds = blocks.map(b => b.blockedId)
  let usersMap = new Map()
  if (blockedIds.length > 0) {
    const placeholders = blockedIds.map(() => '?').join(',')
    const users = userDb.prepare(`SELECT id, username, avatar FROM users WHERE id IN (${placeholders})`).all(...blockedIds)
    users.forEach(u => usersMap.set(u.id, u))
  }

  const result = blocks.map(b => {
    const user = usersMap.get(b.blockedId)
    return {
      id: b.blockedId,
      username: user?.username || '未知用户',
      avatar: user?.avatar || null,
      blockedAt: b.createdAt
    }
  })

  res.json({
    success: true,
    data: { blocked: result },
    requestId: req.requestId
  })
}))

/**
 * GET /api/v1/friends/blocked/:userId
 * 检查是否拉黑了某用户
 */
router.get('/blocked/:userId', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.userId
  const { userId: targetId } = req.params

  const block = friendsDb.prepare('SELECT id FROM blocks WHERE blockerId = ? AND blockedId = ?').get(userId, targetId)

  res.json({
    success: true,
    data: { isBlocked: !!block },
    requestId: req.requestId
  })
}))

export default router
