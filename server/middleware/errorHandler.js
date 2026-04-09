/**
 * @fileoverview Enhanced Error Handling Middleware
 * Comprehensive error handling with proper HTTP status codes, logging, and API versioning support
 */

import { ErrorCodes, HttpStatus } from '../types/api.js'

/**
 * Custom API Error class with status code and error code
 */
export class ApiError extends Error {
  constructor(statusCode, message, code = ErrorCodes.INTERNAL_ERROR) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'ApiError'
  }

  static badRequest(message, code = ErrorCodes.VALIDATION_ERROR) {
    return new ApiError(HttpStatus.BAD_REQUEST, message, code)
  }

  static unauthorized(message = '认证失败', code = ErrorCodes.UNAUTHORIZED) {
    return new ApiError(HttpStatus.UNAUTHORIZED, message, code)
  }

  static forbidden(message = '无权限访问', code = ErrorCodes.FORBIDDEN) {
    return new ApiError(HttpStatus.FORBIDDEN, message, code)
  }

  static notFound(message = '资源不存在', code = ErrorCodes.NOT_FOUND) {
    return new ApiError(HttpStatus.NOT_FOUND, message, code)
  }

  static rateLimit(retryAfter = 60) {
    const error = new ApiError(
      HttpStatus.TOO_MANY_REQUESTS,
      '请求过于频繁，请稍后再试',
      ErrorCodes.RATE_LIMIT_EXCEEDED
    )
    error.retryAfter = retryAfter
    return error
  }

  static internal(message = '服务器内部错误', code = ErrorCodes.INTERNAL_ERROR) {
    return new ApiError(HttpStatus.INTERNAL_ERROR, message, code)
  }

  static aiService(message = 'AI 服务响应错误') {
    return new ApiError(HttpStatus.BAD_GATEWAY, message, ErrorCodes.AI_SERVICE_ERROR)
  }
}

/**
 * Validation Error class for express-validator errors
 */
export class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed')
    this.name = 'ValidationError'
    this.errors = errors
    this.code = ErrorCodes.VALIDATION_ERROR
    this.statusCode = HttpStatus.BAD_REQUEST
  }
}

/**
 * Formats error response based on environment
 * @param {Error} err - The error object
 * @param {boolean} isProduction - Whether running in production
 * @returns {object} Formatted error response
 */
function formatErrorResponse(err, isProduction) {
  // Handle ValidationError from express-validator
  if (err.name === 'ValidationError' && err.errors) {
    return {
      success: false,
      error: '参数验证失败',
      code: err.code || ErrorCodes.VALIDATION_ERROR,
      details: err.errors.map(e => ({
        field: e.path || e.param,
        message: e.msg
      }))
    }
  }

  // Handle ApiError
  if (err instanceof ApiError) {
    const response = {
      success: false,
      error: err.message,
      code: err.code,
      requestId: err.requestId
    }
    if (err.retryAfter) {
      response.retryAfter = err.retryAfter
    }
    return response
  }

  if (isProduction) {
    return {
      success: false,
      error: '服务器内部错误',
      code: ErrorCodes.INTERNAL_ERROR,
      requestId: err.requestId
    }
  }

  return {
    success: false,
    error: err.message || '服务器内部错误',
    code: err.code || ErrorCodes.INTERNAL_ERROR,
    details: {
      name: err.name,
      stack: err.stack
    },
    requestId: err.requestId
  }
}

/**
 * 404 Not Found handler - must be used before other routes
 */
export function notFoundHandler(req, res, next) {
  const acceptHeader = req.headers.accept || ''
  const wantsJson = acceptHeader.includes('application/json')

  if (wantsJson || req.path.startsWith('/api/')) {
    res.status(HttpStatus.NOT_FOUND).json({
      success: false,
      error: `路由 ${req.method} ${req.path} 不存在`,
      code: ErrorCodes.NOT_FOUND,
      requestId: req.requestId
    })
  } else {
    res.status(HttpStatus.NOT_FOUND).send('Not Found')
  }
}

/**
 * Global error handler middleware
 * Must be registered last in the middleware chain
 */
export function errorHandler(err, req, res, next) {
  // Log error with request context
  const logContext = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    userId: req.userId,
    error: err.message,
    code: err.code,
    statusCode: err.statusCode || err.status || HttpStatus.INTERNAL_ERROR
  }

  // Determine log level based on status code
  if (logContext.statusCode >= 500) {
    console.error(`[ERROR] ${new Date().toISOString()}`, logContext, err.stack)
  } else if (logContext.statusCode >= 400) {
    console.warn(`[WARN] ${new Date().toISOString()}`, logContext)
  } else {
    console.log(`[INFO] ${new Date().toISOString()}`, logContext)
  }

  // Handle CORS preflight errors
  if (err.message === 'Not Allowed CORS') {
    return res.status(HttpStatus.FORBIDDEN).json({
      success: false,
      error: 'CORS 策略不允许此请求',
      code: ErrorCodes.FORBIDDEN,
      requestId: req.requestId
    })
  }

  // Handle JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      error: '请求 body 格式错误，请发送有效的 JSON',
      code: ErrorCodes.VALIDATION_ERROR,
      requestId: req.requestId
    })
  }

  // Attach requestId to error for response
  err.requestId = req.requestId

  const isProduction = process.env.NODE_ENV === 'production'
  const statusCode = err.statusCode || err.status || HttpStatus.INTERNAL_ERROR
  const response = formatErrorResponse(err, isProduction)

  res.status(statusCode).json(response)
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped handler with error catching
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
