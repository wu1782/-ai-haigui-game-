// MongoDB 连接配置
// 用于500+用户扩展，需要运行 MongoDB 服务器

import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/turtle-soup'

let isConnected = false

export async function connectDB() {
  if (isConnected) {
    return mongoose.connection
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10, // 连接池大小，支持更多并发
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    isConnected = true
    console.log('[MongoDB] Connected successfully')

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err)
    })

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected')
      isConnected = false
    })

    return mongoose.connection
  } catch (error) {
    console.error('[MongoDB] Failed to connect:', error)
    throw error
  }
}

export async function disconnectDB() {
  if (!isConnected) {
    return
  }

  try {
    await mongoose.disconnect()
    isConnected = false
    console.log('[MongoDB] Disconnected')
  } catch (error) {
    console.error('[MongoDB] Error disconnecting:', error)
    throw error
  }
}

// 用户Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3, maxlength: 20 },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  avatar: { type: String, default: null },
  stats: {
    totalGames: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    totalLosses: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    perfectGames: { type: Number, default: 0 },
    achievements: [{ type: String }],
    rank: { type: Number, default: 1 }
  }
}, { timestamps: true })

// 故事Schema
const storySchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 100 },
  surface: { type: String, required: true }, // 对玩家可见
  bottom: { type: String, required: true }, // 仅服务器可见
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  starLevel: { type: Number, min: 1, max: 5, default: 3 },
  keywords: [{ type: String }],
  tags: [{ type: String }],
  hint: { type: String },
  hotScore: { type: Number, default: 0 },
  playCount: { type: Number, default: 0 },
  isAiGenerated: { type: Boolean, default: false },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true })

// 游戏记录Schema
const gameRecordSchema = new mongoose.Schema({
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  roomId: { type: String },
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  questionCount: { type: Number, required: true },
  endType: { type: String, enum: ['guess', 'giveup', 'timeout'], required: true },
  playerCount: { type: Number },
  durationSeconds: { type: Number }
}, { timestamps: true })

// 排行榜Schema
const leaderboardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entryType: { type: String, enum: ['fastest', 'fewestQuestions', 'streak', 'totalWins'], required: true },
  value: { type: Number, required: true },
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' }
}, { timestamps: true })

// 创建索引
userSchema.index({ username: 1, email: 1 })
storySchema.index({ hotScore: -1, createdAt: -1 })
storySchema.index({ difficulty: 1 })
gameRecordSchema.index({ winnerId: 1, createdAt: -1 })
leaderboardSchema.index({ entryType: 1, value: -1 })

export const User = mongoose.model('User', userSchema)
export const Story = mongoose.model('Story', storySchema)
export const GameRecord = mongoose.model('GameRecord', gameRecordSchema)
export const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema)
