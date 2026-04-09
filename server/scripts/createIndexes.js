/**
 * MongoDB 索引创建脚本
 * 运行: node server/scripts/createIndexes.js
 */

const mongoose = require('mongoose')
const Story = require('../db/models/Story')
const User = require('../db/models/User')
const Friendship = require('../db/models/Friendship')
const { MongoDB } = require('../db/mongodb')

async function createIndexes() {
  console.log('🔧 开始创建 MongoDB 索引...\n')

  try {
    // 连接数据库
    await MongoDB.connect()
    console.log('✅ 已连接到 MongoDB\n')

    // Story 索引
    console.log('📚 创建 Story 索引...')
    await Story.createIndexes()
    console.log('   - text index: title, surface, keywords')
    console.log('   - status index')
    console.log('   - difficulty index')
    console.log('   - hotScore index')
    console.log('   - creatorId index')
    console.log('   - createdAt index\n')

    // User 索引
    console.log('👤 创建 User 索引...')
    await User.createIndexes()
    console.log('   - username index (unique)')
    console.log('   - email index (unique)')
    console.log('   - role index')
    console.log('   - createdAt index\n')

    // Friendship 索引
    console.log('💬 创建 Friendship 索引...')
    await Friendship.createIndexes()
    console.log('   - compound index: fromUserId + toUserId (unique)')
    console.log('   - status index')
    console.log('   - createdAt index\n')

    console.log('✅ 所有索引创建完成！')

    // 列出所有索引
    console.log('\n📋 Story 索引:')
    const storyIndexes = await Story.collection.indexes()
    storyIndexes.forEach(idx => console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`))

    console.log('\n📋 User 索引:')
    const userIndexes = await User.collection.indexes()
    userIndexes.forEach(idx => console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`))

    console.log('\n📋 Friendship 索引:')
    const friendshipIndexes = await Friendship.collection.indexes()
    friendshipIndexes.forEach(idx => console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`))

  } catch (error) {
    console.error('❌ 创建索引失败:', error.message)
    process.exit(1)
  } finally {
    await MongoDB.disconnect()
    console.log('\n🔌 已断开 MongoDB 连接')
    process.exit(0)
  }
}

// 运行
createIndexes()
