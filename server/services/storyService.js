// 故事服务 - 支持MongoDB和静态数据双模式
// 用于500+用户扩展，MongoDB提供持久化和查询能力

// 静态故事数据（备用）
const staticStories = [
  {
    id: '1',
    title: '最后的笑容',
    difficulty: 'easy',
    starLevel: 1,
    surface: '一位老人在火车上去世了。他的身旁放着一本未完成的书。车厢里的乘客都在哭泣，但有一个人笑了。请问为什么？',
    bottom: '这位老人是一位著名儿童文学作家，正在写一本关于"如何让人发笑"的书。他一生用笑声治愈了无数孩子。临终前他读到了自己书中最搞笑的段落。而那个发笑的乘客是他的孙子，他理解爷爷的心愿——即使面对死亡，也要笑着告别。',
    keywords: ['作家', '书', '笑', '孙子', '儿童文学'],
    tags: ['治愈', '温情'],
    hint: '注意书的特殊性',
    hotScore: 856,
    playCount: 1243,
    createdAt: '2026-03-01'
  },
  {
    id: '2',
    title: '午夜电梯',
    difficulty: 'easy',
    starLevel: 2,
    surface: '一位程序员深夜加班，独自乘坐电梯下楼。电梯从10楼降到5楼时突然停止运行。门打开后，他看到外面站着一位穿着护士服的女人。程序员不但没有害怕，反而笑了。请问发生了什么？',
    bottom: '这个程序员是个近视眼，而且是个医恐患者。他最怕去医院，所以把医院的一切都幻想成了恐怖场景。实际上5楼是一家整形医院，门外站的是等待电梯的护士。程序员想起自己之前在朋友圈看到同事去割双眼皮的搞笑照片，于是忍不住笑了。',
    keywords: ['程序员', '护士', '近视', '整形医院', '笑'],
    tags: ['都市传说', '脑洞'],
    hint: '注意人物的职业特征',
    hotScore: 923,
    playCount: 1567,
    createdAt: '2026-03-05'
  }
  // 更多静态故事...
]

let Story = null

// 初始化 - 尝试加载MongoDB模型
export async function initStoryService() {
  try {
    // 动态导入MongoDB模型
    const { Story: MongoStory } = await import('../db/mongodb.js')
    Story = MongoStory
    console.log('[StoryService] Using MongoDB')
    return true
  } catch (error) {
    console.warn('[StoryService] MongoDB not available, using static data')
    Story = null
    return false
  }
}

// 根据ID获取故事
export async function getStoryById(storyId) {
  // 优先从MongoDB获取
  if (Story) {
    try {
      const story = await Story.findById(storyId).lean()
      if (story) {
        return {
          id: story._id.toString(),
          title: story.title,
          surface: story.surface,
          bottom: story.bottom,
          difficulty: story.difficulty,
          starLevel: story.starLevel,
          keywords: story.keywords,
          tags: story.tags,
          hint: story.hint,
          hotScore: story.hotScore,
          playCount: story.playCount
        }
      }
    } catch (error) {
      console.error('[StoryService] MongoDB query error:', error)
    }
  }

  // 回退到静态数据
  return staticStories.find(s => s.id === storyId) || null
}

// 获取所有故事（简化列表，不包含bottom）
export async function getStories(options = {}) {
  const { difficulty, sortBy = 'hotScore', limit = 50, offset = 0 } = options

  if (Story) {
    try {
      const query = difficulty ? { difficulty } : {}
      const stories = await Story.find(query)
        .select('-bottom') // 不返回bottom
        .sort({ [sortBy]: -1 })
        .skip(offset)
        .limit(limit)
        .lean()

      return stories.map(s => ({
        id: s._id.toString(),
        title: s.title,
        surface: s.surface,
        difficulty: s.difficulty,
        starLevel: s.starLevel,
        tags: s.tags,
        hotScore: s.hotScore,
        playCount: s.playCount,
        createdAt: s.createdAt
      }))
    } catch (error) {
      console.error('[StoryService] MongoDB query error:', error)
    }
  }

  // 回退到静态数据
  let result = [...staticStories]
  if (difficulty) {
    result = result.filter(s => s.difficulty === difficulty)
  }
  result.sort((a, b) => b[sortBy] - a[sortBy])
  return result.slice(offset, offset + limit).map(s => {
    const { bottom, ...rest } = s
    return rest
  })
}

// 获取热门故事
export async function getHotStories(limit = 10) {
  return getStories({ sortBy: 'hotScore', limit })
}

// 获取最新故事
export async function getLatestStories(limit = 10) {
  return getStories({ sortBy: 'createdAt', limit })
}

// 更新故事热度
export async function updateStoryScore(storyId, increment = 1) {
  if (Story) {
    try {
      await Story.findByIdAndUpdate(storyId, {
        $inc: { playCount: increment, hotScore: increment }
      })
      return true
    } catch (error) {
      console.error('[StoryService] Failed to update story score:', error)
    }
  }
  return false
}

// AI生成故事并保存
export async function saveAiGeneratedStory(storyData, creatorId = null) {
  // 自动分类难度
  const classifiedStory = classifyStoryDifficulty(storyData)

  if (Story) {
    try {
      const story = new Story({
        ...classifiedStory,
        isAiGenerated: true,
        creatorId,
        hotScore: 0,
        playCount: 0
      })
      await story.save()
      return story._id.toString()
    } catch (error) {
      console.error('[StoryService] Failed to save AI story:', error)
    }
  }
  // 非MongoDB模式，返回临时ID
  return `temp_${Date.now()}`
}

/**
 * 自动分类故事难度
 * 基于故事复杂度、答案特异性、逻辑依赖进行评估
 */
export function classifyStoryDifficulty(storyData) {
  const { surface, bottom, starLevel } = storyData

  // 如果已有星级难度，可以直接转换
  if (starLevel) {
    return {
      ...storyData,
      difficulty: starLevelToDifficulty(starLevel)
    }
  }

  // 分析汤底复杂度
  const complexity = analyzeStoryComplexity(surface, bottom)

  // 分析答案特异性
  const specificity = analyzeAnswerSpecificity(bottom)

  // 分析逻辑依赖
  const dependencies = analyzeLogicalDependencies(surface, bottom)

  // 综合评分 (1-5)
  let difficultyScore = 1

  // 基础分
  difficultyScore += complexity * 0.5
  difficultyScore += specificity * 0.3
  difficultyScore += dependencies * 0.2

  // 四舍五入到最近的整数，范围1-5
  difficultyScore = Math.round(Math.min(5, Math.max(1, difficultyScore)))

  return {
    ...storyData,
    difficulty: starLevelToDifficulty(difficultyScore),
    complexityScore: complexity,
    autoClassified: true
  }
}

/**
 * 星级难度转换为标准难度等级
 */
function starLevelToDifficulty(starLevel) {
  if (starLevel <= 1) return 'easy'
  if (starLevel === 2) return 'medium'
  if (starLevel === 3) return 'hard'
  return 'extreme'
}

/**
 * 分析故事复杂度
 * 返回 0-4 的分数
 */
function analyzeStoryComplexity(surface, bottom) {
  let score = 0

  // 文本长度因素
  const surfaceLength = (surface || '').length
  const bottomLength = (bottom || '').length

  if (surfaceLength > 100) score += 0.5
  if (bottomLength > 150) score += 0.5

  // 人物数量（通过关键词检测）
  const personKeywords = ['他', '她', '他们', '妻子', '丈夫', '父亲', '母亲', '哥哥', '姐姐', '儿子', '女儿', '老板', '员工', '医生', '护士', '警察', '小偷']
  const personCount = personKeywords.filter(kw => (bottom || '').includes(kw)).length
  if (personCount >= 3) score += 1
  else if (personCount >= 2) score += 0.5

  // 关键事件数量
  const eventKeywords = ['死亡', '谋杀', '自杀', '发现', '发生', '杀死', '伤害', '偷窃', '欺骗', '隐藏']
  const eventCount = eventKeywords.filter(kw => (bottom || '').includes(kw)).length
  if (eventCount >= 2) score += 1
  else if (eventCount >= 1) score += 0.5

  // 因果关系复杂度
  if ((bottom || '').includes('为了') && (bottom || '').includes('所以')) score += 0.5
  if ((bottom || '').includes('然而') || (bottom || '').includes('但是')) score += 0.5

  return Math.min(4, score)
}

/**
 * 分析答案特异性
 * 返回 0-4 的分数
 * 特异性越高（越具体），难度越低，因为玩家更容易确认
 */
function analyzeAnswerSpecificity(bottom) {
  let score = 0
  const bottomText = bottom || ''

  // 非常具体的答案反而容易（玩家可以直接确认）
  // 非常模糊的答案反而难（玩家无法确认）
  const vagueWords = ['某种', '某些', '可能', '也许', '不确定', '不知道']
  const specificWords = ['就是', '因为', '所以', '于是', '结果是']

  const vagueCount = vagueWords.filter(w => bottomText.includes(w)).length
  const specificCount = specificWords.filter(w => bottomText.includes(w)).length

  score += specificCount * 0.5  // 具体词多=容易
  score += vagueCount * 0.3     // 模糊词多=难

  // 字数过少（信息不足）
  if (bottomText.length < 30) score += 1

  // 字数过多（信息复杂）
  if (bottomText.length > 200) score += 0.5

  return Math.min(4, score)
}

/**
 * 分析逻辑依赖
 * 返回 0-4 的分数
 * 逻辑链越长、依赖越多，难度越高
 */
function analyzeLogicalDependencies(surface, bottom) {
  let score = 0
  const bottomText = bottom || ''

  // 检测条件句（需要满足条件才能推理）
  const conditionalMarkers = ['如果', '只要', '除非', '必须', '才能']
  const conditionalCount = conditionalMarkers.filter(m => bottomText.includes(m)).length
  score += conditionalCount * 0.5

  // 检测转折点数量（推理链中的跳跃）
  const turnMarkers = ['但是', '然而', '没想到', '出人意料', '结果却']
  const turnCount = turnMarkers.filter(m => bottomText.includes(m)).length
  score += turnCount * 0.8

  // 检测反讽/意外元素
  const ironyMarkers = ['讽刺', '可笑', '荒谬', '可笑的是', '意外']
  const ironyCount = ironyMarkers.filter(m => bottomText.includes(m)).length
  score += ironyCount * 0.6

  // 时间悖论或复杂时间线
  if (bottomText.includes('之前') && bottomText.includes('之后')) score += 0.5
  if (bottomText.includes('同一时间') || bottomText.includes('与此同时')) score += 0.3

  return Math.min(4, score)
}
