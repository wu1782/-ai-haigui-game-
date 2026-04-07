import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbPath = join(__dirname, 'users.db')
const db = new Database(dbPath)

// 初始化数据库
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    stats TEXT DEFAULT '{}',
    avatar TEXT DEFAULT null,
    createdAt TEXT NOT NULL
  )
`)

// 迁移：添加 avatar 列（如果不存在）
const userTableInfo = db.prepare("PRAGMA table_info(users)").all()
const hasAvatarColumn = userTableInfo.some(col => col.name === 'avatar')
if (!hasAvatarColumn) {
  db.exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT null")
}

// 排行榜表
db.exec(`
  CREATE TABLE IF NOT EXISTS leaderboard (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    entryType TEXT NOT NULL,
    value REAL NOT NULL,
    storyId TEXT,
    createdAt TEXT NOT NULL,
    UNIQUE(userId, entryType)
  )
`)

export default db
