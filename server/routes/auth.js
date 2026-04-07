import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import db from '../db/sqlite.js'
import { generateToken, authMiddleware, setTokenCookie, clearTokenCookie } from '../middleware/auth.js'

const router = express.Router()

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
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
 *                 description: 用户名 (3-20字符)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 邮箱地址
 *               password:
 *                 type: string
 *                 description: 密码 (至少6字符)
 *     responses:
 *       201:
 *         description: 注册成功
 *       400:
 *         description: 参数错误或用户名/邮箱已被注册
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ error: '请填写所有必填字段' })
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度应在3-20个字符之间' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6个字符' })
    }

    // 检查用户名和邮箱是否已存在
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email)
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已被注册' })
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10)

    // 创建用户
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
      INSERT INTO users (id, username, email, password, stats, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, username, email, passwordHash, JSON.stringify(defaultStats), new Date().toISOString())

    // 生成 token
    const token = generateToken(userId)

    // 设置 HttpOnly cookie
    setTokenCookie(res, token)

    res.status(201).json({
      message: '注册成功',
      token, // 保留token返回以支持旧客户端
      user: {
        id: userId,
        username,
        email,
        stats: defaultStats
      }
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
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
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 用户名或密码错误
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: '请填写用户名和密码' })
    }

    // 查找用户（支持用户名或邮箱登录）
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username)
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    // 生成 token
    const token = generateToken(user.id)

    // 设置 HttpOnly cookie
    setTokenCookie(res, token)

    res.json({
      message: '登录成功',
      token, // 保留token返回以支持旧客户端和cookie方式
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        stats: JSON.parse(user.stats)
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出
 *     tags: [认证]
 *     responses:
 *       200:
 *         description: 登出成功
 */
router.post('/logout', (req, res) => {
  clearTokenCookie(res)
  res.json({ message: '登出成功' })
})

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 用户信息
 *       401:
 *         description: 未授权
 */
router.get('/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, stats, createdAt FROM users WHERE id = ?').get(req.userId)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        stats: JSON.parse(user.stats),
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * @swagger
 * /api/auth/stats:
 *   put:
 *     summary: 更新用户统计
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stats:
 *                 type: object
 *                 description: 用户统计数据
 *     responses:
 *       200:
 *         description: 更新成功
 *       401:
 *         description: 未授权
 */
router.put('/stats', authMiddleware, (req, res) => {
  try {
    const { stats } = req.body

    if (!stats) {
      return res.status(400).json({ error: '统计数据不能为空' })
    }

    const result = db.prepare('UPDATE users SET stats = ? WHERE id = ?').run(JSON.stringify(stats), req.userId)

    if (result.changes === 0) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({ message: '统计数据更新成功', stats })
  } catch (error) {
    console.error('更新统计错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: 更新用户资料
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *       401:
 *         description: 未授权
 */
router.put('/profile', authMiddleware, (req, res) => {
  try {
    const { username, avatar } = req.body

    // 如果要更新用户名
    if (username !== undefined) {
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: '用户名长度应在3-20个字符之间' })
      }

      // 检查用户名是否已被占用
      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.userId)
      if (existing) {
        return res.status(400).json({ error: '用户名已被占用' })
      }

      db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.userId)
    }

    // 如果要更新头像
    if (avatar !== undefined) {
      db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.userId)
    }

    // 返回更新后的用户信息
    const user = db.prepare('SELECT id, username, email, stats, avatar, createdAt FROM users WHERE id = ?').get(req.userId)

    res.json({
      message: '资料更新成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        stats: JSON.parse(user.stats),
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('更新资料错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

export default router
