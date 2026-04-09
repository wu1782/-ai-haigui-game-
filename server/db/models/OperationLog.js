// OperationLog Model - 操作日志记录

import mongoose from 'mongoose'

const OperationLogSchema = new mongoose.Schema({
  odId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    default: null
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: {
    type: String,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success'
  },
  errorMessage: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  collection: 'operation_logs',
  timestamps: true
})

// 复合索引：按操作类型和时间查询
OperationLogSchema.index({ action: 1, createdAt: -1 })

// 复合索引：按用户和时间查询
OperationLogSchema.index({ odId: 1, createdAt: -1 })

// Transform
OperationLogSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})

const OperationLog = mongoose.model('OperationLog', OperationLogSchema)

export default OperationLog
