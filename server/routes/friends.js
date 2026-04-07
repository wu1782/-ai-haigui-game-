import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import friendsDb from '../db/friends.js'
import userDb from '../db/sqlite.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// 获取用户基础信息
function getUserById(userId) {
  return userDb.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(userId)
}

// 验证用户是否存在
function userExists(userId) {
  const user = userDb.prepare('SELECT id FROM users WHERE id = ?').get(userId)
  return !!user
}

/**
 * 获取好友列表
 */
router.get('/', authMiddleware, (req, res) => {
  try {
    console.log('[Friends] User:', req.userId)

    // 先从好友数据库获取好友ID列表
    const friendships = friendsDb.prepare(`
      SELECT friendId, createdAt FROM friendships
      WHERE userId = ?
      ORDER BY createdAt DESC
    `).all(req.userId)

    console.log('[Friends] Friendships:', friendships.length)

    // 再从用户数据库批量获取用户详情 (优化 N+1 查询)
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
      .filter(f => f.id) // 过滤掉无效用户

    console.log('[Friends] Resolved friends:', friends.length)

    res.json({ friends })
  } catch (error) {
    console.error('获取好友列表错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * 获取好友请求列表
 */
router.get('/requests', authMiddleware, (req, res) => {
  try {
    console.log('[Requests] User:', req.userId)

    // 获取收到的请求（发给当前用户的）
    const receivedReqs = friendsDb.prepare(`
      SELECT id, fromUserId, createdAt FROM friend_requests
      WHERE toUserId = ? AND status = 'pending'
      ORDER BY createdAt DESC
    `).all(req.userId)

    console.log('[Requests] Received:', receivedReqs.length)

    // 批量获取 receivedReqs 中的用户信息
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

    // 获取发送的请求（当前用户发送的）
    const sentReqs = friendsDb.prepare(`
      SELECT id, toUserId, createdAt FROM friend_requests
      WHERE fromUserId = ? AND status = 'pending'
      ORDER BY createdAt DESC
    `).all(req.userId)

    console.log('[Requests] Sent:', sentReqs.length)

    // 批量获取 sentReqs 中的用户信息
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

    res.json({ received, sent })
  } catch (error) {
    console.error('获取好友请求错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * 搜索用户
 */
router.get('/search', authMiddleware, (req, res) => {
  console.log('[Search] req.userId:', req.userId)
  console.log('[Search] query:', req.query)

  const { keyword } = req.query

  // 初始化
  let users = []
  let friendships = []
  let requests = []

  // 校验关键词长度
  if (keyword && keyword.length > 50) {
    return res.status(400).json({ error: '关键词长度不能超过50个字符' })
  }

  try {
    const searchPattern = `%${keyword || ''}%`
    console.log('[Search] Pattern:', searchPattern)

    // 带条件的搜索
    if (keyword && keyword.trim()) {
      const trimmedKeyword = keyword.trim().slice(0, 50) // 额外安全限制
      users = userDb.prepare('SELECT id, username, avatar FROM users WHERE username LIKE ? LIMIT 20').all(`%${trimmedKeyword}%`)
    } else {
      users = userDb.prepare('SELECT id, username, avatar FROM users LIMIT 20').all()
    }
    console.log('[Search] Found users:', users.length)

    // 查询当前用户的好友关系
    friendships = friendsDb.prepare('SELECT friendId FROM friendships WHERE userId = ?').all(req.userId)
    console.log('[Search] Current user friendships:', friendships.length)

    // 查询当前用户相关的请求（发送的或接收的）
    requests = friendsDb.prepare(`
      SELECT id, fromUserId, toUserId, status FROM friend_requests
      WHERE (fromUserId = ? OR toUserId = ?) AND status = 'pending'
    `).all(req.userId, req.userId)
    console.log('[Search] Current user requests:', requests.length)

    // 构建好友ID集合
    const friendIds = new Set(friendships.map(f => f.friendId))
    console.log('[Search] Friend IDs:', friendIds)

    // 构建请求映射
    const sentRequestTo = new Map() // toUserId -> requestId
    const receivedRequestFrom = new Map() // fromUserId -> requestId
    requests.forEach(r => {
      if (r.fromUserId === req.userId) {
        sentRequestTo.set(r.toUserId, r.id)
      } else if (r.toUserId === req.userId) {
        receivedRequestFrom.set(r.fromUserId, r.id)
      }
    })

    // 为每个用户添加关系状态
    const usersWithRelationship = users.map(user => {
      // 排除自己
      if (user.id === req.userId) {
        return null
      }
      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        isFriend: friendIds.has(user.id),
        hasSentRequest: sentRequestTo.has(user.id),
        hasReceivedRequest: receivedRequestFrom.has(user.id)
      }
    }).filter(u => u !== null)

    console.log('[Search] Final users with relationship:', usersWithRelationship.length)

    res.json({ users: usersWithRelationship })
  } catch (error) {
    console.error('[Search] Error:', error)
    res.status(500).json({ error: error.message, stack: error.stack })
  }
})

/**
 * 发送好友请求
 */
router.post('/request', authMiddleware, (req, res) => {
  try {
    const { toUserId } = req.body

    if (!toUserId) {
      return res.status(400).json({ error: '目标用户ID不能为空' })
    }

    if (toUserId === req.userId) {
      return res.status(400).json({ error: '不能添加自己为好友' })
    }

    // 检查目标用户是否存在
    if (!userExists(toUserId)) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // 检查是否已经是好友（双向检查）
    const existingFriendship = friendsDb.prepare(`
      SELECT id FROM friendships
      WHERE (userId = ? AND friendId = ?) OR (userId = ? AND friendId = ?)
    `).get(req.userId, toUserId, toUserId, req.userId)

    if (existingFriendship) {
      return res.status(400).json({ error: '你们已经是好友了' })
    }

    // 检查是否已有待处理的请求（双向检查）
    const existingRequest = friendsDb.prepare(`
      SELECT id FROM friend_requests
      WHERE ((fromUserId = ? AND toUserId = ?) OR (fromUserId = ? AND toUserId = ?))
      AND status = 'pending'
    `).get(req.userId, toUserId, toUserId, req.userId)

    if (existingRequest) {
      return res.status(400).json({ error: '已有待处理的好友请求' })
    }

    const fromUser = getUserById(req.userId)
    const toUser = getUserById(toUserId)

    if (!fromUser || !toUser) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const requestId = uuidv4()
    const now = new Date().toISOString()

    friendsDb.prepare(`
      INSERT INTO friend_requests (id, fromUserId, toUserId, status, createdAt)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(requestId, req.userId, toUserId, now)

    res.status(201).json({
      message: '好友请求已发送',
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
    })
  } catch (error) {
    console.error('发送好友请求错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * 接受好友请求
 */
router.post('/request/:requestId/accept', authMiddleware, (req, res) => {
  try {
    const { requestId } = req.params

    // 查找请求
    const request = friendsDb.prepare(`
      SELECT * FROM friend_requests
      WHERE id = ? AND toUserId = ? AND status = 'pending'
    `).get(requestId, req.userId)

    if (!request) {
      return res.status(404).json({ error: '好友请求不存在或已处理' })
    }

    const now = new Date().toISOString()
    const friendshipId1 = uuidv4()
    const friendshipId2 = uuidv4()

    // 双向添加好友关系
    friendsDb.prepare(`
      INSERT INTO friendships (id, userId, friendId, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(friendshipId1, req.userId, request.fromUserId, now)

    friendsDb.prepare(`
      INSERT INTO friendships (id, userId, friendId, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(friendshipId2, request.fromUserId, req.userId, now)

    // 更新请求状态
    friendsDb.prepare(`
      UPDATE friend_requests SET status = 'accepted' WHERE id = ?
    `).run(requestId)

    const fromUser = getUserById(request.fromUserId)

    res.json({
      message: '已接受好友请求',
      friend: {
        id: fromUser.id,
        username: fromUser.username,
        avatar: fromUser.avatar,
        status: 'offline',
        addedAt: now
      }
    })
  } catch (error) {
    console.error('接受好友请求错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * 拒绝好友请求
 */
router.post('/request/:requestId/reject', authMiddleware, (req, res) => {
  try {
    const { requestId } = req.params

    const request = friendsDb.prepare(`
      SELECT * FROM friend_requests
      WHERE id = ? AND toUserId = ? AND status = 'pending'
    `).get(requestId, req.userId)

    if (!request) {
      return res.status(404).json({ error: '好友请求不存在或已处理' })
    }

    friendsDb.prepare(`
      UPDATE friend_requests SET status = 'rejected' WHERE id = ?
    `).run(requestId)

    res.json({ message: '已拒绝好友请求' })
  } catch (error) {
    console.error('拒绝好友请求错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * 删除好友
 */
router.delete('/friend/:friendId', authMiddleware, (req, res) => {
  try {
    const { friendId } = req.params

    // 删除双向好友关系
    const result1 = friendsDb.prepare(`
      DELETE FROM friendships WHERE userId = ? AND friendId = ?
    `).run(req.userId, friendId)

    const result2 = friendsDb.prepare(`
      DELETE FROM friendships WHERE userId = ? AND friendId = ?
    `).run(friendId, req.userId)

    if (result1.changes === 0 && result2.changes === 0) {
      return res.status(404).json({ error: '好友关系不存在' })
    }

    res.json({ message: '已删除好友' })
  } catch (error) {
    console.error('删除好友错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * 取消发送的好友请求
 */
router.delete('/request/:requestId', authMiddleware, (req, res) => {
  try {
    const { requestId } = req.params

    const result = friendsDb.prepare(`
      DELETE FROM friend_requests
      WHERE id = ? AND fromUserId = ? AND status = 'pending'
    `).run(requestId, req.userId)

    if (result.changes === 0) {
      return res.status(404).json({ error: '请求不存在或无权取消' })
    }

    res.json({ message: '已取消好友请求' })
  } catch (error) {
    console.error('取消好友请求错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

export default router
