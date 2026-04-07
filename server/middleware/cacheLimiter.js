// AI响应缓存中间件
// 使用Redis缓存AI响应，减少重复API调用

import { getRedisClient, cacheKeys } from '../db/redis.js'

// 创建AI响应的hash key
function createQuestionHash(question, storyId) {
  // 使用简单的 hash 函数
  const str = `${storyId}:${question}`
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  // 使用无符号移位确保得到正数
  return (hash >>> 0).toString(36)
}

// 获取缓存的AI响应
export async function getCachedAIResponse(question, storyId) {
  try {
    const redis = getRedisClient()
    const hash = createQuestionHash(question, storyId)
    const key = cacheKeys.aiResponse(hash)
    const cached = await redis.get(key)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (error) {
    console.warn('[Cache] Failed to get cached AI response:', error.message)
    // 缓存失败时返回 null，继续调用 AI
  }
  return null
}

// 缓存AI响应
export async function cacheAIResponse(question, storyId, answer, ttlSeconds = 3600) {
  try {
    const redis = getRedisClient()
    const hash = createQuestionHash(question, storyId)
    const key = cacheKeys.aiResponse(hash)
    await redis.setex(key, ttlSeconds, JSON.stringify({ answer }))
  } catch (error) {
    console.warn('[Cache] Failed to cache AI response:', error.message)
    // 缓存失败不影响主流程，只是会增加下次相同问题的AI调用
  }
}

// 带缓存的AI判定
export async function getCachedAIJudgment(question, storyId, fetchAIResponse) {
  // 尝试从缓存获取
  const cached = await getCachedAIResponse(question, storyId)
  if (cached) {
    console.log('[Cache] AI response cache hit')
    return cached.answer
  }

  // 缓存未命中，调用实际AI
  console.log('[Cache] AI response cache miss')
  const answer = await fetchAIResponse()

  // 缓存结果
  await cacheAIResponse(question, storyId, answer)

  return answer
}
