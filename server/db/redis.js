// Redis 客户端配置
// 用于缓存、限流和Socket.IO跨实例通信

import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

let redisClient = null

export function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true
    })

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully')
    })

    redisClient.on('error', (err) => {
      console.error('[Redis] Connection error:', err)
    })

    redisClient.on('close', () => {
      console.warn('[Redis] Connection closed')
    })
  }

  return redisClient
}

export async function connectRedis() {
  const client = getRedisClient()
  try {
    await client.connect()
    return client
  } catch (error) {
    // 如果已经连接，忽略错误
    if (error.message !== 'Redis is already connecting/connected') {
      console.error('[Redis] Failed to connect:', error)
      throw error
    }
  }
}

export async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
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
  const client = getRedisClient()
  await client.setex(key, ttlSeconds, JSON.stringify(value))
}

// 缓存获取
export async function cacheGet(key) {
  const client = getRedisClient()
  const value = await client.get(key)
  return value ? JSON.parse(value) : null
}

// 缓存删除
export async function cacheDel(key) {
  const client = getRedisClient()
  await client.del(key)
}

// 分布式锁
export async function acquireLock(key, ttlMs = 5000) {
  const client = getRedisClient()
  const result = await client.set(key, '1', 'PX', ttlMs, 'NX')
  return result === 'OK'
}

export async function releaseLock(key) {
  const client = getRedisClient()
  await client.del(key)
}
