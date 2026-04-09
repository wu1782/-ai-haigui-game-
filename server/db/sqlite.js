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
    role TEXT DEFAULT 'user',
    createdAt TEXT NOT NULL
  )
`)

// 迁移：添加 avatar 列（如果不存在）
const userTableInfo = db.prepare("PRAGMA table_info(users)").all()
const hasAvatarColumn = userTableInfo.some(col => col.name === 'avatar')
if (!hasAvatarColumn) {
  db.exec("ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT null")
}

// 迁移：添加 role 列（如果不存在）
const hasRoleColumn = userTableInfo.some(col => col.name === 'role')
if (!hasRoleColumn) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
}

// 迁移：添加 emailVerified 列（如果不存在）
const hasEmailVerifiedColumn = userTableInfo.some(col => col.name === 'emailVerified')
if (!hasEmailVerifiedColumn) {
  db.exec("ALTER TABLE users ADD COLUMN emailVerified INTEGER DEFAULT 0")
}

// 排行榜表（含时间维度）
db.exec(`
  CREATE TABLE IF NOT EXISTS leaderboard (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    entryType TEXT NOT NULL,
    value REAL NOT NULL,
    storyId TEXT,
    createdAt TEXT NOT NULL,
    period TEXT DEFAULT 'all',
    UNIQUE(userId, entryType, period)
  )
`)

// 排行榜历史最高记录
db.exec(`
  CREATE TABLE IF NOT EXISTS leaderboard_history (
    odId TEXT NOT NULL,
    entryType TEXT NOT NULL,
    bestRank INTEGER NOT NULL,
    bestValue REAL,
    achievedAt TEXT NOT NULL,
    period TEXT DEFAULT 'all',
    UNIQUE(odId, entryType, period)
  )
`)

// 用户会话表（登录设备管理）
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    refreshTokenHash TEXT NOT NULL,
    deviceInfo TEXT,
    ipAddress TEXT,
    userAgent TEXT,
    createdAt TEXT NOT NULL,
    lastActiveAt TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    revoked INTEGER DEFAULT 0
  )
`)

// 迁移：确保 sessions 表有 ipAddress 列（早期版本可能没有）
const sessionsTableInfo = db.prepare("PRAGMA table_info(sessions)").all()
const hasIpAddress = sessionsTableInfo.some(col => col.name === 'ipAddress')
if (!hasIpAddress) {
  db.exec("ALTER TABLE sessions ADD COLUMN ipAddress TEXT")
}

// 迁移：确保 sessions 表有 userAgent 列（早期版本可能没有）
const hasUserAgent = sessionsTableInfo.some(col => col.name === 'userAgent')
if (!hasUserAgent) {
  db.exec("ALTER TABLE sessions ADD COLUMN userAgent TEXT")
}

export default db
