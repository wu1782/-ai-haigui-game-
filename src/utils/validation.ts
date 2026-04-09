/**
 * 统一输入验证工具
 */

// ============ 基础类型定义 ============

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitized?: string
}

export interface StoryValidation {
  isValid: boolean
  errors: {
    title?: string[]
    surface?: string[]
    bottom?: string[]
    difficulty?: string[]
  }
}

// ============ 字符串清理 ============

/**
 * 去除字符串两端空白
 */
export function trim(s: string): string {
  return s.trim()
}

/**
 * 去除字符串所有空白
 */
export function removeWhitespace(s: string): string {
  return s.replace(/\s+/g, '')
}

// ============ 问题验证 ============

/**
 * 问题输入验证
 * - 长度 2-100 字符
 * - 去除空白后非空
 * - 建议包含问号
 */
export function validateQuestion(input: string): ValidationResult {
  const errors: string[] = []
  const sanitized = input.trim()

  // 长度检查
  if (sanitized.length < 2) {
    errors.push('问题太短，至少需要 2 个字符')
  }
  if (sanitized.length > 100) {
    errors.push('问题太长，最多 100 个字符')
  }

  // 非空检查
  if (sanitized.length === 0) {
    errors.push('问题不能为空')
    return { isValid: false, errors }
  }

  // 问号检查（建议性）- 同时支持半角和全角问号
  if (!sanitized.includes('?') && !sanitized.includes('？')) {
    errors.push('建议在问题末尾添加"？"')
  }

  // 检查是否包含有效疑问词
  const questionWords = ['谁', '什么', '哪', '怎么', '为什么', '是不是', '有没有', '能不能', '是不是', '能否', '是否', '吗', '嘛']
  const hasQuestionWord = questionWords.some(word => sanitized.includes(word))
  if (!hasQuestionWord && sanitized.length > 5) {
    errors.push('问题应包含疑问词（谁/什么/怎么/为什么/吗等）')
  }

  return {
    isValid: errors.filter(e => !e.includes('建议')).length === 0,
    errors,
    sanitized
  }
}

// ============ 答案验证 ============

/**
 * 验证答案格式是否为有效的是非答案
 */
export function validateAnswer(answer: string): answer is '是' | '否' | '无关' | '已破案' {
  const validAnswers = ['是', '否', '无关', '已破案']
  return validAnswers.includes(answer)
}

/**
 * 验证答案并返回清理后的格式
 */
export function normalizeAnswer(answer: string): '是' | '否' | '无关' | '已破案' | null {
  const trimmed = answer.trim()
  const answerMap: Record<string, '是' | '否' | '无关' | '已破案'> = {
    '是': '是',
    '否': '否',
    '无关': '无关',
    '已破案': '已破案',
    'yes': '是',
    'no': '否',
    'irrelevant': '无关',
    'solved': '已破案'
  }
  return answerMap[trimmed] || null
}

// ============ 用户名验证 ============

/**
 * 用户名验证
 * - 长度 3-20 字符
 * - 只允许字母、数字、中文、下划线
 */
export function validateUsername(username: string): ValidationResult {
  const errors: string[] = []
  const sanitized = username.trim()

  if (sanitized.length < 3) {
    errors.push('用户名至少需要 3 个字符')
  }
  if (sanitized.length > 20) {
    errors.push('用户名最多 20 个字符')
  }
  if (sanitized.length === 0) {
    errors.push('用户名不能为空')
  }

  // 只允许字母、数字、中文、下划线
  if (sanitized && !/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(sanitized)) {
    errors.push('用户名只能包含字母、数字、中文和下划线')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}

// ============ 邮箱验证 ============

/**
 * 邮箱验证
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = []
  const sanitized = email.trim().toLowerCase()

  if (sanitized.length === 0) {
    errors.push('邮箱不能为空')
    return { isValid: false, errors }
  }

  // 邮箱格式正则
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(sanitized)) {
    errors.push('请输入有效的邮箱地址')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}

// ============ 密码验证 ============

/**
 * 密码验证
 * - 最少 6 个字符
 * - 建议包含数字和字母
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = []

  if (password.length < 6) {
    errors.push('密码至少需要 6 个字符')
  }
  if (password.length > 50) {
    errors.push('密码最多 50 个字符')
  }
  if (password.length === 0) {
    errors.push('密码不能为空')
  }

  // 建议性检查
  if (password.length > 0 && password.length < 6) {
    // 已在上方检查
  } else if (password.length >= 6) {
    const hasNumber = /\d/.test(password)
    const hasLetter = /[a-zA-Z]/.test(password)
    if (!hasNumber || !hasLetter) {
      errors.push('建议密码包含数字和字母')
    }
  }

  return {
    isValid: errors.filter(e => e.includes('建议')).length === 0 && password.length >= 6,
    errors,
    sanitized: password
  }
}

// ============ 故事投稿验证 ============

/**
 * 验证故事标题
 */
export function validateStoryTitle(title: string): ValidationResult {
  const errors: string[] = []
  const sanitized = title.trim()

  if (sanitized.length < 2) {
    errors.push('标题至少需要 2 个字符')
  }
  if (sanitized.length > 50) {
    errors.push('标题最多 50 个字符')
  }
  if (sanitized.length === 0) {
    errors.push('标题不能为空')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}

/**
 * 验证故事汤面（表面故事）
 * 按 SPEC.md: 汤面 10-500 字
 */
export function validateStorySurface(surface: string): ValidationResult {
  const errors: string[] = []
  const sanitized = surface.trim()

  if (sanitized.length < 10) {
    errors.push('汤面描述至少需要 10 个字符')
  }
  if (sanitized.length > 500) {
    errors.push('汤面描述最多 500 个字符')
  }
  if (sanitized.length === 0) {
    errors.push('汤面不能为空')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}

/**
 * 验证故事汤底（真相）
 * 按 SPEC.md: 汤底 10-1000 字
 */
export function validateStoryBottom(bottom: string): ValidationResult {
  const errors: string[] = []
  const sanitized = bottom.trim()

  if (sanitized.length < 10) {
    errors.push('汤底真相至少需要 10 个字符')
  }
  if (sanitized.length > 1000) {
    errors.push('汤底真相最多 1000 个字符')
  }
  if (sanitized.length === 0) {
    errors.push('汤底不能为空')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}

/**
 * 验证故事难度选择
 */
export function validateDifficulty(difficulty: string): ValidationResult {
  const errors: string[] = []
  const validDifficulties = ['easy', 'medium', 'hard', 'extreme']

  if (!validDifficulties.includes(difficulty)) {
    errors.push('请选择有效的难度等级')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: difficulty
  }
}

/**
 * 完整故事投稿验证
 */
export function validateStorySubmission(story: {
  title: string
  surface: string
  bottom: string
  difficulty: string
}): StoryValidation {
  const errors: {
    title?: string[]
    surface?: string[]
    bottom?: string[]
    difficulty?: string[]
  } = {}

  const titleResult = validateStoryTitle(story.title)
  if (!titleResult.isValid) errors.title = titleResult.errors

  const surfaceResult = validateStorySurface(story.surface)
  if (!surfaceResult.isValid) errors.surface = surfaceResult.errors

  const bottomResult = validateStoryBottom(story.bottom)
  if (!bottomResult.isValid) errors.bottom = bottomResult.errors

  const difficultyResult = validateDifficulty(story.difficulty)
  if (!difficultyResult.isValid) errors.difficulty = difficultyResult.errors

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// ============ 昵称/简介验证 ============

/**
 * 验证用户昵称
 */
export function validateNickname(nickname: string): ValidationResult {
  const errors: string[] = []
  const sanitized = nickname.trim()

  if (sanitized.length > 30) {
    errors.push('昵称最多 30 个字符')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}

/**
 * 验证用户简介
 */
export function validateBio(bio: string): ValidationResult {
  const errors: string[] = []
  const sanitized = bio.trim()

  if (sanitized.length > 200) {
    errors.push('简介最多 200 个字符')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}

// ============ URL 验证 ============

/**
 * 验证 URL 格式
 */
export function validateUrl(url: string): ValidationResult {
  const errors: string[] = []
  const sanitized = url.trim()

  if (sanitized.length === 0) {
    return { isValid: true, errors: [], sanitized }
  }

  try {
    new URL(sanitized)
  } catch {
    errors.push('请输入有效的 URL 地址')
    return { isValid: false, errors, sanitized }
  }

  return { isValid: true, errors, sanitized }
}
