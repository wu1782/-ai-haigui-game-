// Message Model - 好友私信记录

import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  fromOdId: {
    type: String,
    required: [true, '发送者odId不能为空'],
    index: true
  },
  toOdId: {
    type: String,
    required: [true, '接收者odId不能为空'],
    index: true
  },
  content: {
    type: String,
    required: [true, '消息内容不能为空'],
    maxlength: [2000, '消息最多2000字符']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  recalledAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // createdAt, updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// 复合索引：查询两用户间的消息
messageSchema.index({ fromOdId: 1, toOdId: 1, createdAt: -1 })

// 静态方法：获取聊天历史
messageSchema.statics.getChatHistory = async function(fromOdId, toOdId, { before, limit = 50 } = {}) {
  const query = {
    recalledAt: null,
    $or: [
      { fromOdId, toOdId },
      { fromOdId: toOdId, toOdId: fromOdId }
    ]
  }

  if (before) {
    query.createdAt = { $lt: new Date(before) }
  }

  const messages = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  return messages.reverse()
}

// 实例方法：撤回消息
messageSchema.methods.recall = function() {
  this.recalledAt = new Date()
  return this.save()
}

// 静态方法：标记消息已读
messageSchema.statics.markAsRead = async function(fromOdId, toOdId) {
  return this.updateMany(
    {
      fromOdId,
      toOdId,
      isRead: false,
      recalledAt: null
    },
    { isRead: true }
  )
}

// 静态方法：获取未读计数
messageSchema.statics.getUnreadCount = async function(odId) {
  return this.countDocuments({
    toOdId: odId,
    isRead: false,
    recalledAt: null
  })
}

const Message = mongoose.model('Message', messageSchema)

export default Message
