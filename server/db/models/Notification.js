// Notification Model - 站内通知

import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  odId: {
    type: String,
    required: [true, '用户odId不能为空'],
    index: true
  },
  type: {
    type: String,
    enum: ['system', 'review_approved', 'review_rejected', 'friend_request', 'friend_accepted', 'achievement', 'challenge'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: [100, '标题最多100字符']
  },
  content: {
    type: String,
    maxlength: [500, '内容最多500字符']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // 存放关联数据（storyId, friendId等）
    default: {}
  },
  expiresAt: {
    type: Date,
    default: null // null 表示永不过期
  }
}, {
  timestamps: true, // createdAt, updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// 索引
notificationSchema.index({ odId: 1, createdAt: -1 })
notificationSchema.index({ odId: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL 索引自动删除过期通知

// 未读计数（静态方法）
notificationSchema.statics.getUnreadCount = async function(odId) {
  return this.countDocuments({ odId, isRead: false })
}

// 标记全部已读
notificationSchema.statics.markAllRead = async function(odId) {
  return this.updateMany({ odId, isRead: false }, { isRead: true })
}

// 创建通知（带订阅推送）
notificationSchema.statics.createNotification = async function(data) {
  const notification = await this.create(data)
  return notification
}

// Transform
notificationSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})

const Notification = mongoose.model('Notification', notificationSchema)

export default Notification
