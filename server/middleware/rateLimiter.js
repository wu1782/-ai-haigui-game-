// 限流中间件 - 保护API免受滥用
// 对于500+用户，每分钟30次AI调用是合理的限制

const rateLimits = {
  ai: { windowMs: 60000, maxRequests: 30 },     // 30次/分钟
  auth: { windowMs: 300000, maxRequests: 10 },   // 10次/5分钟
  general: { windowMs: 60000, maxRequests: 100 } // 100次/分钟
}

// 简单的内存存储（生产环境应使用Redis）
const requestCounts = new Map()

function cleanupOldEntries() {
  const now = Date.now()
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.windowStart > data.windowMs) {
      requestCounts.delete(key)
    }
  }
}

// 定期清理
setInterval(cleanupOldEntries, 60000)

/**
 * 创建限流中间件
 * @param {string} type - 限流类型
 * @returns 中间件函数
 */
export function createRateLimiter(type = 'general') {
  const limit = rateLimits[type] || rateLimits.general

  return (req, res, next) => {
    // 获取客户端标识符（优先使用用户ID，其次使用IP）
    const identifier = req.user?.id || req.ip || 'unknown'
    const key = `${type}:${identifier}`
    const now = Date.now()

    let record = requestCounts.get(key)

    if (!record || now - record.windowStart > limit.windowMs) {
      // 新窗口
      record = {
        windowStart: now,
        count: 1,
        windowMs: limit.windowMs
      }
      requestCounts.set(key, record)
    } else {
      record.count++
    }

    // 设置响应头
    res.set({
      'X-RateLimit-Limit': limit.maxRequests,
      'X-RateLimit-Remaining': Math.max(0, limit.maxRequests - record.count),
      'X-RateLimit-Reset': record.windowStart + limit.windowMs
    })

    if (record.count > limit.maxRequests) {
      console.warn(`[RateLimit] ${type} limit exceeded for ${identifier}`)
      return res.status(429).json({
        error: '请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((record.windowStart + limit.windowMs - now) / 1000)
      })
    }

    next()
  }
}

// AI专用限流（更严格）
export const aiRateLimiter = createRateLimiter('ai')

// 认证专用限流
export const authRateLimiter = createRateLimiter('auth')
