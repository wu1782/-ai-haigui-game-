import db from '../db/sqlite.js'
import { authMiddleware } from './auth.js'

// 管理员权限中间件 - 必须在 authMiddleware 之后使用
// 使用 SQLite 检查用户角色（不依赖 MongoDB）
export const requireAdmin = (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: '未提供认证令牌',
        code: 'UNAUTHORIZED'
      })
    }

    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
        code: 'NOT_FOUND'
      })
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '需要管理员权限',
        code: 'FORBIDDEN'
      })
    }

    req.userRole = user.role
    next()
  } catch (error) {
    console.error('[Admin] Check error:', error)
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    })
  }
}

// 组合中间件：认证 + 管理员检查
export const adminMiddleware = [authMiddleware, requireAdmin]
