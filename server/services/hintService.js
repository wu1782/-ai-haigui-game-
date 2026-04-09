// 增强提示服务 - 提供渐进式提示和成本系统
// Hint types: dimension hint, yes/no hint, partial answer

// 提示类型枚举
export const HintType = {
  DIMENSION: 'dimension',     // 维度提示：提示应该问哪个方面
  DIRECTION: 'direction',    // 方向提示：提示是/否方向
  PARTIAL: 'partial',        // 部分答案：透露部分信息
  COST_REDUCING: 'cost_reducing'  // 减益型：减少得分但不透露信息
}

// 提示成本配置（影响最终得分）
export const HintCost = {
  [HintType.DIMENSION]: 0,      // 免费提示，引导玩家方向
  [HintType.DIRECTION]: 10,     // 扣除10%分数
  [HintType.PARTIAL]: 25,       // 扣除25%分数
  [HintType.COST_REDUCING]: 5   // 小幅度减分
}

// 默认提示服务
class HintService {
  constructor() {
    this.usedHints = new Map() // userId:storyId -> { type: count }
    this.timestamps = new Map() // userId:storyId -> lastAccessTime
    this.HINT_TTL = 24 * 60 * 60 * 1000 // 24小时 TTL
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000) // 每小时清理
  }

  // 清理过期提示记录
  cleanup() {
    const now = Date.now()
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp > this.HINT_TTL) {
        this.usedHints.delete(key)
        this.timestamps.delete(key)
      }
    }
  }

  // 更新最后访问时间
  touch(key) {
    this.timestamps.set(key, Date.now())
  }

  /**
   * 获取提示成本
   * @param {string} userId - 用户ID
   * @param {string} storyId - 故事ID
   * @param {string} hintType - 提示类型
   * @returns {number} 成本百分比 (0-100)
   */
  getHintCost(userId, storyId, hintType) {
    const baseCost = HintCost[hintType] || 0
    const usedCount = this.getUsedHintCount(userId, storyId, hintType)

    // 同一类型提示每多使用一次，成本增加50%
    const multiplier = Math.pow(1.5, usedCount)
    return Math.min(baseCost * multiplier, 50) // 最高50%封顶
  }

  /**
   * 获取已使用提示次数
   */
  getUsedHintCount(userId, storyId, hintType) {
    const key = `${userId}:${storyId}`
    this.touch(key) // 更新访问时间
    const storyHints = this.usedHints.get(key) || {}
    return storyHints[hintType] || 0
  }

  /**
   * 记录提示使用
   */
  recordHintUsage(userId, storyId, hintType) {
    const key = `${userId}:${storyId}`
    if (!this.usedHints.has(key)) {
      this.usedHints.set(key, {})
    }
    const storyHints = this.usedHints.get(key)
    storyHints[hintType] = (storyHints[hintType] || 0) + 1
    this.touch(key)
  }

  /**
   * 计算总成本
   */
  calculateTotalCost(userId, storyId) {
    const key = `${userId}:${storyId}`
    this.touch(key) // 更新访问时间
    const storyHints = this.usedHints.get(key) || {}
    let totalCost = 0

    for (const [type, count] of Object.entries(storyHints)) {
      const baseCost = HintCost[type] || 0
      // 累进成本计算
      for (let i = 0; i < count; i++) {
        totalCost += baseCost * Math.pow(1.5, i)
      }
    }

    return Math.min(totalCost, 75) // 最高75%封顶
  }

  /**
   * 生成维度提示 - 告诉玩家应该从哪个方向问问题
   */
  generateDimensionHint(story, messages) {
    const dimensions = this.analyzeDimensions(story)
    const askedDimensions = this.extractAskedDimensions(messages)

    // 找出玩家还没问过的维度
    const availableDimensions = dimensions.filter(d => !askedDimensions.includes(d))

    if (availableDimensions.length === 0) {
      return {
        hint: '你已经问了所有关键维度，尝试从已有信息中组合推理',
        dimension: '综合',
        cost: 0,
        type: HintType.DIMENSION
      }
    }

    // 选择最少被探索的维度
    const suggestedDimension = availableDimensions[0]

    const dimensionLabels = {
      '人物': '关于故事中的人物身份、特征、关系',
      '物品': '关于重要的物品、工具、证据',
      '事件': '关于发生了什么、事件的经过',
      '时间': '关于时间点、顺序、期限',
      '原因': '关于动机、目的、为什么发生',
      '位置': '关于地点、环境、场所',
      '状态': '关于状态变化、异常情况',
      '关系': '关于人物之间的联系'
    }

    return {
      hint: `建议思考方向：${dimensionLabels[suggestedDimension] || '故事的某个关键环节'}`,
      dimension: suggestedDimension,
      cost: this.getHintCost('anonymous', 'temp', HintType.DIMENSION),
      type: HintType.DIMENSION
    }
  }

  /**
   * 生成方向提示 - 告诉玩家答案是肯定还是否定
   */
  generateDirectionHint(story, messages, lastQuestion) {
    if (!lastQuestion) {
      return {
        hint: '先问一个具体问题，我才能告诉你答案的方向',
        cost: 0,
        type: HintType.DIRECTION
      }
    }

    // 分析最后一个问题与汤底的关系
    const isCorrectDirection = this.checkQuestionDirection(lastQuestion, story)

    return {
      hint: isCorrectDirection
        ? '你问的方向是对的，继续深入！'
        : '这个问题可能跑偏了，尝试换个角度思考',
      direction: isCorrectDirection ? 'positive' : 'negative',
      cost: this.getHintCost('anonymous', 'temp', HintType.DIRECTION),
      type: HintType.DIRECTION
    }
  }

  /**
   * 生成部分答案提示 - 透露部分答案信息
   */
  generatePartialHint(story, messages) {
    const partialInfo = this.extractPartialInfo(story, messages)

    if (partialInfo.length === 0) {
      return {
        hint: '目前信息不足以给出部分提示，尝试问更多问题',
        cost: 0,
        type: HintType.PARTIAL
      }
    }

    // 随机选择一个未透露的部分
    const selected = partialInfo[Math.floor(Math.random() * partialInfo.length)]

    return {
      hint: `线索：${selected.clue}`,
      detail: selected.detail,
      cost: this.getHintCost('anonymous', 'temp', HintType.PARTIAL),
      type: HintType.PARTIAL
    }
  }

  /**
   * 分析故事涉及的维度
   */
  analyzeDimensions(story) {
    const dimensions = []
    const bottom = story.bottom || ''

    // 简单分析汤底内容，识别维度
    if (bottom.match(/[男女丈夫妻子父亲母亲哥哥姐姐]/)) dimensions.push('人物')
    if (bottom.match(/[刀药枪绳子的|工具物品]/)) dimensions.push('物品')
    if (bottom.match(/[死亡杀死谋杀自杀]/)) dimensions.push('事件')
    if (bottom.match(/[时间凌晨午夜傍晚]/)) dimensions.push('时间')
    if (bottom.match(/[为了因为所以]/)) dimensions.push('原因')
    if (bottom.match(/[在家里在公园在医院在某处]/)) dimensions.push('位置')

    // 默认添加基础维度
    if (dimensions.length === 0) {
      dimensions.push('人物', '事件', '原因')
    }

    return [...new Set(dimensions)]
  }

  /**
   * 从消息历史中提取已问过的维度
   */
  extractAskedDimensions(messages) {
    const dimensions = []
    const dimensionKeywords = {
      '人物': ['谁', '什么人', '身份', '名字', '人'],
      '物品': ['什么', '东西', '物品', '工具'],
      '事件': ['做了什么', '发生了什么', '事件'],
      '时间': ['什么时候', '几点', '时间'],
      '原因': ['为什么', '为何', '原因', '为了'],
      '位置': ['在哪', '哪里', '地点', '位置']
    }

    for (const msg of messages) {
      const content = (msg.question || msg.content || '').toLowerCase()
      for (const [dim, keywords] of Object.entries(dimensionKeywords)) {
        if (keywords.some(kw => content.includes(kw))) {
          dimensions.push(dim)
        }
      }
    }

    return [...new Set(dimensions)]
  }

  /**
   * 检查问题方向是否正确
   */
  checkQuestionDirection(question, story) {
    // 简化实现：检查问题关键词是否与汤底相关
    const questionLower = question.toLowerCase()
    const bottomLower = (story.bottom || '').toLowerCase()

    // 提取汤底关键词
    const bottomKeywords = bottomLower.split(/[,，。、；;]/).filter(s => s.length > 2)

    // 检查问题是否命中任何汤底关键词
    for (const keyword of bottomKeywords) {
      if (questionLower.includes(keyword.trim())) {
        return true
      }
    }

    return false
  }

  /**
   * 提取可以透露的部分信息
   */
  extractPartialInfo(story, messages) {
    const info = []
    const bottom = story.bottom || ''
    const surface = story.surface || ''

    // 已问过的问题
    const askedQuestions = messages.map(m => (m.question || m.content || '').toLowerCase())

    // 分析汤底结构
    const sentences = bottom.split(/[，。；!?！？]/)

    for (const sentence of sentences) {
      if (sentence.length > 5 && sentence.length < 50) {
        // 检查这个问题是否已经被类似问题探索过
        const isAlreadyExplored = askedQuestions.some(q =>
          this.calculateSimilarity(q, sentence) > 0.3
        )

        if (!isAlreadyExplored) {
          info.push({
            clue: sentence.substring(0, 15) + '...',
            detail: sentence,
            dimension: this.classifySentenceDimension(sentence)
          })
        }
      }
    }

    return info
  }

  /**
   * 计算文本相似度（简单版）
   */
  calculateSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(''))
    const words2 = new Set(text2.toLowerCase().split(''))
    const intersection = [...words1].filter(c => words2.has(c))
    return intersection.length / Math.max(words1.size, words2.size)
  }

  /**
   * 分类句子维度
   */
  classifySentenceDimension(sentence) {
    if (sentence.match(/[男女主人公主角]/)) return '人物'
    if (sentence.match(/[死亡杀死谋杀]/)) return '事件'
    if (sentence.match(/[为了因为]/)) return '原因'
    return '综合'
  }

  /**
   * 重置用户提示记录（游戏重开时调用）
   */
  resetUserHints(userId, storyId) {
    const key = `${userId}:${storyId}`
    this.usedHints.delete(key)
    this.timestamps.delete(key)
  }
}

// 导出单例
const hintService = new HintService()
export default hintService

// 辅助函数：生成完整提示响应
export function buildHintResponse(hintData, userId, storyId) {
  return {
    hint: hintData.hint,
    dimension: hintData.dimension || '综合',
    hintType: hintData.type,
    cost: hintData.cost,
    totalCost: hintService.calculateTotalCost(userId, storyId),
    remainingScore: Math.max(0, 100 - hintService.calculateTotalCost(userId, storyId))
  }
}
