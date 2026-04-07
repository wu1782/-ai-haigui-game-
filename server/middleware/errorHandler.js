/**
 * 全局错误处理中间件
 * 统一处理所有未捕获的错误
 */

/**
 * 格式化错误响应
 */
function formatErrorResponse(err, isProduction) {
  if (isProduction) {
    // 生产环境不泄露详细信息
    return {
      error: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    }
  }

  // 开发环境返回完整错误信息
  return {
    error: err.message || '服务器内部错误',
    code: err.code || 'INTERNAL_ERROR',
    details: {
      name: err.name,
      stack: err.stack
    }
  }
}

/**
 * 404 处理
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: `路由 ${req.method} ${req.path} 不存在`,
    code: 'ROUTE_NOT_FOUND'
  })
}

/**
 * 全局错误处理中间件
 */
export function errorHandler(err, req, res, next) {
  // 记录错误日志
  console.error(`[ERROR] ${new Date().toISOString()}:`, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack
  })

  // 已知错误类型处理
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message,
      code: 'VALIDATION_ERROR'
    })
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: '认证失败',
      code: 'UNAUTHORIZED'
    })
  }

  // 默认错误处理
  const isProduction = process.env.NODE_ENV === 'production'
  const statusCode = err.statusCode || err.status || 500

  res.status(statusCode).json(formatErrorResponse(err, isProduction))
}
