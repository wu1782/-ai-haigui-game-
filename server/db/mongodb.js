// MongoDB 连接配置
// 用于500+用户扩展，需要运行 MongoDB 服务器

import mongoose from 'mongoose'
import Story from './models/Story.js'
import User from './models/User.js'
import Friendship from './models/Friendship.js'
import Achievement from './models/Achievement.js'
import OperationLog from './models/OperationLog.js'
import Comment from './models/Comment.js'
import Message from './models/Message.js'
import Notification from './models/Notification.js'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/turtle-soup'

// Connection state
let isConnected = false
let connectionState = 'disconnected' // disconnected, connecting, connected, reconnecting
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY_MS = 5000

// Event listeners storage
const listeners = new Map()

/**
 * Get current connection status
 */
export function getConnectionStatus() {
  return {
    isConnected,
    state: connectionState,
    reconnectAttempts
  }
}

/**
 * Subscribe to connection status changes
 */
export function onConnectionChange(callback) {
  listeners.set(callback, true)
  return () => listeners.delete(callback)
}

/**
 * Notify all listeners of status change
 */
function notifyListeners() {
  const status = getConnectionStatus()
  listeners.forEach((_, callback) => {
    try {
      callback(status)
    } catch (e) {
      console.error('[MongoDB] Listener error:', e)
    }
  })
}

/**
 * Connect to MongoDB with retry logic
 */
export async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (connectionState === 'connecting') {
    // Wait for ongoing connection attempt
    return new Promise((resolve, reject) => {
      const checkState = setInterval(() => {
        if (connectionState === 'connected') {
          clearInterval(checkState)
          resolve(mongoose.connection)
        } else if (connectionState === 'disconnected') {
          clearInterval(checkState)
          reject(new Error('Connection failed'))
        }
      }, 100)
    })
  }

  connectionState = 'connecting'
  notifyListeners()

  try {
    // Connection options
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4
    }

    // Attempt connection with retry
    await withRetry(async () => {
      console.log(`[MongoDB] Connecting to ${MONGODB_URI}...`)
      await mongoose.connect(MONGODB_URI, options)
    })

    isConnected = true
    connectionState = 'connected'
    reconnectAttempts = 0
    console.log('[MongoDB] Connected successfully')

    // Setup event handlers
    setupConnectionHandlers()

    // Ensure indexes are created
    await ensureIndexes()

    notifyListeners()
    return mongoose.connection
  } catch (error) {
    isConnected = false
    connectionState = 'disconnected'
    console.error('[MongoDB] Failed to connect:', error.message)
    notifyListeners()
    throw error
  }
}

/**
 * Retry wrapper for connection attempts
 */
async function withRetry(fn, attempt = 1) {
  try {
    return await fn()
  } catch (error) {
    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      throw error
    }

    reconnectAttempts = attempt
    console.warn(`[MongoDB] Connection attempt ${attempt} failed, retrying in ${RECONNECT_DELAY_MS}ms...`)
    connectionState = 'reconnecting'
    notifyListeners()

    await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY_MS))
    return withRetry(fn, attempt + 1)
  }
}

/**
 * Setup MongoDB connection event handlers
 */
function setupConnectionHandlers() {
  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err)
    isConnected = false
    connectionState = 'disconnected'
    notifyListeners()
  })

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected')
    isConnected = false
    connectionState = 'disconnected'
    notifyListeners()
  })

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Reconnected')
    isConnected = true
    connectionState = 'connected'
    notifyListeners()
  })

  mongoose.connection.on('close', () => {
    console.log('[MongoDB] Connection closed')
    isConnected = false
    connectionState = 'disconnected'
    notifyListeners()
  })
}

/**
 * Ensure indexes are created for optimal query performance
 */
async function ensureIndexes() {
  try {
    // Story indexes
    await Story.createIndexes()
    console.log('[MongoDB] Story indexes ensured')

    // User indexes
    await User.createIndexes()
    console.log('[MongoDB] User indexes ensured')

    // Friendship indexes
    await Friendship.createIndexes()
    console.log('[MongoDB] Friendship indexes ensured')

    // Achievement indexes
    await Achievement.createIndexes()
    console.log('[MongoDB] Achievement indexes ensured')

    // OperationLog indexes
    await OperationLog.createIndexes()
    console.log('[MongoDB] OperationLog indexes ensured')

    // Comment indexes
    await Comment.createIndexes()
    console.log('[MongoDB] Comment indexes ensured')

    // Message indexes
    await Message.createIndexes()
    console.log('[MongoDB] Message indexes ensured')

    // Notification indexes
    await Notification.createIndexes()
    console.log('[MongoDB] Notification indexes ensured')
  } catch (error) {
    console.error('[MongoDB] Error creating indexes:', error)
  }
}

/**
 * Graceful shutdown handler
 */
export async function gracefulShutdown(signal) {
  console.log(`[MongoDB] Received ${signal}, starting graceful shutdown...`)

  try {
    // Stop accepting new connections
    isConnected = false
    connectionState = 'disconnecting'

    // Close existing connections
    await mongoose.connection.close()
    console.log('[MongoDB] Connection closed gracefully')

    connectionState = 'disconnected'
    notifyListeners()

    return true
  } catch (error) {
    console.error('[MongoDB] Error during shutdown:', error)
    throw error
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB() {
  if (!isConnected) {
    return
  }

  try {
    await mongoose.disconnect()
    isConnected = false
    connectionState = 'disconnected'
    reconnectAttempts = 0
    console.log('[MongoDB] Disconnected')
    notifyListeners()
  } catch (error) {
    console.error('[MongoDB] Error disconnecting:', error)
    throw error
  }
}

/**
 * Check if MongoDB is available (health check)
 */
export async function checkHealth() {
  try {
    if (!isConnected || mongoose.connection.readyState !== 1) {
      return { healthy: false, reason: 'Not connected' }
    }

    // Ping the database
    await mongoose.connection.db.admin().ping()

    return { healthy: true, latency: Date.now() }
  } catch (error) {
    return { healthy: false, reason: error.message }
  }
}

// Export models
export { Story, User, Friendship, Achievement, OperationLog, Comment, Message, Notification }
