// 敏感词过滤工具
// 使用 DFA（确定有限自动机）算法，支持高效多模式匹配

// 敏感词库（线上应从数据库/配置文件加载，这里用最小集演示）
const SENSITIVE_WORDS = [
  'admin', 'root', 'test', 'fuck', 'shit', 'bitch',
  '笨蛋', '白痴', '智障', '废物', '垃圾', '傻逼', 'SB',
  '妈的', '他妈的', '去你妈', '操你妈',
  '外挂', '作弊', '破解'
]

// 构造 DFA 状态机
function buildDFA() {
  const dfas = {}

  for (const word of SENSITIVE_WORDS) {
    const lower = word.toLowerCase()
    let node = dfas

    for (let i = 0; i < lower.length; i++) {
      const char = lower[i]
      if (!node[char]) {
        node[char] = { end: false }
      }
      node = node[char]
    }
    node.end = true
  }

  return dfas
}

const dfaRoot = buildDFA()

/**
 * 检查文本是否包含敏感词
 * @param {string} text - 待检查文本
 * @returns {{ contains: boolean, words: string[] }}
 */
export function containsSensitiveWords(text) {
  if (!text || typeof text !== 'string') {
    return { contains: false, words: [] }
  }

  const lower = text.toLowerCase()
  const found = []

  for (let i = 0; i < lower.length; i++) {
    let node = dfaRoot
    let j = i
    let matched = false

    while (j < lower.length && node[lower[j]]) {
      node = node[lower[j]]
      j++
      if (node.end) {
        found.push(lower.substring(i, j))
        matched = true
        break
      }
    }

    // 如果没匹配到任何词，也继续推进（避免死循环）
    if (!matched) {
      // 单字符敏感词（如某些符号）直接检查
      if (dfaRoot[lower[i]]?.end) {
        found.push(lower[i])
      }
    }
  }

  return {
    contains: found.length > 0,
    words: [...new Set(found)]
  }
}

/**
 * 过滤文本中的敏感词（替换为 *）
 * @param {string} text - 待过滤文本
 * @returns {{ filtered: string, words: string[] }}
 */
export function filterSensitiveWords(text) {
  if (!text || typeof text !== 'string') {
    return { filtered: text, words: [] }
  }

  const { contains, words } = containsSensitiveWords(text)

  if (!contains) {
    return { filtered: text, words: [] }
  }

  let filtered = text
  for (const word of words) {
    // 构造匹配时不区分大小写，但替换时用 * 保持原长度
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    filtered = filtered.replace(regex, '*'.repeat(word.length))
  }

  return { filtered, words }
}

/**
 * 敏感词检查中间件（用于 Express）
 * 检查 req.body / req.query 中指定字段
 */
export function sensitiveWordsMiddleware(fields = ['content', 'text', 'username']) {
  return (req, res, next) => {
    const checkValue = (value) => {
      if (typeof value !== 'string') return null
      const result = containsSensitiveWords(value)
      return result.contains ? result.words : null
    }

    // 检查 body
    for (const field of fields) {
      if (req.body?.[field]) {
        const blocked = checkValue(req.body[field])
        if (blocked) {
          return res.status(400).json({
            error: '内容包含敏感词',
            blockedWords: blocked,
            code: 'SENSITIVE_WORD_DETECTED'
          })
        }
      }
    }

    // 检查 query
    for (const field of fields) {
      if (req.query?.[field]) {
        const blocked = checkValue(req.query[field])
        if (blocked) {
          return res.status(400).json({
            error: '内容包含敏感词',
            blockedWords: blocked,
            code: 'SENSITIVE_WORD_DETECTED'
          })
        }
      }
    }

    next()
  }
}
