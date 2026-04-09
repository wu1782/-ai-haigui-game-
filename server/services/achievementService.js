// 成就服务 - 后端验证成就解锁
// 所有成就解锁必须经后端验证，防止前端伪造

import mongoose from 'mongoose'
import User from '../db/models/User.js'
import Achievement from '../db/models/Achievement.js'

// 成就定义（与前端 AchievementBadge.tsx 保持同步）
export const ACHIEVEMENTS = {
  // 胜利成就
  FIRST_WIN: { id: 'first_win', name: '初露锋芒', desc: '赢得第一局', type: 'win' },
  TEN_WINS: { id: 'ten_wins', name: '小有成就', desc: '赢得10局', type: 'win', threshold: 10 },
  FIFTY_WINS: { id: 'fifty_wins', name: '推理大师', desc: '赢得50局', type: 'win', threshold: 50 },

  // 连胜成就
  THREE_WIN_STREAK: { id: 'three_win_streak', name: '三连胜', desc: '连续赢得3局', type: 'streak', threshold: 3 },
  FIVE_WIN_STREAK: { id: 'five_win_streak', name: '五福临门', desc: '连续赢得5局', type: 'streak', threshold: 5 },

  // 难度成就
  EASY_CLEAR: { id: 'easy_clear', name: '入门', desc: '通关简单难度', type: 'difficulty', difficulty: 'easy' },
  MEDIUM_CLEAR: { id: 'medium_clear', name: '中等', desc: '通关中等难度', type: 'difficulty', difficulty: 'medium' },
  HARD_CLEAR: { id: 'hard_clear', name: '困难', desc: '通关困难难度', type: 'difficulty', difficulty: 'hard' },
  EXTREME_CLEAR: { id: 'extreme_clear', name: '极难', desc: '通关极难难度', type: 'difficulty', difficulty: 'extreme' },

  // 游戏次数成就
  PLAY_10: { id: 'play_10', name: '热身开始', desc: '完成10局游戏', type: 'games', threshold: 10 },
  PLAY_50: { id: 'play_50', name: '熟能生巧', desc: '完成50局游戏', type: 'games', threshold: 50 },
  PLAY_100: { id: 'play_100', name: '百局达人', desc: '完成100局游戏', type: 'games', threshold: 100 },

  // 完美破案成就（问最少的问题猜出答案）
  PERFECT_CASE_3: { id: 'perfect_case_3', name: '完美破案(3问)', desc: '3题内破案', type: 'perfect', threshold: 3 },
  PERFECT_CASE_5: { id: 'perfect_case_5', name: '完美破案(5问)', desc: '5题内破案', type: 'perfect', threshold: 5 }
}

// 检查用户是否已解锁某成就
async function hasAchievement(userId, achievementId) {
  const existing = await Achievement.findOne({ odId: userId, achievementId })
  return !!existing
}

// 解锁成就
async function unlockAchievement(userId, achievementId, storyId) {
  if (await hasAchievement(userId, achievementId)) {
    return null // 已解锁
  }

  const achievement = await Achievement.create({
    odId: userId,
    achievementId,
    storyId,
    unlockedAt: new Date()
  })

  console.log(`[Achievement] User ${userId} unlocked ${achievementId}`)
  return achievement
}

/**
 * 游戏结束后，后端计算并解锁成就
 * @param {string} odId - 用户 odId
 * @param {object} gameResult - 游戏结果
 *   @param {boolean} gameResult.won - 是否获胜
 *   @param {string} gameResult.difficulty - 难度 easy/medium/hard/extreme
 *   @param {number} gameResult.questionCount - 总提问次数
 *   @param {string} gameResult.storyId - 故事 odId
 *   @param {string} gameResult.storyMongoId - 故事 MongoDB _id
 * @returns {string[]} 新解锁的成就ID列表
 */
export async function processGameAchievements(odId, gameResult) {
  const { won, difficulty, questionCount, storyId, storyMongoId } = gameResult
  const newUnlocks = []

  // 1. 胜利成就
  if (won) {
    const winAchievements = [
      { def: ACHIEVEMENTS.FIRST_WIN, check: async () => true },
      { def: ACHIEVEMENTS.TEN_WINS, check: async () => {
        const user = await User.findOne({ odId })
        return user?.stats?.totalWins >= 10
      }},
      { def: ACHIEVEMENTS.FIFTY_WINS, check: async () => {
        const user = await User.findOne({ odId })
        return user?.stats?.totalWins >= 50
      }}
    ]

    for (const { def, check } of winAchievements) {
      if (await check()) {
        const unlocked = await unlockAchievement(odId, def.id, storyMongoId)
        if (unlocked) newUnlocks.push(def.id)
      }
    }

    // 2. 连胜成就
    const user = await User.findOne({ odId })
    const currentStreak = user?.stats?.currentStreak || 0
    const streakAchievements = [
      { def: ACHIEVEMENTS.THREE_WIN_STREAK, threshold: 3 },
      { def: ACHIEVEMENTS.FIVE_WIN_STREAK, threshold: 5 }
    ]
    for (const { def, threshold } of streakAchievements) {
      if (currentStreak >= threshold) {
        const unlocked = await unlockAchievement(odId, def.id, storyMongoId)
        if (unlocked) newUnlocks.push(def.id)
      }
    }

    // 3. 难度成就
    const diffAchievements = [
      { def: ACHIEVEMENTS.EASY_CLEAR, diff: 'easy' },
      { def: ACHIEVEMENTS.MEDIUM_CLEAR, diff: 'medium' },
      { def: ACHIEVEMENTS.HARD_CLEAR, diff: 'hard' },
      { def: ACHIEVEMENTS.EXTREME_CLEAR, diff: 'extreme' }
    ]
    for (const { def, diff } of diffAchievements) {
      if (difficulty === diff) {
        const unlocked = await unlockAchievement(odId, def.id, storyMongoId)
        if (unlocked) newUnlocks.push(def.id)
      }
    }

    // 4. 完美破案成就（仅胜利时检查）
    if (won) {
      const perfectAchievements = [
        { def: ACHIEVEMENTS.PERFECT_CASE_3, threshold: 3 },
        { def: ACHIEVEMENTS.PERFECT_CASE_5, threshold: 5 }
      ]
      for (const { def, threshold } of perfectAchievements) {
        if (questionCount <= threshold) {
          const unlocked = await unlockAchievement(odId, def.id, storyMongoId)
          if (unlocked) newUnlocks.push(def.id)
        }
      }
    }
  }

  // 5. 游戏次数成就（无论输赢）
  const gamesAchievements = [
    { def: ACHIEVEMENTS.PLAY_10, threshold: 10 },
    { def: ACHIEVEMENTS.PLAY_50, threshold: 50 },
    { def: ACHIEVEMENTS.PLAY_100, threshold: 100 }
  ]
  const userForGames = await User.findOne({ odId })
  for (const { def, threshold } of gamesAchievements) {
    if (userForGames?.stats?.totalGames >= threshold) {
      const unlocked = await unlockAchievement(odId, def.id, storyMongoId)
      if (unlocked) newUnlocks.push(def.id)
    }
  }

  return newUnlocks
}

/**
 * 获取用户已解锁的成就列表
 */
export async function getUserAchievements(odId) {
  const records = await Achievement.find({ odId }).sort({ unlockedAt: -1 }).lean()
  return records.map(r => ({
    id: r.achievementId,
    unlockedAt: r.unlockedAt
  }))
}

/**
 * 获取用户已解锁的成就ID集合（快速查询）
 */
export async function getUserAchievementIds(odId) {
  const records = await Achievement.find({ odId }).lean()
  return new Set(records.map(r => r.achievementId))
}
