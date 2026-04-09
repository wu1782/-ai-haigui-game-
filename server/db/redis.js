// Redis 客户端配置
// 用于缓存、限流和Socket.IO跨实例通信

import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let redisClient = null
let redisAvailable = false

// 检查 Redis 是否可用
export function isRedisAvailable() {
  return redisAvailable
}

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      connectTimeout: 5000,
      lazyConnect: true,
      enableOfflineQueue: false // 禁用离线队列，连接失败时立即返回错误
    })

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully')
      redisAvailable = true
    })

    redisClient.on('error', (err) => {
      console.warn('[Redis] Connection error:', err.message)
      redisAvailable = false
    })

    redisClient.on('close', () => {
      console.warn('[Redis] Connection closed')
      redisAvailable = false
    })

    redisClient.on('ready', () => {
      redisAvailable = true
    })
  }

  return redisClient
}

export async function connectRedis() {
  const client = getRedisClient()
  // 如果已经连接，直接返回
  if (client.status === 'ready' || client.status === 'connect') {
    redisAvailable = true
    return client
  }
  try {
    await client.connect()
    redisAvailable = true
    return client
  } catch (error) {
    // 如果已经连接或正在连接，忽略错误
    if (error.message !== 'Redis is already connecting/connected') {
      console.warn('[Redis] Failed to connect, caching will be disabled:', error.message)
      redisAvailable = false
      // 不抛出错误，允许应用继续运行
    }
    return client
  }
}

export async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    redisAvailable = false
    console.log('[Redis] Disconnected')
  }
}

// 缓存辅助函数
export const cacheKeys = {
  room: (roomId) => `room:${roomId}`,
  leaderboard: (type) => `leaderboard:${type}`,
  session: (token) => `session:${token}`,
  rateLimit: (type, id) => `ratelimit:${type}:${id}`,
  aiResponse: (hash) => `ai:response:${hash}`
}

// 缓存设置（带TTL）
export async function cacheSet(key, value, ttlSeconds = 3600) {
  if (!isRedisAvailable()) {
    return false
  }
  try {
    const client = getRedisClient()
    await client.setex(key, ttlSeconds, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn('[Redis] Failed to set cache:', error.message)
    return false
  }
}

// 缓存获取
export async function cacheGet(key) {
  if (!isRedisAvailable()) {
    return null
  }
  try {
    const client = getRedisClient()
    const value = await client.get(key)
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.warn('[Redis] Failed to get cache:', error.message)
    return null
  }
}

// 缓存删除
export async function cacheDel(key) {
  if (!isRedisAvailable()) {
    return false
  }
  try {
    const client = getRedisClient()
    await client.del(key)
    return true
  } catch (error) {
    console.warn('[Redis] Failed to delete cache:', error.message)
    return false
  }
}

// 分布式锁
export async function acquireLock(key, ttlMs = 5000) {
  if (!isRedisAvailable()) {
    return false
  }
  try {
    const client = getRedisClient()
    const result = await client.set(key, '1', 'PX', ttlMs, 'NX')
    return result === 'OK'
  } catch (error) {
    console.warn('[Redis] Failed to acquire lock:', error.message)
    return false
  }
}

export async function releaseLock(key) {
  if (!isRedisAvailable()) {
    return false
  }
  try {
    const client = getRedisClient()
    await client.del(key)
    return true
  } catch (error) {
    console.warn('[Redis] Failed to release lock:', error.message)
    return false
  }
}

// ============ 登录锁定 (使用 Redis 存储) ============
const LOGIN_LOCK_KEYS = {
  attempts: (username) => `login:attempts:${username.toLowerCase()}`,
  lockout: (username) => `login:lockout:${username.toLowerCase()}`
}

export const MAX_ATTEMPTS = 5
export const LOCK_DURATION_MS = 15 * 60 * 1000 // 15分钟

/**
 * 记录登录失败，使用 Redis 存储
 */
export async function recordLoginFailure(username) {
  const key = LOGIN_LOCK_KEYS.attempts(username)
  const lockKey = LOGIN_LOCK_KEYS.lockout(username)
  const now = Date.now()

  if (!isRedisAvailable()) {
    // 降级方案：返回默认成功，让后续检查失败
    console.warn('[Redis] Login lock: Redis unavailable, using in-memory fallback')
    return { count: 1, lockedUntil: null, degraded: true }
  }

  try {
    const client = getRedisClient()

    // 使用 INCR 增加计数，并设置过期时间
    const count = await client.incr(key)

    // 首次失败时设置过期时间
    if (count === 1) {
      await client.pexpire(key, LOCK_DURATION_MS)
    }

    // 如果达到最大尝试次数，设置锁定
    if (count >= MAX_ATTEMPTS) {
      await client.set(lockKey, '1', 'PX', LOCK_DURATION_MS)
      await client.del(key) // 清除计数
      return { count, lockedUntil: now + LOCK_DURATION_MS }
    }

    return { count, lockedUntil: null }
  } catch (error) {
    console.error('[Redis] recordLoginFailure error:', error.message)
    return { count: 1, lockedUntil: null, degraded: true }
  }
}

/**
 * 检查账户是否被锁定
 */
export async function checkLoginLocked(username) {
  const lockKey = LOGIN_LOCK_KEYS.lockout(username)

  if (!isRedisAvailable()) {
    return null // 降级：不锁定
  }

  try {
    const client = getRedisClient()
    const locked = await client.get(lockKey)

    if (locked) {
      const ttl = await client.ttl(lockKey)
      return {
        locked: true,
        retryAfter: ttl > 0 ? ttl : Math.ceil(LOCK_DURATION_MS / 1000)
      }
    }

    return null
  } catch (error) {
    console.error('[Redis] checkLoginLocked error:', error.message)
    return null
  }
}

/**
 * 清除登录失败记录（登录成功时调用）
 */
export async function clearLoginAttempts(username) {
  const key = LOGIN_LOCK_KEYS.attempts(username)
  const lockKey = LOGIN_LOCK_KEYS.lockout(username)

  if (!isRedisAvailable()) {
    return
  }

  try {
    const client = getRedisClient()
    await client.del(key, lockKey)
  } catch (error) {
    console.error('[Redis] clearLoginAttempts error:', error.message)
  }
}
