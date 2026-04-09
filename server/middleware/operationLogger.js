// 操作日志中间件 - 记录用户关键操作

import OperationLog from '../db/models/OperationLog.js'

/**
 * 关键操作配置
 * 定义需要记录的操作及其分类和级别
 */
const LOGGED_ACTIONS = {
  // 认证相关
  'auth.login': { resource: 'auth', level: 'info' },
  'auth.logout': { resource: 'auth', level: 'info' },
  'auth.register': { resource: 'auth', level: 'info' },
  'auth.password_change': { resource: 'auth', level: 'warn' },
  'auth.password_reset': { resource: 'auth', level: 'warn' },
  'auth.email_verify': { resource: 'auth', level: 'info' },

  // 故事投稿相关
  'story.contribute': { resource: 'story', level: 'info' },
  'story.resubmit': { resource: 'story', level: 'warn' },

  // 审核相关
  'story.review.approve': { resource: 'review', level: 'warn' },
  'story.review.reject': { resource: 'review', level: 'warn' },

  // 好友相关
  'friend.request': { resource: 'friend', level: 'info' },
  'friend.accept': { resource: 'friend', level: 'info' },
  'friend.reject': { resource: 'friend', level: 'info' },
  'friend.remove': { resource: 'friend', level: 'info' },
  'friend.block': { resource: 'friend', level: 'warn' },
  'friend.unblock': { resource: 'friend', level: 'warn' },

  // 评论相关
  'comment.create': { resource: 'comment', level: 'info' },
  'comment.edit': { resource: 'comment', level: 'info' },
  'comment.delete': { resource: 'comment', level: 'warn' },
  'comment.like': { resource: 'comment', level: 'info' },

  // 管理员操作
  'admin.user.ban': { resource: 'admin', level: 'critical' },
  'admin.user.unban': { resource: 'admin', level: 'critical' },
  'admin.achievement.reset': { resource: 'admin', level: 'critical' },
  'admin.story.feature': { resource: 'admin', level: 'warn' },

  // 游戏相关
  'game.start': { resource: 'game', level: 'info' },
  'game.end': { resource: 'game', level: 'info' },
  'game.victory': { resource: 'game', level: 'info' },
  'game.giveup': { resource: 'game', level: 'info' }
}

/**
 * 创建操作日志中间件
 * @param {string} action - 操作名称，如 'auth.login'
 * @returns {Function} Express middleware
 */
export function operationLogger(action) {
  const config = LOGGED_ACTIONS[action]

  // 如果操作不在配置中，返回空中间件
  if (!config) {
    return (req, res, next) => next()
  }

  return async (req, res, next) => {
    // 保存原始 res.json
    const originalJson = res.json.bind(res)

    // 拦截响应
    res.json = function(data) {
      // 异步记录日志，不阻塞响应
      setImmediate(async () => {
        try {
          // 提取响应中的关键信息
          let resourceId = null
          let status = 'success'
          let errorMessage = null

          if (data && typeof data === 'object') {
            resourceId = data.id || data.storyId || data.requestId || req.params?.id || null
            status = data.success === false ? 'failure' : 'success'
            errorMessage = data.error || null
          }

          // 不记录敏感字段
          const safeBody = req.body && Object.keys(req.body).length > 0
            ? Object.keys(req.body).reduce((acc, key) => {
                // 过滤敏感字段
                if (['password', 'token', 'refreshToken', 'accessToken', 'secret'].includes(key)) {
                  acc[key] = '[REDACTED]'
                } else {
                  acc[key] = req.body[key]
                }
                return acc
              }, {})
            : null

          const logEntry = {
            odId: req.userId || 'anonymous',
            username: req.user?.username || null,
            action,
            resource: config.resource,
            resourceId,
            details: {
              method: req.method,
              path: req.path,
              query: req.query,
              body: safeBody
            },
            ipAddress: req.ip || req.connection?.remoteAddress || null,
            userAgent: req.headers['user-agent'] || null,
            status,
            errorMessage
          }

          await OperationLog.create(logEntry)

          // 根据日志级别输出
          const logMethod = config.level === 'critical' ? 'error' :
                           config.level === 'warn' ? 'warn' : 'info'
          console[logMethod](`[OperationLog] ${action} by ${logEntry.odId}: ${status}`)
        } catch (err) {
          // 日志记录失败不应该影响主流程
          console.error('[OperationLog] Failed to write log:', err.message)
        }
      })

      // 返回原始响应
      return originalJson(data)
    }

    next()
  }
}

/**
 * 快速记录操作日志（用于需要在响应前记录的场合）
 * @param {Object} params - 日志参数
 */
export async function logOperation({ odId, username, action, resource, resourceId, details, ipAddress, userAgent, status = 'success', errorMessage = null }) {
  try {
    const config = LOGGED_ACTIONS[action] || { resource: 'unknown', level: 'info' }

    await OperationLog.create({
      odId: odId || 'system',
      username: username || null,
      action,
      resource: config.resource || resource || 'unknown',
      resourceId,
      details,
      ipAddress,
      userAgent,
      status,
      errorMessage
    })
  } catch (err) {
    console.error('[OperationLog] Failed to log operation:', err.message)
  }
}

/**
 * 查询操作日志
 * @param {Object} filters - 查询过滤器
 * @param {number} limit - 返回数量
 * @param {number} offset - 偏移量
 */
export async function queryOperationLogs(filters = {}, limit = 50, offset = 0) {
  const query = {}

  if (filters.odId) query.odId = filters.odId
  if (filters.action) query.action = filters.action
  if (filters.resource) query.resource = filters.resource
  if (filters.status) query.status = filters.status
  if (filters.startDate || filters.endDate) {
    query.createdAt = {}
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate)
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate)
  }

  const [logs, total] = await Promise.all([
    OperationLog.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    OperationLog.countDocuments(query)
  ])

  return { logs, total }
}

export default operationLogger
