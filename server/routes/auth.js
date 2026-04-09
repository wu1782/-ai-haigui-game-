import express from 'express'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import db from '../db/sqlite.js'
import { generateToken, generateRefreshToken, verifyRefreshToken, authMiddleware, setTokenCookie, clearTokenCookie, createSession, verifyRefreshTokenWithSession, updateSessionLastActive, revokeSession, revokeAllUserSessions, getUserSessions, getTokenFromRequest, getJwtSecret } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import {
  validateBody,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  updateStatsSchema
} from '../utils/validation.js'
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyEmailToken,
  verifyResetToken
} from '../services/emailService.js'
import { recordLoginFailure, checkLoginLocked, clearLoginAttempts, MAX_ATTEMPTS } from '../db/redis.js'

const router = express.Router()

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} username - Username
 * @property {string} email - Email
 * @property {object} stats - User statistics
 */

/**
 * @typedef {Object} AuthResponse
 * @property {string} message - Success message
 * @property {string} token - JWT token
 * @property {User} user - User information
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: 用户注册
 *     description: 创建新用户账户
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *                 pattern: "^[a-zA-Z0-9_\u4e00-\u9fa5]+$"
 *                 description: 用户名 (3-20字符，可包含中文)
 *                 example: "海龟汤玩家"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 邮箱地址
 *                 example: "player@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: 密码 (至少6字符)
 *                 example: "securepassword123"
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "注册成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 requestId:
 *                   type: string
 *       400:
 *         description: 参数错误或用户名/邮箱已被注册
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post('/register', validateBody(registerSchema), asyncHandler(async (req, res) => {
  const { username, email, password } = req.body

  // Check existing user
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email)
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: '用户名或邮箱已被注册',
      code: 'VALIDATION_ERROR',
      requestId: req.requestId
    })
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10)

  // Create user
  const userId = uuidv4()
  const defaultStats = {
    totalGames: 0,
    totalWins: 0,
    totalLosses: 0,
    currentStreak: 0,
    bestStreak: 0,
    winRate: 0,
    perfectGames: 0,
    achievements: [],
    rank: 1
  }

  db.prepare(`
    INSERT INTO users (id, username, email, password, stats, createdAt, emailVerified)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(userId, username, email, passwordHash, JSON.stringify(defaultStats), new Date().toISOString())

  // 发送验证邮件（不阻塞注册）
  sendVerificationEmail(email, username, userId).catch(err => {
    console.error('[Auth] Failed to send verification email:', err.message)
  })

  // 创建会话
  const token = generateToken(userId)
  const refreshToken = generateRefreshToken(userId)
  const sessionId = createSession({
    userId,
    refreshToken,
    deviceInfo: req.body.deviceInfo || null,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null
  })
  setTokenCookie(res, token)

  res.status(201).json({
    success: true,
    message: '注册成功',
    data: {
      token,
      refreshToken,
      sessionId,
      expiresIn: 86400,
      user: {
        id: userId,
        username,
        email,
        emailVerified: false,
        stats: defaultStats
      }
    },
    requestId: req.requestId
  })
}))

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 使用用户名或邮箱登录
 *     tags: [认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名或邮箱
 *                 example: "海龟汤玩家"
 *               password:
 *                 type: string
 *                 description: 密码
 *                 example: "securepassword123"
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "登录成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 requestId:
 *                   type: string
 *       401:
 *         description: 用户名或密码错误
 */
router.post('/login', validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body

  // 检查账户是否被锁定
  const lockStatus = await checkLoginLocked(username)
  if (lockStatus?.locked) {
    return res.status(429).json({
      success: false,
      error: '登录失败次数过多，账户已锁定，请15分钟后再试',
      code: 'ACCOUNT_LOCKED',
      retryAfter: lockStatus.retryAfter
    })
  }

  // Find user
  let user
  try {
    user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username)
  } catch (err) {
    console.error('[Auth] Database query error:', err)
    return res.status(500).json({
      success: false,
      error: '数据库查询失败',
      code: 'INTERNAL_ERROR',
      requestId: req.requestId
    })
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      error: '用户名或密码错误',
      code: 'UNAUTHORIZED',
      requestId: req.requestId
    })
  }

  // Verify password
  let isValidPassword = false
  try {
    isValidPassword = await bcrypt.compare(password, user.password)
  } catch (err) {
    console.error('[Auth] Password comparison error:', err)
    return res.status(500).json({
      success: false,
      error: '密码验证失败',
      code: 'INTERNAL_ERROR',
      requestId: req.requestId
    })
  }

  if (!isValidPassword) {
    const lockRecord = await recordLoginFailure(username)
    if (lockRecord.lockedUntil) {
      return res.status(429).json({
        success: false,
        error: '登录失败次数过多，账户已锁定，请15分钟后再试',
        code: 'ACCOUNT_LOCKED',
        retryAfter: Math.ceil((lockRecord.lockedUntil - Date.now()) / 1000)
      })
    }
    return res.status(401).json({
      success: false,
      error: `用户名或密码错误（剩余${MAX_ATTEMPTS - lockRecord.count}次）`,
      code: 'UNAUTHORIZED',
      attempts: lockRecord.count,
      requestId: req.requestId
    })
  }

  // 登录成功，清除失败记录
  await clearLoginAttempts(username)

  // Parse user stats
  let stats = { totalGames: 0, totalWins: 0, totalLosses: 0 }
  try {
    stats = JSON.parse(user.stats || '{}')
  } catch {
    console.warn('[Auth] Failed to parse user stats, using defaults')
  }

  // 生成 access token 和 refresh token，并创建会话
  const token = generateToken(user.id)
  const refreshToken = generateRefreshToken(user.id)
  const sessionId = createSession({
    userId: user.id,
    refreshToken,
    deviceInfo: req.body.deviceInfo || null,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null
  })
  setTokenCookie(res, token)

  res.json({
    success: true,
    message: '登录成功',
    data: {
      token,
      refreshToken,
      sessionId,
      expiresIn: 86400, // 24小时
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: !!user.emailVerified,
        stats
      }
    },
    requestId: req.requestId
  })
}))

/**
 * POST /api/v1/auth/refresh
 * 使用 refresh token 刷新 access token
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: '缺少 refreshToken',
      code: 'MISSING_TOKEN'
    })
  }

  const decoded = verifyRefreshTokenWithSession(refreshToken)
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'refreshToken 无效或已过期',
      code: 'INVALID_TOKEN'
    })
  }

  // 更新会话活跃时间
  updateSessionLastActive(decoded.sessionId)

  // 生成新的 access token 和 refresh token（保持同一会话）
  const newToken = generateToken(decoded.userId, decoded.sessionId)
  const newRefreshToken = generateRefreshToken(decoded.userId, decoded.sessionId)
  setTokenCookie(res, newToken)

  res.json({
    success: true,
    data: {
      token: newToken,
      refreshToken: newRefreshToken,
      sessionId: decoded.sessionId,
      expiresIn: 86400
    }
  })
}))

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: 用户登出
 *     description: 清除认证 cookie
 *     tags: [认证]
 *     responses:
 *       200:
 *         description: 登出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "登出成功"
 *                 requestId:
 *                   type: string
 */
router.post('/logout', asyncHandler(async (req, res) => {
  const { sessionId } = req.body

  // 如果提供了 sessionId，吊销该会话
  if (sessionId) {
    revokeSession(sessionId)
  }

  clearTokenCookie(res)
  res.json({
    success: true,
    message: '登出成功',
    requestId: req.requestId
  })
}))

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     description: 返回当前登录用户的详细信息
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 用户信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                 requestId:
 *                   type: string
 *       401:
 *         description: 未授权
 */
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = db.prepare('SELECT id, username, email, emailVerified, stats, createdAt FROM users WHERE id = ?').get(req.userId)
  if (!user) {
    return res.status(404).json({
      success: false,
      error: '用户不存在',
      code: 'NOT_FOUND',
      requestId: req.requestId
    })
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: !!user.emailVerified,
        stats: JSON.parse(user.stats),
        createdAt: user.createdAt
      }
    },
    requestId: req.requestId
  })
}))

/**
 * @swagger
 * /api/v1/auth/stats:
 *   put:
 *     summary: 更新用户统计
 *     description: 更新当前用户的游戏统计数据
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stats
 *             properties:
 *               stats:
 *                 type: object
 *                 description: 用户统计数据
 *                 properties:
 *                   totalGames:
 *                     type: number
 *                   totalWins:
 *                     type: number
 *                   totalLosses:
 *                     type: number
 *                   currentStreak:
 *                     type: number
 *                   bestStreak:
 *                     type: number
 *                   winRate:
 *                     type: number
 *                   perfectGames:
 *                     type: number
 *                   achievements:
 *                     type: array
 *                     items:
 *                       type: string
 *                   rank:
 *                     type: number
 *     responses:
 *       200:
 *         description: 更新成功
 *       401:
 *         description: 未授权
 */
router.put('/stats', authMiddleware, validateBody(updateStatsSchema), asyncHandler(async (req, res) => {
  const { stats } = req.body

  const result = db.prepare('UPDATE users SET stats = ? WHERE id = ?').run(JSON.stringify(stats), req.userId)

  if (result.changes === 0) {
    return res.status(404).json({
      success: false,
      error: '用户不存在',
      code: 'NOT_FOUND',
      requestId: req.requestId
    })
  }

  res.json({
    success: true,
    message: '统计数据更新成功',
    data: { stats },
    requestId: req.requestId
  })
}))

/**
 * @swagger
 * /api/v1/auth/profile:
 *   put:
 *     summary: 更新用户资料
 *     description: 更新当前用户的用户名或头像
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 20
 *                 description: 新用户名
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 description: 新头像 URL
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 用户名已被占用
 *       401:
 *         description: 未授权
 */
router.put('/profile', authMiddleware, validateBody(updateProfileSchema), asyncHandler(async (req, res) => {
  const { username, avatar } = req.body

  // Update username if provided
  if (username !== undefined) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.userId)
    if (existing) {
      return res.status(400).json({
        success: false,
        error: '用户名已被占用',
        code: 'VALIDATION_ERROR',
        requestId: req.requestId
      })
    }
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.userId)
  }

  // Update avatar if provided
  if (avatar !== undefined && avatar !== null && avatar !== '') {
    // 二次验证：确保是安全的 HTTP/HTTPS URL
    try {
      const url = new URL(avatar)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return res.status(400).json({
          success: false,
          error: '头像 URL 仅支持 http/https 协议',
          code: 'VALIDATION_ERROR',
          requestId: req.requestId
        })
      }
    } catch {
      return res.status(400).json({
        success: false,
        error: '头像 URL 格式不正确',
        code: 'VALIDATION_ERROR',
        requestId: req.requestId
      })
    }
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.userId)
  }

  // Get updated user
  const user = db.prepare('SELECT id, username, email, emailVerified, stats, avatar, createdAt FROM users WHERE id = ?').get(req.userId)

  res.json({
    success: true,
    message: '资料更新成功',
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        emailVerified: !!user.emailVerified,
        avatar: user.avatar,
        stats: JSON.parse(user.stats),
        createdAt: user.createdAt
      }
    },
    requestId: req.requestId
  })
}))

/**
 * POST /api/v1/auth/verify
 * 验证邮箱 Token（用户点击邮件链接）
 */
router.post('/verify', asyncHandler(async (req, res) => {
  const { token } = req.body

  if (!token) {
    return res.status(400).json({
      success: false,
      error: '缺少验证 Token',
      code: 'MISSING_TOKEN'
    })
  }

  const decoded = verifyEmailToken(token)
  if (!decoded) {
    return res.status(400).json({
      success: false,
      error: '验证链接无效或已过期',
      code: 'INVALID_TOKEN'
    })
  }

  // 更新用户邮箱验证状态
  const result = db.prepare('UPDATE users SET emailVerified = 1 WHERE id = ?').run(decoded.odId)

  if (result.changes === 0) {
    return res.status(404).json({
      success: false,
      error: '用户不存在',
      code: 'NOT_FOUND'
    })
  }

  res.json({
    success: true,
    message: '邮箱验证成功',
    requestId: req.requestId
  })
}))

/**
 * POST /api/v1/auth/send-verify-email
 * 重新发送验证邮件（需登录）
 */
router.post('/send-verify-email', authMiddleware, asyncHandler(async (req, res) => {
  const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(req.userId)

  if (!user) {
    return res.status(404).json({
      success: false,
      error: '用户不存在',
      code: 'NOT_FOUND'
    })
  }

  if (user.emailVerified) {
    return res.status(400).json({
      success: false,
      error: '邮箱已验证',
      code: 'ALREADY_VERIFIED'
    })
  }

  await sendVerificationEmail(user.email, user.username, user.id)

  res.json({
    success: true,
    message: '验证邮件已发送，请查收',
    requestId: req.requestId
  })
}))

/**
 * POST /api/v1/auth/forgot-password
 * 发送密码重置邮件
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({
      success: false,
      error: '缺少邮箱地址',
      code: 'MISSING_EMAIL'
    })
  }

  const user = db.prepare('SELECT id, username, email FROM users WHERE email = ?').get(email)

  // 为防止邮箱枚举攻击，即使账户不存在也返回成功
  if (!user) {
    return res.json({
      success: true,
      message: '如果该邮箱已注册，我们已发送密码重置邮件',
      requestId: req.requestId
    })
  }

  await sendPasswordResetEmail(user.email, user.username, user.id)

  res.json({
    success: true,
    message: '如果该邮箱已注册，我们已发送密码重置邮件',
    requestId: req.requestId
  })
}))

/**
 * POST /api/v1/auth/reset-password
 * 使用 Token 重置密码
 */
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body

  if (!token || !password) {
    return res.status(400).json({
      success: false,
      error: '缺少 Token 或新密码',
      code: 'MISSING_PARAMS'
    })
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: '密码至少6个字符',
      code: 'PASSWORD_TOO_SHORT'
    })
  }

  const decoded = verifyResetToken(token)
  if (!decoded) {
    return res.status(400).json({
      success: false,
      error: '重置链接无效或已过期',
      code: 'INVALID_TOKEN'
    })
  }

  // 重置密码（Token 是一次性的，使用后失效）
  const passwordHash = await bcrypt.hash(password, 10)
  const result = db.prepare('UPDATE users SET password = ? WHERE id = ?').run(passwordHash, decoded.odId)

  if (result.changes === 0) {
    return res.status(404).json({
      success: false,
      error: '用户不存在',
      code: 'NOT_FOUND'
    })
  }

  res.json({
    success: true,
    message: '密码重置成功，请使用新密码登录',
    requestId: req.requestId
  })
}))

/**
 * GET /api/v1/auth/sessions
 * 获取当前用户的登录设备列表
 */
router.get('/sessions', authMiddleware, asyncHandler(async (req, res) => {
  const sessions = getUserSessions(req.userId)

  // 获取当前会话ID（从当前访问的token中解析）
  let currentSessionId = null
  const token = getTokenFromRequest(req)
  if (token) {
    try {
      const jwt = await import('jsonwebtoken')
      const decoded = jwt.default.verify(token, getJwtSecret())
      currentSessionId = decoded.sessionId || null
    } catch {
      // ignore
    }
  }

  res.json({
    success: true,
    data: {
      sessions: sessions.map(s => ({
        id: s.id,
        deviceInfo: s.deviceInfo,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        isCurrent: s.id === currentSessionId
      })),
      currentSessionId
    },
    requestId: req.requestId
  })
}))

/**
 * DELETE /api/v1/auth/sessions/:sessionId
 * 登出指定设备
 */
router.delete('/sessions/:sessionId', authMiddleware, asyncHandler(async (req, res) => {
  const { sessionId } = req.params

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      error: '缺少会话ID',
      code: 'MISSING_SESSION_ID'
    })
  }

  // 检查会话是否属于当前用户
  const sessions = getUserSessions(req.userId)
  const session = sessions.find(s => s.id === sessionId)

  if (!session) {
    return res.status(404).json({
      success: false,
      error: '会话不存在',
      code: 'SESSION_NOT_FOUND'
    })
  }

  revokeSession(sessionId)

  res.json({
    success: true,
    message: '已成功登出该设备',
    requestId: req.requestId
  })
}))

/**
 * DELETE /api/v1/auth/sessions
 * 登出所有其他设备（除当前会话外）
 */
router.delete('/sessions', authMiddleware, asyncHandler(async (req, res) => {
  const { exceptCurrent } = req.query

  // 获取当前会话ID
  let currentSessionId = null
  const token = getTokenFromRequest(req)
  if (token) {
    try {
      const jwt = await import('jsonwebtoken')
      const decoded = jwt.default.verify(token, getJwtSecret())
      currentSessionId = decoded.sessionId || null
    } catch {
      // ignore
    }
  }

  if (exceptCurrent === 'true' && currentSessionId) {
    // 登出所有其他设备
    revokeAllUserSessions(req.userId, currentSessionId)
    res.json({
      success: true,
      message: '已登出所有其他设备',
      requestId: req.requestId
    })
  } else {
    // 登出所有设备（包括当前）
    revokeAllUserSessions(req.userId)
    clearTokenCookie(res)
    res.json({
      success: true,
      message: '已登出所有设备',
      requestId: req.requestId
    })
  }
}))

export default router
