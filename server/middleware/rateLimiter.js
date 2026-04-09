// 限流中间件 - 保护API免受滥用
// 包含两层限制：
//   1. 短时限流（per-minute）- 防止突发滥用
//   2. 日限额（per-day）- 防止持续消耗API配额
//
// ⚠️ 生产环境警告：
// 当前实现使用内存存储，多实例部署时不共享限流计数
// 建议配置 REDIS_URL 使用 Redis 存储

const rateLimits = {
  ai: { windowMs: 60000, maxRequests: 30 },     // 30次/分钟（短时）
  aiDaily: { windowMs: 86400000, maxRequests: 500 }, // 500次/天（日额）
  auth: { windowMs: 300000, maxRequests: 10 },   // 10次/5分钟
  general: { windowMs: 60000, maxRequests: 100 } // 100次/分钟
}

// 内存存储（生产环境应使用Redis实现跨实例共享）
const requestCounts = new Map()
const dailyCounts = new Map() // 独立存储日计数

// 检查 Redis 是否可用
let redisClient = null
let useRedis = false

async function checkRedisAvailable() {
  if (redisClient !== null) return useRedis

  try {
    const { getRedisClient: getClient } = await import('../db/redis.js')
    redisClient = getClient()
    // 测试连接
    await redisClient.ping()
    useRedis = true
    console.log('[RateLimit] Using Redis for distributed rate limiting')
  } catch (error) {
    useRedis = false
    if (process.env.NODE_ENV === 'production') {
      console.warn('[RateLimit] ⚠️ Redis not available. Rate limiting uses in-memory storage (not suitable for multi-instance deployment)')
    }
  }
  return useRedis
}

function cleanupOldEntries() {
  const now = Date.now()
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.windowStart > data.windowMs) {
      requestCounts.delete(key)
    }
  }
  for (const [key, data] of dailyCounts.entries()) {
    if (now - data.windowStart > data.windowMs) {
      dailyCounts.delete(key)
    }
  }
}

// 定期清理 - 保存引用以便清理
const cleanupInterval = setInterval(cleanupOldEntries, 60000)

// 导出清理函数供服务关闭时调用
export function cleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
  }
}

// 初始化时检查 Redis
let redisCheckDone = false
const initRedisCheck = async () => {
  if (!redisCheckDone) {
    redisCheckDone = true
    await checkRedisAvailable()
  }
}

// 启动时检查 Redis（异步，不阻塞）
initRedisCheck()

/**
 * 创建限流中间件
 * @param {string} type - 限流类型
 * @param {boolean} checkDaily - 是否同时检查日限额
 * @returns 中间件函数
 */
export function createRateLimiter(type = 'general', checkDaily = false) {
  const limit = rateLimits[type] || rateLimits.general
  const dailyLimit = rateLimits.aiDaily

  return (req, res, next) => {
    // 获取客户端标识符（优先使用用户ID，其次使用IP）
    const identifier = req.userId || req.ip || 'unknown'
    const key = `${type}:${identifier}`
    const now = Date.now()

    // === 短时限流检查 ===
    let record = requestCounts.get(key)

    if (!record || now - record.windowStart > limit.windowMs) {
      record = {
        windowStart: now,
        count: 1,
        windowMs: limit.windowMs
      }
      requestCounts.set(key, record)
    } else {
      record.count++
    }

    res.set({
      'X-RateLimit-Limit': limit.maxRequests,
      'X-RateLimit-Remaining': Math.max(0, limit.maxRequests - record.count),
      'X-RateLimit-Reset': record.windowStart + limit.windowMs
    })

    if (record.count > limit.maxRequests) {
      console.warn(`[RateLimit] ${type} short-term limit exceeded for ${identifier}`)
      return res.status(429).json({
        error: '请求过于频繁，请稍后再试',
        code: 'RATE_LIMIT_SHORT',
        retryAfter: Math.ceil((record.windowStart + limit.windowMs - now) / 1000)
      })
    }

    // === 日限额检查（仅AI接口）===
    if (checkDaily) {
      const dailyKey = `ai_daily:${identifier}`
      let dailyRecord = dailyCounts.get(dailyKey)

      // 获取今天的0点时间戳作为窗口开始
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayStartMs = todayStart.getTime()

      if (!dailyRecord || dailyRecord.windowStart !== todayStartMs) {
        // 新的一天，重置计数
        dailyRecord = {
          windowStart: todayStartMs,
          count: 1,
          windowMs: dailyLimit.windowMs
        }
        dailyCounts.set(dailyKey, dailyRecord)
      } else {
        dailyRecord.count++
      }

      res.set({
        'X-DailyQuota-Limit': dailyLimit.maxRequests,
        'X-DailyQuota-Remaining': Math.max(0, dailyLimit.maxRequests - dailyRecord.count),
        'X-DailyQuota-Reset': new Date(todayStartMs + dailyLimit.windowMs).toISOString()
      })

      if (dailyRecord.count > dailyLimit.maxRequests) {
        console.warn(`[RateLimit] AI daily quota exceeded for ${identifier}`)
        return res.status(429).json({
          error: '今日AI调用次数已用完，请明日再试',
          code: 'DAILY_QUOTA_EXCEEDED',
          retryAfter: Math.ceil((todayStartMs + dailyLimit.windowMs - now) / 1000)
        })
      }
    }

    next()
  }
}

// AI专用限流（严格：短时 + 日额）
export const aiRateLimiter = createRateLimiter('ai', true)

// 认证专用限流
export const authRateLimiter = createRateLimiter('auth')
