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
  if (Story) {
    try {
      const story = new Story({
        ...storyData,
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
