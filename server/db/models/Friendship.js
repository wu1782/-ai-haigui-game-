// Friendship Model - Mongoose Schema for User Relationships

import mongoose from 'mongoose'

const friendshipSchema = new mongoose.Schema({
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '源用户ID不能为空']
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '目标用户ID不能为空']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'accepted', 'rejected'],
      message: '状态必须是 pending, accepted, 或 rejected'
    },
    default: 'pending'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Compound indexes for common queries
friendshipSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true })
friendshipSchema.index({ fromUserId: 1, status: 1 })
friendshipSchema.index({ toUserId: 1, status: 1 })
friendshipSchema.index({ status: 1, createdAt: -1 })

// Prevent self-friendship
friendshipSchema.pre('save', function(next) {
  if (this.fromUserId.toString() === this.toUserId.toString()) {
    next(new Error('不能添加自己为好友'))
    return
  }
  next()
})

// Static method to check if friendship exists
friendshipSchema.statics.findFriendship = async function(userId1, userId2) {
  return this.findOne({
    $or: [
      { fromUserId: userId1, toUserId: userId2 },
      { fromUserId: userId2, toUserId: userId1 }
    ]
  })
}

// Static method to get accepted friendships for a user
friendshipSchema.statics.getAcceptedFriends = async function(userId, options = {}) {
  const { page = 1, limit = 50 } = options
  const skip = (page - 1) * limit

  // Find friendships where user is either fromUser or toUser and status is accepted
  const friendships = await this.find({
    $or: [
      { fromUserId: userId, status: 'accepted' },
      { toUserId: userId, status: 'accepted' }
    ]
  })
  .populate('fromUserId', 'username avatar lastActive')
  .populate('toUserId', 'username avatar lastActive')
  .sort({ updatedAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean()

  // Transform to get the friend (the other user)
  return friendships.map(f => {
    const friend = f.fromUserId._id.toString() === userId.toString() ? f.toUserId : f.fromUserId
    return {
      id: f._id.toString(),
      friend: {
        id: friend._id.toString(),
        username: friend.username,
        avatar: friend.avatar,
        lastActive: friend.lastActive
      },
      status: f.status,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt
    }
  })
}

// Static method to get pending friend requests (received)
friendshipSchema.statics.getPendingRequests = async function(userId, direction = 'received', options = {}) {
  const { page = 1, limit = 50 } = options
  const skip = (page - 1) * limit

  let query
  if (direction === 'received') {
    query = { toUserId: userId, status: 'pending' }
  } else {
    query = { fromUserId: userId, status: 'pending' }
  }

  const populateField = direction === 'received' ? 'fromUserId' : 'toUserId'

  const requests = await this.find(query)
    .populate(populateField, 'username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  return requests.map(r => ({
    id: r._id.toString(),
    fromUser: direction === 'received' ? {
      id: r.fromUserId._id.toString(),
      username: r.fromUserId.username,
      avatar: r.fromUserId.avatar
    } : {
      id: r.toUserId._id.toString(),
      username: r.toUserId.username,
      avatar: r.toUserId.avatar
    },
    toUser: direction === 'received' ? {
      id: r.toUserId._id.toString(),
      username: r.toUserId.username,
      avatar: r.toUserId.avatar
    } : {
      id: r.fromUserId._id.toString(),
      username: r.fromUserId.username,
      avatar: r.fromUserId.avatar
    },
    status: r.status,
    createdAt: r.createdAt
  }))
}

// Static method to create friend request
friendshipSchema.statics.createRequest = async function(fromUserId, toUserId) {
  // Check for existing relationship
  const existing = await this.findFriendship(fromUserId, toUserId)
  if (existing) {
    throw new Error('好友关系已存在')
  }

  // Check for existing pending request
  const existingRequest = await this.findOne({
    $or: [
      { fromUserId: fromUserId, toUserId: toUserId },
      { fromUserId: toUserId, toUserId: fromUserId }
    ],
    status: 'pending'
  })
  if (existingRequest) {
    throw new Error('待处理的好友请求已存在')
  }

  return this.create({
    fromUserId,
    toUserId,
    status: 'pending'
  })
}

// Static method to accept friend request
friendshipSchema.statics.acceptRequest = async function(requestId, userId) {
  const request = await this.findOne({
    _id: requestId,
    toUserId: userId,
    status: 'pending'
  })

  if (!request) {
    throw new Error('好友请求不存在或无权处理')
  }

  // Update the request status
  request.status = 'accepted'
  await request.save()

  // Create reverse friendship if it doesn't exist
  const reverseExists = await this.findOne({
    fromUserId: userId,
    toUserId: request.fromUserId
  })

  if (!reverseExists) {
    await this.create({
      fromUserId: userId,
      toUserId: request.fromUserId,
      status: 'accepted'
    })
  }

  return request
}

// Static method to reject friend request
friendshipSchema.statics.rejectRequest = async function(requestId, userId) {
  const request = await this.findOne({
    _id: requestId,
    toUserId: userId,
    status: 'pending'
  })

  if (!request) {
    throw new Error('好友请求不存在或无权处理')
  }

  request.status = 'rejected'
  await request.save()
  return request
}

// Transform output
friendshipSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    return ret
  }
})

const Friendship = mongoose.model('Friendship', friendshipSchema)

export default Friendship
