// User Model - Mongoose Schema with Enhanced Fields

import mongoose from 'mongoose'

// Settings subdocument schema
const settingsSchema = new mongoose.Schema({
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'auto'
  },
  sound: {
    type: Boolean,
    default: true
  },
  musicVolume: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  sfxVolume: {
    type: Number,
    min: 0,
    max: 100,
    default: 80
  },
  notifications: {
    type: Boolean,
    default: true
  },
  language: {
    type: String,
    enum: ['zh-CN', 'en-US', 'ja-JP'],
    default: 'zh-CN'
  }
}, { _id: false })

// Stats subdocument schema
const statsSchema = new mongoose.Schema({
  totalGames: { type: Number, default: 0, min: 0 },
  totalWins: { type: Number, default: 0, min: 0 },
  totalLosses: { type: Number, default: 0, min: 0 },
  currentStreak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  winRate: { type: Number, default: 0, min: 0, max: 100 },
  perfectGames: { type: Number, default: 0, min: 0 },
  achievements: [{ type: String }],
  rank: { type: Number, default: 1 },
  // Difficulty wins tracking
  difficultyWins: {
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 }
  }
}, { _id: false })

// Notification preferences subdocument
const notificationPrefsSchema = new mongoose.Schema({
  friendRequests: { type: Boolean, default: true },
  gameInvites: { type: Boolean, default: true },
  achievements: { type: Boolean, default: true },
  leaderboardUpdates: { type: Boolean, default: false },
  systemAnnouncements: { type: Boolean, default: true }
}, { _id: false })

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    minlength: [3, '用户名至少3个字符'],
    maxlength: [20, '用户名最多20个字符'],
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: [true, '邮箱不能为空'],
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: [true, '密码不能为空']
  },
  avatar: {
    type: String,
    default: null,
    maxlength: [500, '头像URL最多500个字符']
  },
  stats: {
    type: statsSchema,
    default: () => ({})
  },
  settings: {
    type: settingsSchema,
    default: () => ({})
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  notificationPrefs: {
    type: notificationPrefsSchema,
    default: () => ({})
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // 投稿封禁信息
  contributionBanInfo: {
    rejectionCount: { type: Number, default: 0 },
    bannedUntil: { type: Date, default: null },
    lastRejectionAt: { type: Date, default: null }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes
userSchema.index({ username: 1 })
userSchema.index({ email: 1 })
userSchema.index({ lastActive: -1 })
userSchema.index({ 'stats.totalWins': -1 })
userSchema.index({ friends: 1 })

// Pre-save hook for validation
userSchema.pre('save', function(next) {
  // Update lastActive on save
  this.lastActive = new Date()

  // Ensure stats.difficultyWins exists
  if (!this.stats.difficultyWins) {
    this.stats.difficultyWins = { easy: 0, medium: 0, hard: 0 }
  }

  // Calculate win rate
  if (this.stats.totalGames > 0) {
    this.stats.winRate = Math.round((this.stats.totalWins / this.stats.totalGames) * 10000) / 100
  }

  next()
})

// Update lastActive method
userSchema.methods.updateLastActive = async function() {
  this.lastActive = new Date()
  return this.save({ validateBeforeSave: false })
}

// Add friend
userSchema.methods.addFriend = async function(friendId) {
  if (!this.friends.includes(friendId)) {
    this.friends.push(friendId)
    await this.save()
  }
  return this
}

// Remove friend
userSchema.methods.removeFriend = async function(friendId) {
  this.friends = this.friends.filter(id => id.toString() !== friendId.toString())
  await this.save()
  return this
}

// Update stats with difficulty win tracking
userSchema.methods.recordGameResult = async function(won, difficulty = 'medium') {
  this.stats.totalGames++

  if (won) {
    this.stats.totalWins++
    this.stats.currentStreak++
    if (this.stats.currentStreak > this.stats.bestStreak) {
      this.stats.bestStreak = this.stats.currentStreak
    }
    if (this.stats.difficultyWins && this.stats.difficultyWins[difficulty] !== undefined) {
      this.stats.difficultyWins[difficulty]++
    }
  } else {
    this.stats.totalLosses++
    this.stats.currentStreak = 0
  }

  // Recalculate win rate
  if (this.stats.totalGames > 0) {
    this.stats.winRate = Math.round((this.stats.totalWins / this.stats.totalGames) * 10000) / 100
  }

  await this.save()
  return this.stats
}

// Transform output
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.passwordHash
    return ret
  }
})

const User = mongoose.model('User', userSchema)

export default User
