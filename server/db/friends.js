// Friends 数据库表初始化
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbPath = join(__dirname, 'friends.db')
const db = new Database(dbPath)

// 初始化好友关系表
db.exec(`
  CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    friendId TEXT NOT NULL,
    status TEXT DEFAULT 'accepted',
    createdAt TEXT NOT NULL,
    UNIQUE(userId, friendId)
  )
`)

// 初始化好友请求表
db.exec(`
  CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY,
    fromUserId TEXT NOT NULL,
    toUserId TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    createdAt TEXT NOT NULL,
    UNIQUE(fromUserId, toUserId)
  )
`)

export default db
