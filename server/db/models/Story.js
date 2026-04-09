// Story Model - Mongoose Schema for Turtle Soup Stories

import mongoose from 'mongoose'

const storySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '标题不能为空'],
    maxlength: [100, '标题最多100个字符'],
    trim: true
  },
  surface: {
    type: String,
    required: [true, '汤面不能为空'],
    minlength: [10, '汤面至少10个字符'],
    maxlength: [500, '汤面最多500个字符'],
    trim: true
  },
  bottom: {
    type: String,
    required: [true, '汤底不能为空'],
    minlength: [10, '汤底至少10个字符'],
    maxlength: [1000, '汤底最多1000个字符'],
    trim: true
  },
  difficulty: {
    type: String,
    enum: {
      values: ['easy', 'medium', 'hard', 'extreme'],
      message: '难度必须是 easy, medium, hard, 或 extreme'
    },
    required: [true, '难度不能为空']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  starLevel: {
    type: Number,
    min: [1, '星级最小为1'],
    max: [5, '星级最大为5'],
    default: 3
  },
  keywords: [{
    type: String,
    maxlength: [50, '每个关键词最多50个字符'],
    trim: true
  }],
  tags: [{
    type: String,
    maxlength: [30, '每个标签最多30个字符'],
    trim: true
  }],
  hint: {
    type: String,
    maxlength: [200, '提示最多200个字符'],
    default: null
  },
  isAiGenerated: {
    type: Boolean,
    default: false
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  contributorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewInfo: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      maxlength: [200, '拒绝原因最多200个字符'],
      default: null
    }
  },
  rejectionCount: {
    type: Number,
    default: 0
  },
  lastRejectedAt: {
    type: Date,
    default: null
  },
  hotScore: {
    type: Number,
    default: 0,
    min: 0
  },
  playCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Pre-save validation
storySchema.pre('save', function(next) {
  // Validate keywords array
  if (this.keywords && this.keywords.length > 10) {
    next(new Error('关键词最多10个'))
    return
  }

  // Validate tags array
  if (this.tags && this.tags.length > 5) {
    next(new Error('标签最多5个'))
    return
  }

  // Auto-generate keywords from title if empty
  if (!this.keywords || this.keywords.length === 0) {
    this.keywords = this.title.split(/[,，、\s]+/).filter(w => w.length >= 2).slice(0, 5)
  }

  next()
})

// Text index for search (title and keywords)
storySchema.index({ title: 'text', keywords: 'text', surface: 'text' })

// Indexes for common queries
storySchema.index({ difficulty: 1 })
storySchema.index({ status: 1, createdAt: -1 })
storySchema.index({ hotScore: -1, createdAt: -1 })
storySchema.index({ playCount: -1 })
storySchema.index({ isAiGenerated: 1, createdAt: -1 })
storySchema.index({ creatorId: 1, createdAt: -1 })

// Static method for finding stories with pagination and filtering
storySchema.statics.findWithFilters = async function(filters = {}, options = {}) {
  const {
    status,
    difficulty,
    minDifficulty,
    maxDifficulty,
    tags,
    isAiGenerated,
    search,
    minHotScore,
    minPlayCount
  } = filters

  const {
    sortBy = 'hotScore',
    order = 'desc',
    page = 1,
    limit = 20
  } = options

  const query = {}

  if (status) {
    query.status = status
  }

  if (difficulty) {
    query.difficulty = difficulty
  }

  if (minDifficulty || maxDifficulty) {
    query.difficulty = {}
    if (minDifficulty) query.difficulty.$gte = minDifficulty
    if (maxDifficulty) query.difficulty.$lte = maxDifficulty
  }

  if (tags && tags.length > 0) {
    query.tags = { $in: tags }
  }

  if (typeof isAiGenerated === 'boolean') {
    query.isAiGenerated = isAiGenerated
  }

  if (minHotScore !== undefined) {
    query.hotScore = { $gte: minHotScore }
  }

  if (minPlayCount !== undefined) {
    query.playCount = { $gte: minPlayCount }
  }

  if (search) {
    query.$text = { $search: search }
  }

  const skip = (page - 1) * limit
  const sortOrder = order === 'asc' ? 1 : -1
  const sortObj = sortBy === 'relevance' && search ? { score: { $meta: 'textScore' } } : { [sortBy]: sortOrder }

  const [stories, total] = await Promise.all([
    this.find(query)
      .select('-bottom')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ])

  return {
    stories,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}

// Instance method to increment play count and hot score
storySchema.methods.incrementStats = async function(playIncrement = 1, hotIncrement = 1) {
  this.playCount += playIncrement
  this.hotScore += hotIncrement
  return this.save()
}

// Transform output
storySchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})

const Story = mongoose.model('Story', storySchema)

export default Story
