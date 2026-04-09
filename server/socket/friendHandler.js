// 好友私聊处理器 - Socket.IO 事件
// 使用 MongoDB Message 模型持久化存储

import { filterSensitiveWords } from '../utils/sensitiveWords.js'
import Message from '../db/models/Message.js'
import { getConnectionStatus } from '../db/mongodb.js'

// 私信撤回时限（60秒）
const RECALL_WINDOW_MS = 60000

// 私信频率限制（10条/分钟）
const RATE_LIMIT_MESSAGES = 10
const RATE_LIMIT_WINDOW_MS = 60000

const messageRateLimit = new Map() // odId -> { count, windowStart }

// 定期清理过期的 rate limit 记录，防止内存泄漏（每5分钟清理一次）
setInterval(() => {
  const now = Date.now()
  for (const [odId, record] of messageRateLimit.entries()) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      messageRateLimit.delete(odId)
    }
  }
}, 5 * 60 * 1000)

function checkMessageRateLimit(odId) {
  const now = Date.now()
  let record = messageRateLimit.get(odId)

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    record = { count: 1, windowStart: now }
    messageRateLimit.set(odId, record)
    return { allowed: true, remaining: RATE_LIMIT_MESSAGES - 1 }
  }

  record.count++
  if (record.count > RATE_LIMIT_MESSAGES) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - record.windowStart)) / 1000) }
  }

  return { allowed: true, remaining: RATE_LIMIT_MESSAGES - record.count }
}

export function setupFriendHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Friend] Client connected: ${socket.id}`)

    // 用户绑定（登录后调用）
    socket.on('bind-user', async (data, callback) => {
      const { odId, username } = data
      if (!odId) {
        callback?.({ success: false, error: '缺少 odId' })
        return
      }
      socket.odId = odId
      socket.username = username || '匿名'
      socket.join(`user:${odId}`)
      console.log(`[Friend] Socket ${socket.id} bound to user ${odId}`)
      callback?.({ success: true })
    })

    // 解绑（登出时调用）
    socket.on('unbind-user', (data, callback) => {
      if (socket.odId) {
        socket.leave(`user:${socket.odId}`)
        socket.odId = null
      }
      callback?.({ success: true })
    })

    // 发送私信
    socket.on('private-message', async (data, callback) => {
      const { toUserId, content } = data

      if (!socket.odId) {
        callback?.({ success: false, error: '未登录' })
        return
      }

      if (!toUserId || !content) {
        callback?.({ success: false, error: '缺少参数' })
        return
      }

      const trimmed = content.trim().slice(0, 2000)
      if (!trimmed) {
        callback?.({ success: false, error: '消息不能为空' })
        return
      }

      // 频率限制
      const rate = checkMessageRateLimit(socket.odId)
      if (!rate.allowed) {
        callback?.({ success: false, error: '发送过于频繁', retryAfter: rate.retryAfter })
        return
      }

      // 敏感词过滤
      const filtered = filterSensitiveWords(trimmed)
      const finalContent = filtered.filtered

      try {
        // 保存到 MongoDB
        const message = await Message.create({
          fromOdId: socket.odId,
          toOdId: toUserId,
          content: finalContent,
          isRead: false
        })

        const responseData = {
          id: message._id.toString(),
          fromId: socket.odId,
          fromName: socket.username,
          toId: toUserId,
          content: finalContent,
          isRead: false,
          createdAt: message.createdAt.getTime()
        }

        // 发送给接收者（如果在线）
        io.to(`user:${toUserId}`).emit('private-message', responseData)

        callback?.({
          success: true,
          messageId: message._id.toString(),
          createdAt: message.createdAt.getTime()
        })
      } catch (error) {
        console.error('[Friend] Failed to save message:', error)
        callback?.({ success: false, error: '保存消息失败' })
      }
    })

    // 撤回私信
    socket.on('recall-message', async (data, callback) => {
      const { messageId } = data

      if (!socket.odId) {
        callback?.({ success: false, error: '未登录' })
        return
      }

      try {
        const message = await Message.findById(messageId)

        if (!message) {
          callback?.({ success: false, error: '消息不存在' })
          return
        }

        if (message.fromOdId !== socket.odId) {
          callback?.({ success: false, error: '无权撤回此消息' })
          return
        }

        if (message.recalledAt) {
          callback?.({ success: false, error: '消息已撤回' })
          return
        }

        const age = Date.now() - message.createdAt.getTime()
        if (age > RECALL_WINDOW_MS) {
          callback?.({ success: false, error: '超过60秒撤回时限' })
          return
        }

        // 撤回消息
        await message.recall()

        // 通知对方消息被撤回
        io.to(`user:${message.toOdId}`).emit('message-recalled', {
          messageId,
          recalledBy: socket.odId
        })

        callback?.({ success: true, recalledId: messageId })
      } catch (error) {
        console.error('[Friend] Failed to recall message:', error)
        callback?.({ success: false, error: '撤回消息失败' })
      }
    })

    // 获取聊天历史
    socket.on('get-private-history', async (data, callback) => {
      const { friendId, before, limit } = data

      if (!socket.odId) {
        callback?.({ success: false, error: '未登录' })
        return
      }

      if (!friendId) {
        callback?.({ success: false, error: '缺少 friendId' })
        return
      }

      try {
        const messages = await Message.getChatHistory(socket.odId, friendId, {
          before: before ? new Date(before) : null,
          limit: Math.min(100, limit || 50)
        })

        // 标记对方发来的未读消息为已读
        await Message.markAsRead(friendId, socket.odId)

        const formatted = messages.map(m => ({
          id: m._id.toString(),
          fromId: m.fromOdId,
          fromName: m.fromOdId === socket.odId ? socket.username : undefined,
          toId: m.toOdId,
          content: m.content,
          isRead: m.isRead,
          createdAt: m.createdAt.getTime()
        }))

        callback?.({ success: true, messages: formatted })
      } catch (error) {
        console.error('[Friend] Failed to get chat history:', error)
        callback?.({ success: false, error: '获取聊天记录失败' })
      }
    })

    // 标记消息已读
    socket.on('mark-private-read', async (data, callback) => {
      const { friendId } = data

      if (!socket.odId || !friendId) {
        callback?.({ success: false, error: '缺少参数' })
        return
      }

      try {
        const result = await Message.markAsRead(friendId, socket.odId)

        // 通知对方消息已被阅读
        if (result.modifiedCount > 0) {
          io.to(`user:${friendId}`).emit('messages-read', {
            byOdId: socket.odId,
            count: result.modifiedCount
          })
        }

        callback?.({ success: true, markedCount: result.modifiedCount })
      } catch (error) {
        console.error('[Friend] Failed to mark messages as read:', error)
        callback?.({ success: false, error: '标记已读失败' })
      }
    })

    // 获取未读消息数
    socket.on('get-unread-private-count', async (data, callback) => {
      const { friendId } = data

      if (!socket.odId) {
        callback?.({ success: false, error: '未登录' })
        return
      }

      try {
        let count
        if (friendId) {
          // 指定好友的未读数
          count = await Message.countDocuments({
            fromOdId: friendId,
            toOdId: socket.odId,
            isRead: false,
            recalledAt: null
          })
        } else {
          // 所有未读总数
          count = await Message.getUnreadCount(socket.odId)
        }
        callback?.({ success: true, count })
      } catch (error) {
        console.error('[Friend] Failed to get unread count:', error)
        callback?.({ success: false, error: '获取未读数失败', count: 0 })
      }
    })

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`[Friend] Client disconnected: ${socket.id}`)
    })
  })
}
