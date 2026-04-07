/**
 * 请求日志中间件
 * 记录所有 HTTP 请求的详细信息
 */
export function requestLogger(req, res, next) {
  const start = Date.now()
  const { method, ip, path, originalUrl } = req

  // 请求开始时的日志
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  req.requestId = requestId

  // 响应完成时的处理
  res.on('finish', () => {
    const duration = Date.now() - start
    const { statusCode } = res

    const timestamp = new Date().toISOString()
    const statusColor = statusCode >= 500 ? '\x1b[31m' : // 红色 - 服务器错误
                        statusCode >= 400 ? '\x1b[33m' : // 黄色 - 客户端错误
                        statusCode >= 300 ? '\x1b[36m' : // 青色 - 重定向
                        '\x1b[32m'                      // 绿色 - 成功

    console.log(
      `${timestamp} ${method.padEnd(6)} ${path.padEnd(30)} ${statusColor}${statusCode}\x1b[0m ${duration}ms - ${ip}`
    )
  })

  next()
}
