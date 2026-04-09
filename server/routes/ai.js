// AI 路由 - 处理 AI 相关的 API 端点
// 包括增强提示系统

import express from 'express'
import { getStoryById as getStoryByIdService } from '../services/storyService.js'
import hintService, { HintType, HintCost, buildHintResponse } from '../services/hintService.js'
import { getCachedAIJudgment } from '../middleware/cacheLimiter.js'
import { aiRateLimiter } from '../middleware/rateLimiter.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// 获取提示成本信息
router.get('/hint-cost', authMiddleware, (req, res) => {
  const { userId, storyId } = req.query

  if (!userId || !storyId) {
    return res.status(400).json({ error: '缺少必要参数' })
  }

  res.json({
    costs: {
      [HintType.DIMENSION]: hintService.getHintCost(userId, storyId, HintType.DIMENSION),
      [HintType.DIRECTION]: hintService.getHintCost(userId, storyId, HintType.DIRECTION),
      [HintType.PARTIAL]: hintService.getHintCost(userId, storyId, HintType.PARTIAL)
    },
    totalCost: hintService.calculateTotalCost(userId, storyId),
    remainingScore: Math.max(0, 100 - hintService.calculateTotalCost(userId, storyId))
  })
})

// 获取增强提示
router.post('/hint', authMiddleware, aiRateLimiter, async (req, res) => {
  const { story, messages, hintType, userId, storyId } = req.body

  if (!story || typeof story.surface !== 'string') {
    return res.status(400).json({ error: 'story 参数缺失或格式错误' })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: '服务器未配置 API Key' })
  }

  // 如果没有提供 userId/storyId，使用临时ID
  const effectiveUserId = userId || 'anonymous'
  const effectiveStoryId = storyId || `temp_${Date.now()}`

  try {
    // 根据提示类型生成不同的提示
    let hintData

    switch (hintType) {
      case HintType.DIRECTION:
        hintData = hintService.generateDirectionHint(
          story,
          messages || [],
          messages?.[messages.length - 1]?.content || ''
        )
        break

      case HintType.PARTIAL:
        // 部分答案提示需要调用 AI
        hintData = await generatePartialHintWithAI(story, messages, apiKey)
        break

      case HintType.DIMENSION:
      default:
        // 维度提示
        hintData = hintService.generateDimensionHint(story, messages || [])
        break
    }

    // 记录提示使用
    hintService.recordHintUsage(effectiveUserId, effectiveStoryId, hintData.type)

    // 构建响应
    const response = buildHintResponse(hintData, effectiveUserId, effectiveStoryId)

    res.json(response)
  } catch (error) {
    console.error('AI Hint error:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

/**
 * 使用 AI 生成部分答案提示
 */
async function generatePartialHintWithAI(story, messages, apiKey) {
  const historyText = Array.isArray(messages) && messages.length > 0
    ? messages.map((m, i) => `Q${i + 1}: ${m.question || m.content || ''}\nA${i + 1}: ${m.answer || ''}`).join('\n')
    : '暂无'

  const prompt = `你是"海龟汤"推理游戏的AI助手。

【游戏背景】
汤面：${story.surface}
汤底：${story.bottom || '未知'}

【当前游戏状态】
玩家已问过的问题和回答：
${historyText}

【任务】
请从汤底中选择一个不明显的线索，以"暗示"的形式告诉玩家，帮助他们继续推理。
要求：
1. 不能直接透露答案
2. 只给出一个模糊的暗示（1句话）
3. 暗示应该是汤底的某个细节，但表达要模糊
4. 语言简洁，适合游戏提示`

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.8
    })
  })

  if (!response.ok) {
    throw new Error('AI API error')
  }

  const data = await response.json()
  const hint = data.choices?.[0]?.message?.content?.trim() || '暂时无法获取提示'

  return {
    hint,
    dimension: '线索',
    cost: hintService.getHintCost('anonymous', 'temp', HintType.PARTIAL),
    type: HintType.PARTIAL
  }
}

// 重置用户的提示记录（游戏重开时调用）
router.post('/hint/reset', authMiddleware, (req, res) => {
  const { userId, storyId } = req.body

  if (!userId || !storyId) {
    return res.status(400).json({ error: '缺少必要参数' })
  }

  hintService.resetUserHints(userId, storyId)

  res.json({ message: '提示记录已重置' })
})

// AI 生成故事端点
router.post('/generate', authMiddleware, aiRateLimiter, async (req, res) => {
  const { keywords } = req.body

  if (!keywords || !Array.isArray(keywords) || keywords.length < 3) {
    return res.status(400).json({ error: '需要至少3个关键词' })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: '服务器未配置 API Key' })
  }

  try {
    const prompt = `【角色】你是一个资深的"海龟汤推理游戏"出题专家。

【任务】根据用户提供的3个关键词，生成一个逻辑自洽、悬疑性强的海龟汤故事。

【输出格式 - 严格JSON】
只输出有效JSON，禁止任何解释文字：
{
  "title": "标题（2-20字）",
  "surface": "汤面（50-150字，悬疑/荒诞背景）",
  "bottom": "汤底（50-150字，核心反转，逻辑自洽）",
  "difficulty": 难度数值（1=简单，2=容易，3=中等，4=困难，5=地狱）,
  "tags": ["标签1", "标签2"]
}

【约束】
- 禁止输出JSON以外的任何内容
- 禁止在title中透露汤底信息
- 汤底必须能通过"是/否/无关"穷尽
- 难度评估要客观，基于逻辑复杂度和信息量

关键词：${keywords.join('、')}

请生成故事：`

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.8
      })
    })

    if (!response.ok) {
      throw new Error('AI API error')
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() || ''

    // 解析JSON响应
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      res.json({
        title: parsed.title || '无标题',
        surface: parsed.surface || '',
        bottom: parsed.bottom || '',
        difficulty: Math.min(5, Math.max(1, parsed.difficulty || 3)),
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['脑洞']
      })
    } else {
      res.status(500).json({ error: 'AI返回格式错误' })
    }
  } catch (error) {
    console.error('AI Generate error:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

// AI 判定端点
router.post('/judge', authMiddleware, aiRateLimiter, async (req, res) => {
  const { question, storyId, story: storyData } = req.body

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question 参数缺失' })
  }

  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: '服务器未配置 API Key' })
  }

  if (!storyId) {
    return res.status(400).json({ error: 'storyId 参数缺失' })
  }

  try {
    // 优先从数据库获取故事
    let story = await getStoryByIdService(storyId)
    if (!story && storyData && storyData.surface && storyData.bottom) {
      story = {
        id: storyId,
        surface: storyData.surface,
        bottom: storyData.bottom
      }
    }
    if (!story) {
      return res.status(404).json({ error: '故事不存在' })
    }

    // 使用缓存的 AI 判定
    const answer = await getCachedAIJudgment(question, storyId, async () => {
      const prompt = `【角色】你是"海龟汤"推理游戏的AI裁判。

【核心规则】
玩家通过提问（只能问是非题）来推理故事真相。你必须严格按以下规则回答：

【回答词汇】（只输出其中一个，禁止添加任何解释）
- "是"：玩家问题与汤底事实一致
- "否"：玩家问题与汤底事实矛盾
- "无关"：无法从汤底判断
- "已破案"：玩家完整猜出汤底真相

【判断标准】
- "是"：问题与汤底核心事实完全吻合
- "否"：问题与汤底事实直接矛盾
- "无关"：问题涉及汤底未提及的信息
- "已破案"：玩家完整准确地说出汤底真相

【当前故事】
汤面：${story.surface}
汤底：${story.bottom}

玩家问题：${question}

回答：`

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 50,
          temperature: 0.1
        })
      })

      if (!response.ok) {
        throw new Error('AI API error')
      }

      const data = await response.json()
      const rawAnswer = data.choices?.[0]?.message?.content?.trim() || ''

      // 验证答案
      const validAnswers = ['是', '否', '无关', '已破案']
      const normalizedAnswer = rawAnswer.replace(/[。！？，,.!?…~$%^&*()（）]/g, '').trim()

      if (validAnswers.includes(normalizedAnswer)) {
        return normalizedAnswer
      }

      // Fallback
      if (rawAnswer.includes('是') && !rawAnswer.includes('否') && !rawAnswer.includes('无关')) {
        return '是'
      }
      if (rawAnswer.includes('否') && !rawAnswer.includes('是')) {
        return '否'
      }
      if (rawAnswer.includes('无关') || rawAnswer.includes('无法判断')) {
        return '无关'
      }
      if (rawAnswer.includes('已破案') || rawAnswer.includes('正确')) {
        return '已破案'
      }

      console.warn(`AI返回不规范答案: "${rawAnswer}"`)
      return '无关'
    })

    res.json({ answer })
  } catch (error) {
    console.error('AI Judge error:', error)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

export default router
