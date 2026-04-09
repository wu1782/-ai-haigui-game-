/**
 * AI服务 - 调用服务器端点进行问题判定
 * 注意：API Key仅存在于服务器端，客户端不存储任何敏感信息
 */
import { API_CONFIG } from '../constants'

interface AIResponse {
  answer: '是' | '否' | '无关' | '已破案'
  is_victory: boolean
}

// AI生成新汤响应
export interface AIGeneratedStory {
  surface: string      // 汤面
  bottom: string        // 汤底
  title: string         // 标题
  difficulty: number    // 难度 1-5
  tags: string[]        // 标签
}

/**
 * 调用服务器端AI判定
 * @param question 玩家问题
 * @param storyId 故事ID
 * @param storyBottom 故事汤底（用于验证）
 * @returns AI判定结果
 */
export async function getAIResponse(
  question: string,
  storyId: string,
  _storyBottom: string
): Promise<AIResponse> {
  try {
    const response = await fetch(API_CONFIG.AI_JUDGE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ question, storyId })
    })

    if (!response.ok) {
      throw new Error(`AI判定请求失败: ${response.status}`)
    }

    const data = await response.json()
    const answer = data?.data?.answer ?? data?.answer ?? '无关'

    return {
      answer,
      is_victory: answer === '已破案'
    }
  } catch (error) {
    console.error('AI判定失败:', error)
    // 降级到模拟响应（使用随机响应）
    return simulateAIResponse(question)
  }
}

/**
 * AI生成新汤
 * @param keywords 3个关键词
 * @returns 生成的故事
 */
export async function generateStory(keywords: string[]): Promise<AIGeneratedStory> {
  try {
    const response = await fetch(API_CONFIG.AI_GENERATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ keywords })
    })

    if (!response.ok) {
      throw new Error(`AI生成请求失败: ${response.status}`)
    }

    const data = await response.json()
    const payload = data?.data ?? data ?? {}

    return {
      title: payload.title || '无标题',
      surface: payload.surface || '',
      bottom: payload.bottom || '',
      difficulty: Math.min(5, Math.max(1, payload.difficulty || 3)),
      tags: Array.isArray(payload.tags) ? payload.tags : []
    }
  } catch (error) {
    console.error('AI生成失败:', error)
    // 返回默认故事
    return {
      title: `${keywords.join('')}之谜`,
      surface: '故事生成失败，请稍后重试',
      bottom: '',
      difficulty: 3,
      tags: ['脑洞']
    }
  }
}

// 模拟AI响应（仅作为降级方案）
function simulateAIResponse(_question: string): AIResponse {
  // 随机返回
  const rand = Math.random()
  if (rand < 0.3) {
    return { answer: '是', is_victory: false }
  } else if (rand < 0.6) {
    return { answer: '否', is_victory: false }
  } else {
    return { answer: '无关', is_victory: false }
  }
}

// 生成用户友好的错误提示
export function getAIServiceErrorHint(): string {
  return 'AI判定服务暂时不可用，请稍后重试'
}
