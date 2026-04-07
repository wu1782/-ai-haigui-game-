import type { TStory } from './types/story'
import type { TMessage } from './types/message'
import { API_CONFIG } from './constants'

/**
 * AI API 调用封装
 * 调用后端 Express 服务器，由服务器调用 DeepSeek AI
 */

// 有效答案列表
const VALID_ANSWERS = ['是', '否', '无关', '与此无关', '已破案']

// AI回复消息类型（带answer字段）
interface AIAnswerMessage {
  type: 'answer'
  answer: string
}

/**
 * 调用后端 AI 服务判断玩家问题
 */
export async function askAI(question: string, story: TStory): Promise<string> {
  try {
    // 使用新的 /api/ai/judge 接口，支持缓存
    const response = await fetch(API_CONFIG.AI_JUDGE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        question,
        storyId: story.id
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `请求失败: ${response.status}`)
    }

    const data = await response.json()
    const answer = data.answer?.trim()

    if (!answer) {
      throw new Error('AI 返回内容为空')
    }

    // 检查答案是否有效
    const isValidAnswer = VALID_ANSWERS.some(v => answer.includes(v))
    if (!isValidAnswer) {
      console.warn('[API] AI 返回可能无效:', answer)
      // 仍然返回，可能是模糊回答
    }

    return answer
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('网络错误：无法连接到服务器，请确保后端服务已启动')
    }
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
    const response = await fetch(API_CONFIG.AI_HINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`)
    }

    const data = await response.json()
    const hint = data.hint?.trim() || '暂时无法获取提示'

    return {
      hint,
      dimension: data.dimension || '综合分析'
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('网络错误：无法连接到服务器')
    }
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
