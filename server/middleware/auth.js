import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import User from '../db/models/User.js'
import db from '../db/sqlite.js'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}-refresh`

// 生产环境必须设置 JWT_SECRET
if (process.env.NODE_ENV === 'production') {
  if (!JWT_SECRET) {
    throw new Error('[Auth] FATAL: JWT_SECRET environment variable is required in production!')
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    console.warn('[Auth] WARNING: Using derived JWT_REFRESH_SECRET. Set JWT_REFRESH_SECRET explicitly for better security!')
  }
} else {
  // 开发环境使用默认值但必须警告
  if (!JWT_SECRET) {
    console.warn('[Auth] WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable!')
    // 使用临时默认值仅用于开发
    global.JWT_SECRET = global.JWT_SECRET || 'dev-secret-change-in-production'
  } else {
    global.JWT_SECRET = JWT_SECRET
  }
}

// 导出实际使用的密钥
export const getJwtSecret = () => process.env.NODE_ENV === 'production' ? JWT_SECRET : global.JWT_SECRET
export const getRefreshSecret = () => JWT_REFRESH_SECRET

const TOKEN_COOKIE_NAME = 'auth_token'

// Access token: 24小时
export const generateToken = (userId, sessionId = null) => {
  return jwt.sign({ userId, sessionId }, getJwtSecret(), { expiresIn: '24h' })
}

// Refresh token: 7天
export const generateRefreshToken = (userId, sessionId) => {
  return jwt.sign({ userId, sessionId, type: 'refresh' }, getRefreshSecret(), { expiresIn: '7d' })
}

/**
 * 创建会话记录
 */
export function createSession({ userId, refreshToken, deviceInfo, ipAddress, userAgent }) {
  const sessionId = uuidv4()
  const refreshTokenHash = bcrypt.hashSync(refreshToken, 10)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  db.prepare(`
    INSERT INTO sessions (id, userId, refreshTokenHash, deviceInfo, ipAddress, userAgent, createdAt, lastActiveAt, expiresAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sessionId,
    userId,
    refreshTokenHash,
    deviceInfo || null,
    ipAddress || null,
    userAgent || null,
    now.toISOString(),
    now.toISOString(),
    expiresAt.toISOString()
  )

  return sessionId
}

/**
 * 更新会话最后活跃时间
 */
export function updateSessionLastActive(sessionId) {
  db.prepare('UPDATE sessions SET lastActiveAt = ? WHERE id = ?')
    .run(new Date().toISOString(), sessionId)
}

/**
 * 轮换会话的 Refresh Token 哈希
 */
export function rotateSessionRefreshToken(sessionId, refreshToken) {
  const refreshTokenHash = bcrypt.hashSync(refreshToken, 10)
  db.prepare('UPDATE sessions SET refreshTokenHash = ?, lastActiveAt = ? WHERE id = ? AND revoked = 0')
    .run(refreshTokenHash, new Date().toISOString(), sessionId)
}

/**
 * 验证 Refresh Token 并检查会话是否有效
 */
export function verifyRefreshTokenWithSession(token) {
  try {
    const decoded = jwt.verify(token, getRefreshSecret())
    if (decoded.type !== 'refresh' || !decoded.sessionId) return null

    // 检查会话是否存在且未被撤销
    const session = db.prepare('SELECT * FROM sessions WHERE id = ? AND revoked = 0').get(decoded.sessionId)
    if (!session) return null

    // 检查是否过期
    if (new Date(session.expiresAt) < new Date()) return null

    // 验证 refresh token 哈希
    if (!bcrypt.compareSync(token, session.refreshTokenHash)) return null

    return { ...decoded, sessionId: decoded.sessionId }
  } catch {
    return null
  }
}

/**
 * 吊销会话
 */
export function revokeSession(sessionId) {
  db.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?').run(sessionId)
}

/**
 * 吊销用户所有会话（除指定sessionId外）
 */
export function revokeAllUserSessions(userId, exceptSessionId = null) {
  if (exceptSessionId) {
    db.prepare('UPDATE sessions SET revoked = 1 WHERE userId = ? AND id != ?')
      .run(userId, exceptSessionId)
  } else {
    db.prepare('UPDATE sessions SET revoked = 1 WHERE userId = ?').run(userId)
  }
}

/**
 * 获取用户的所有有效会话
 */
export function getUserSessions(userId) {
  return db.prepare(`
    SELECT id, deviceInfo, ipAddress, userAgent, createdAt, lastActiveAt, expiresAt
    FROM sessions
    WHERE userId = ? AND revoked = 0 AND expiresAt > ?
    ORDER BY lastActiveAt DESC
  `).all(userId, new Date().toISOString())
}

// 验证 access token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret())
  } catch {
    return null
  }
}

// 验证 refresh token
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, getRefreshSecret())
    if (decoded.type !== 'refresh') return null
    return decoded
  } catch {
    return null
  }
}

// 获取token（支持cookie和header）
export const getTokenFromRequest = (req) => {
  // 优先从cookie获取
  if (req.cookies && req.cookies[TOKEN_COOKIE_NAME]) {
    return req.cookies[TOKEN_COOKIE_NAME]
  }
  // 其次从Authorization header获取
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1]
  }
  return null
}

// 设置token到cookie
export const setTokenCookie = (res, token) => {
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
  })
}

// 清除token cookie
export const clearTokenCookie = (res) => {
  res.clearCookie(TOKEN_COOKIE_NAME)
}

export const authMiddleware = (req, res, next) => {
  const token = getTokenFromRequest(req)

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' })
  }

  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ error: '无效或过期的令牌' })
  }

  req.userId = decoded.userId
  req.userRole = decoded.userRole || 'user'
  next()
}

// 带角色查询的认证中间件（需要查 MongoDB）
export const authMiddlewareWithRole = async (req, res, next) => {
  const token = getTokenFromRequest(req)

  if (!token) {
    return res.status(401).json({ error: '未提供认证令牌' })
  }

  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ error: '无效或过期的令牌' })
  }

  req.userId = decoded.userId

  // 查询用户角色
  try {
    const user = await User.findOne({ _id: decoded.userId }).select('role').lean()
    req.userRole = user?.role || 'user'
  } catch {
    req.userRole = 'user'
  }

  next()
}

// 可选的auth中间件（不强制要求认证）
export const optionalAuth = (req, res, next) => {
  const token = getTokenFromRequest(req)

  if (token) {
    const decoded = verifyToken(token)
    if (decoded) {
      req.userId = decoded.userId
    }
  }

  next()
}
