import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

const TOKEN_COOKIE_NAME = 'auth_token'

export const generateToken = (userId) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
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
