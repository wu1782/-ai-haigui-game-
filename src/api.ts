import type { TStory } from './types/story'
import type { TMessage } from './types/message'
import { API_CONFIG } from './constants'

/**
 * AI API 调用封装
 * 调用后端 Express 服务器，由服务器调用 DeepSeek AI
 */

// 有效答案列表
const VALID_ANSWERS = ['是', '否', '无关', '已破案']

// AI回复消息类型（带answer字段）
interface AIAnswerMessage {
  type: 'answer'
  answer: string
}

// 重试配置
const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
}

/**
 * 带重试的 fetch 封装
 * 使用指数退避策略
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retryOptions: Partial<typeof DEFAULT_RETRY_OPTIONS> = {}
): Promise<T> {
  const { maxRetries, retryDelay, retryableStatuses } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...retryOptions
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 创建超时控制器
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // 检查是否是可重试的状态码
      if (response.ok) {
        return await response.json()
      }

      // 如果是不可重试的状态码（如 401, 403, 404），直接抛出错误
      if (!retryableStatuses.includes(response.status)) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `请求失败: ${response.status}`)
      }

      // 如果还有重试次数，等待后重试
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt) // 指数退避
        console.log(`[API] Attempt ${attempt + 1} failed with ${response.status}, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // 达到最大重试次数
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `请求失败: ${response.status}`)

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = new Error('请求超时')
        } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          // 网络错误，可重试
          if (attempt < maxRetries) {
            const delay = retryDelay * Math.pow(2, attempt)
            console.log(`[API] Network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`)
            await new Promise(resolve => setTimeout(resolve, delay))
            lastError = error
            continue
          }
          lastError = new Error('网络错误：无法连接到服务器，请确保后端服务已启动')
        } else {
          lastError = error
        }
      } else {
        lastError = new Error('未知错误')
      }
    }
  }

  throw lastError || new Error('请求失败')
}

/**
 * 调用后端 AI 服务判断玩家问题
 */
export async function askAI(question: string, story: TStory): Promise<string> {
  try {
    const data = await fetchWithRetry<{ data?: { answer?: string } }>(API_CONFIG.AI_JUDGE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        question,
        storyId: story.id,
        story: story // 发送完整故事对象，以便后端处理自定义故事
      })
    })

    const answer = data.data?.answer?.trim()

    if (!answer) {
      throw new Error('AI 返回内容为空')
    }

    // 检查答案是否有效（使用完全匹配）
    const isValidAnswer = VALID_ANSWERS.some(v => answer === v || answer.trim() === v)
    if (!isValidAnswer) {
      console.warn('[API] AI 返回可能无效:', answer)
      // 仍然返回，可能是模糊回答
    }

    return answer
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    console.error('[API] AI 调用失败:', message)
    throw new Error(`AI 调用失败: ${message}`)
  }
}

/**
 * 获取AI辅助提示
 * @param story - 当前故事
 * @param messages - 对话历史
 * @returns 提示内容
 */
export async function getAIHint(story: TStory, messages: TMessage[]): Promise<{ hint: string; dimension: string }> {
  try {
    const data = await fetchWithRetry<{ data?: { hint?: string; dimension?: string } }>(API_CONFIG.AI_HINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        story: {
          surface: story.surface,
          bottom: story.bottom
        },
        messages: messages.map(m => ({
          question: m.content || '',
          answer: (m as unknown as AIAnswerMessage).answer || ''
        }))
      })
    })

    const hint = data.data?.hint?.trim() || '暂时无法获取提示'

    return {
      hint,
      dimension: data.data?.dimension || '综合分析'
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    throw new Error(`获取提示失败: ${message}`)
  }
}

/**
 * 检查 API 是否已配置（后端服务是否可用）
 */
export async function isAIConfigured(): Promise<boolean> {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch {
    return false
  }
}
