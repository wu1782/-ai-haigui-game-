/**
 * Story DAO - 故事数据访问层
 * 提供 MongoDB story 集合的数据访问接口
 */

const Story = require('../db/models/Story')

/**
 * 创建故事
 */
async function createStory(storyData) {
  const story = new Story(storyData)
  return await story.save()
}

/**
 * 根据 ID 获取故事
 */
async function findStoryById(id) {
  return await Story.findById(id)
}

/**
 * 根据 ID 获取故事（不存在则返回 null）
 */
async function findStoryByIdOrNull(id) {
  const story = await Story.findById(id)
  return story
}

/**
 * 获取故事列表
 * @param {Object} filters - 过滤条件
 * @param {Object} options - 分页和排序选项
 */
async function findStories(filters = {}, options = {}) {
  const {
    status = 'approved',
    difficulty,
    tags,
    isAiGenerated,
    search,
    creatorId
  } = filters

  const {
    page = 1,
    limit = 20,
    sortBy = 'hotScore',
    sortOrder = 'desc'
  } = options

  const query = {}

  // 状态过滤
  if (status) {
    query.status = status
  }

  // 难度过滤
  if (difficulty) {
    query.difficulty = difficulty
  }

  // 标签过滤
  if (tags && tags.length > 0) {
    query.tags = { $in: tags }
  }

  // AI 生成过滤
  if (isAiGenerated !== undefined) {
    query.isAiGenerated = isAiGenerated
  }

  // 创建者过滤
  if (creatorId) {
    query.creatorId = creatorId
  }

  // 搜索
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { surface: { $regex: search, $options: 'i' } },
      { keywords: { $regex: search, $options: 'i' } }
    ]
  }

  const skip = (page - 1) * limit
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 }

  const [stories, total] = await Promise.all([
    Story.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Story.countDocuments(query)
  ])

  return {
    stories,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * 更新故事
 */
async function updateStory(id, updates) {
  return await Story.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  )
}

/**
 * 删除故事
 */
async function deleteStory(id) {
  return await Story.findByIdAndDelete(id)
}

/**
 * 增加游戏次数
 */
async function incrementPlayCount(id) {
  return await Story.findByIdAndUpdate(
    id,
    { $inc: { playCount: 1 } },
    { new: true }
  )
}

/**
 * 更新热度分数
 */
async function updateHotScore(id, score) {
  return await Story.findByIdAndUpdate(
    id,
    {
      $inc: { hotScore: score },
      $set: { lastPlayedAt: new Date() }
    },
    { new: true }
  )
}

/**
 * 批量获取故事
 */
async function findStoriesByIds(ids) {
  return await Story.find({ _id: { $in: ids } })
}

/**
 * 获取热门故事
 */
async function getHotStories(limit = 10) {
  return await Story.find({ status: 'approved' })
    .sort({ hotScore: -1, playCount: -1 })
    .limit(limit)
    .lean()
}

/**
 * 获取最新故事
 */
async function getLatestStories(limit = 10) {
  return await Story.find({ status: 'approved' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
}

/**
 * 获取待审核故事
 */
async function getPendingStories(page = 1, limit = 20) {
  const skip = (page - 1) * limit
  const [stories, total] = await Promise.all([
    Story.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Story.countDocuments({ status: 'pending' })
  ])

  return {
    stories,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * 审核故事
 */
async function reviewStory(id, reviewInfo) {
  const { reviewedBy, status, rejectionReason } = reviewInfo
  return await Story.findByIdAndUpdate(
    id,
    {
      $set: {
        status,
        reviewerInfo: {
          reviewedBy,
          reviewedAt: new Date(),
          rejectionReason: status === 'rejected' ? rejectionReason : null
        }
      }
    },
    { new: true, runValidators: true }
  )
}

/**
 * 统计各状态故事数量
 */
async function countByStatus() {
  const counts = await Story.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ])

  return counts.reduce((acc, { _id, count }) => {
    acc[_id] = count
    return acc
  }, { pending: 0, approved: 0, rejected: 0 })
}

/**
 * 关键字搜索故事
 */
async function searchByKeywords(keywords, limit = 20) {
  return await Story.find({
    status: 'approved',
    keywords: { $in: keywords.map(k => new RegExp(k, 'i')) }
  })
    .sort({ hotScore: -1 })
    .limit(limit)
    .lean()
}

module.exports = {
  createStory,
  findStoryById,
  findStoryByIdOrNull,
  findStories,
  updateStory,
  deleteStory,
  incrementPlayCount,
  updateHotScore,
  findStoriesByIds,
  getHotStories,
  getLatestStories,
  getPendingStories,
  reviewStory,
  countByStatus,
  searchByKeywords
}
