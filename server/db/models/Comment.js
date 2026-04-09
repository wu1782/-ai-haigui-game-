// Comment Model - 故事评论

import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema({
  odId: {
    type: String,
    required: [true, '用户odId不能为空'],
    index: true
  },
  username: {
    type: String,
    required: [true, '用户名不能为空']
  },
  avatar: {
    type: String,
    default: null
  },
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: [true, '故事ID不能为空'],
    index: true
  },
  content: {
    type: String,
    required: [true, '评论内容不能为空'],
    minlength: [5, '评论至少5个字符'],
    maxlength: [500, '评论最多500个字符']
  },
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  likedBy: [{
    type: String // odId 列表
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // createdAt, updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// 复合索引
commentSchema.index({ storyId: 1, createdAt: -1 })
commentSchema.index({ odId: 1, createdAt: -1 })

// 点赞（只能一次）
commentSchema.methods.like = async function(odId) {
  if (this.likedBy.includes(odId)) {
    return { success: false, message: '已经点过赞了' }
  }
  this.likedBy.push(odId)
  this.likes = this.likedBy.length
  await this.save()
  return { success: true, likes: this.likes }
}

// 取消点赞
commentSchema.methods.unlike = async function(odId) {
  const idx = this.likedBy.indexOf(odId)
  if (idx === -1) {
    return { success: false, message: '还没点过赞' }
  }
  this.likedBy.splice(idx, 1)
  this.likes = this.likedBy.length
  await this.save()
  return { success: true, likes: this.likes }
}

// 编辑评论（30分钟内）
commentSchema.methods.editContent = async function(newContent, odId) {
  if (this.odId !== odId) {
    return { success: false, message: '无权编辑此评论' }
  }
  const now = Date.now()
  const diff = now - this.createdAt.getTime()
  const thirtyMinutes = 30 * 60 * 1000
  if (diff > thirtyMinutes && !this.isEdited) {
    return { success: false, message: '评论已超过30分钟编辑时限' }
  }
  this.content = newContent.slice(0, 500)
  this.isEdited = true
  this.editedAt = new Date()
  await this.save()
  return { success: true, comment: this }
}

// Transform
commentSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.likedBy
    return ret
  }
})

const Comment = mongoose.model('Comment', commentSchema)

export default Comment
