// 通知 Socket 处理器 - 实时推送通知给用户

import Notification from '../db/models/Notification.js'

// 用户 socket 映射
const userSockets = new Map()
// key: odId, value: Set<socketId>

export function setupNotificationHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Notification] Client connected: ${socket.id}`)

    // 用户登录后绑定通知频道
    socket.on('bind-notifications', (data, callback) => {
      const { odId } = data
      if (!odId) {
        callback?.({ success: false, error: '缺少 odId' })
        return
      }

      socket.odId = odId
      socket.join(`notifications:${odId}`)

      if (!userSockets.has(odId)) {
        userSockets.set(odId, new Set())
      }
      userSockets.get(odId).add(socket.id)

      console.log(`[Notification] Socket ${socket.id} subscribed to user ${odId}`)
      callback?.({ success: true })
    })

    // 解绑
    socket.on('unbind-notifications', (data, callback) => {
      if (socket.odId) {
        socket.leave(`notifications:${socket.odId}`)
        const sockets = userSockets.get(socket.odId)
        if (sockets) {
          sockets.delete(socket.id)
          if (sockets.size === 0) userSockets.delete(socket.odId)
        }
        socket.odId = null
      }
      callback?.({ success: true })
    })

    socket.on('disconnect', () => {
      if (socket.odId) {
        const sockets = userSockets.get(socket.odId)
        if (sockets) {
          sockets.delete(socket.id)
          if (sockets.size === 0) userSockets.delete(socket.odId)
        }
      }
      console.log(`[Notification] Client disconnected: ${socket.id}`)
    })
  })
}

/**
 * 向指定用户发送实时通知（通过 Socket.IO）
 */
export function pushNotificationToUser(io, odId, notification) {
  io.to(`notifications:${odId}`).emit('notification', {
    id: notification.id || notification._id?.toString(),
    type: notification.type,
    title: notification.title,
    content: notification.content,
    data: notification.data,
    createdAt: notification.createdAt || new Date()
  })
}

/**
 * 便捷函数：创建通知并实时推送
 */
export async function createAndPushNotification(io, { odId, type, title, content, data = {} }) {
  try {
    const notification = await Notification.create({ odId, type, title, content, data })
    pushNotificationToUser(io, odId, notification)
    return notification
  } catch (error) {
    console.error('[Notification] 创建并推送通知失败:', error.message)
    return null
  }
}
