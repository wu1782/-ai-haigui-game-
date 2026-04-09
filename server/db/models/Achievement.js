// Achievement Model - 成就解锁记录（后端验证，防前端伪造）

import mongoose from 'mongoose'

const achievementSchema = new mongoose.Schema({
  odId: {
    type: String,
    required: [true, '用户odId不能为空'],
    index: true
  },
  achievementId: {
    type: String,
    required: [true, '成就ID不能为空'],
    index: true
  },
  storyId: {
    type: String,
    default: null
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// 同一用户同一成就不能重复解锁
achievementSchema.index({ odId: 1, achievementId: 1 }, { unique: true })

// 按用户查询解锁历史
achievementSchema.index({ odId: 1, unlockedAt: -1 })

// Transform
achievementSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})

const Achievement = mongoose.model('Achievement', achievementSchema)

export default Achievement
