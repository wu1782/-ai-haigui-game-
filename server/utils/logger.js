/**
 * 统一日志工具
 * 提供一致的日志级别和格式
 */

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
}

const currentLevel = process.env.LOG_LEVEL ? LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info : LOG_LEVELS.info

function formatMessage(level, tag, message, data) {
  const timestamp = new Date().toISOString()
  const tagStr = tag ? `[${tag}]` : ''
  const dataStr = data ? ` ${JSON.stringify(data)}` : ''
  return `${timestamp} [${level.toUpperCase()}]${tagStr} ${message}${dataStr}`
}

export const logger = {
  error(tag, message, data) {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(formatMessage('error', tag, message, data))
    }
  },

  warn(tag, message, data) {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', tag, message, data))
    }
  },

  info(tag, message, data) {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(formatMessage('info', tag, message, data))
    }
  },

  debug(tag, message, data) {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(formatMessage('debug', tag, message, data))
    }
  }
}

export default logger
