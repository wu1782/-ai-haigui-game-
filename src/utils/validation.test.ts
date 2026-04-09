/**
 * Validation Utility Tests
 */
import { describe, it, expect } from 'vitest'
import {
  validateQuestion,
  validateUsername,
  validateEmail,
  validatePassword,
  validateStoryTitle,
  validateStorySurface,
  validateStoryBottom,
  validateDifficulty
} from './validation'

describe('validateQuestion', () => {
  it('should accept valid questions', () => {
    const result = validateQuestion('他是男人吗？')
    expect(result.isValid).toBe(true)
    expect(result.errors.length).toBe(0)
  })

  it('should reject questions shorter than 2 characters', () => {
    const result = validateQuestion('?')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('太短'))).toBe(true)
  })

  it('should reject empty questions', () => {
    const result = validateQuestion('')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('不能为空'))).toBe(true)
  })

  it('should reject questions longer than 100 characters', () => {
    const longQuestion = 'a'.repeat(101)
    const result = validateQuestion(longQuestion)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('太长'))).toBe(true)
  })
})

describe('validateUsername', () => {
  it('should accept valid usernames', () => {
    const result = validateUsername('海龟汤玩家')
    expect(result.isValid).toBe(true)
  })

  it('should accept alphanumeric usernames', () => {
    const result = validateUsername('player123')
    expect(result.isValid).toBe(true)
  })

  it('should reject usernames shorter than 3 characters', () => {
    const result = validateUsername('ab')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('至少3'))).toBe(true)
  })

  it('should reject usernames longer than 20 characters', () => {
    const result = validateUsername('a'.repeat(21))
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('最多20'))).toBe(true)
  })

  it('should reject usernames with special characters', () => {
    const result = validateUsername('user@name')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('只能包含'))).toBe(true)
  })
})

describe('validateEmail', () => {
  it('should accept valid emails', () => {
    const result = validateEmail('user@example.com')
    expect(result.isValid).toBe(true)
  })

  it('should reject invalid emails', () => {
    const result = validateEmail('not-an-email')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('有效'))).toBe(true)
  })

  it('should reject empty email', () => {
    const result = validateEmail('')
    expect(result.isValid).toBe(false)
  })
})

describe('validatePassword', () => {
  it('should accept passwords with 6+ characters', () => {
    const result = validatePassword('password123')
    expect(result.isValid).toBe(true)
  })

  it('should reject passwords shorter than 6 characters', () => {
    const result = validatePassword('12345')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('至少6'))).toBe(true)
  })
})

describe('validateStoryTitle', () => {
  it('should accept valid titles', () => {
    const result = validateStoryTitle('一个有趣的故事')
    expect(result.isValid).toBe(true)
  })

  it('should reject titles shorter than 2 characters', () => {
    const result = validateStoryTitle('a')
    expect(result.isValid).toBe(false)
  })

  it('should reject titles longer than 50 characters', () => {
    const result = validateStoryTitle('a'.repeat(51))
    expect(result.isValid).toBe(false)
  })
})

describe('validateStorySurface', () => {
  it('should accept surface with 10-500 characters', () => {
    const result = validateStorySurface('a'.repeat(100))
    expect(result.isValid).toBe(true)
  })

  it('should reject surface shorter than 10 characters', () => {
    const result = validateStorySurface('short')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('至少10'))).toBe(true)
  })

  it('should reject surface longer than 500 characters', () => {
    const result = validateStorySurface('a'.repeat(501))
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('最多500'))).toBe(true)
  })
})

describe('validateStoryBottom', () => {
  it('should accept bottom with 10-1000 characters', () => {
    const result = validateStoryBottom('a'.repeat(500))
    expect(result.isValid).toBe(true)
  })

  it('should reject bottom shorter than 10 characters', () => {
    const result = validateStoryBottom('short')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('至少10'))).toBe(true)
  })

  it('should reject bottom longer than 1000 characters', () => {
    const result = validateStoryBottom('a'.repeat(1001))
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('最多1000'))).toBe(true)
  })
})

describe('validateDifficulty', () => {
  it('should accept valid difficulty levels', () => {
    expect(validateDifficulty('easy').isValid).toBe(true)
    expect(validateDifficulty('medium').isValid).toBe(true)
    expect(validateDifficulty('hard').isValid).toBe(true)
    expect(validateDifficulty('extreme').isValid).toBe(true)
  })

  it('should reject invalid difficulty levels', () => {
    const result = validateDifficulty('impossible')
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('选择有效的'))).toBe(true)
  })
})
