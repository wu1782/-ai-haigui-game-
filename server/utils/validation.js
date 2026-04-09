/**
 * @fileoverview Request Validation Schemas using Joi
 * Comprehensive validation for all API routes
 */

import Joi from 'joi'

/**
 * Validation schema for user registration
 */
export const registerSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(20)
    .pattern(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
    .required()
    .messages({
      'string.min': '用户名至少3个字符',
      'string.max': '用户名最多20个字符',
      'string.pattern.base': '用户名只能包含字母、数字、下划线和中文',
      'any.required': '用户名不能为空'
    }),
  email: Joi.string()
    .email()
    .pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
    .required()
    .messages({
      'string.email': '邮箱格式不正确',
      'string.pattern.base': '邮箱格式不正确',
      'any.required': '邮箱不能为空'
    }),
  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.min': '密码至少6个字符',
      'any.required': '密码不能为空'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': '两次密码输入不一致',
      'any.required': '请确认密码'
    })
})

/**
 * Validation schema for user login
 */
export const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    'any.required': '用户名不能为空'
  }),
  password: Joi.string().required().messages({
    'any.required': '密码不能为空'
  })
})

/**
 * Validation schema for user profile update
 */
export const updateProfileSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(20)
    .pattern(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
    .messages({
      'string.min': '用户名至少3个字符',
      'string.max': '用户名最多20个字符',
      'string.pattern.base': '用户名只能包含字母、数字、下划线和中文'
    }),
  avatar: Joi.string()
    .pattern(/^https?:\/\/.+/) // 仅允许 http/https 协议
    .max(500)
    .allow(null, '')
    .messages({
      'string.pattern.base': '头像 URL 格式不正确，仅支持 http/https 链接',
      'string.max': '头像 URL 过长'
    })
})

/**
 * Validation schema for stats update
 */
export const updateStatsSchema = Joi.object({
  stats: Joi.object({
    totalGames: Joi.number().integer().min(0),
    totalWins: Joi.number().integer().min(0),
    totalLosses: Joi.number().integer().min(0),
    currentStreak: Joi.number().integer().min(0),
    bestStreak: Joi.number().integer().min(0),
    winRate: Joi.number().min(0).max(100),
    perfectGames: Joi.number().integer().min(0),
    achievements: Joi.array().items(Joi.string()),
    rank: Joi.number().integer().min(1)
  }).required().messages({
    'any.required': '统计数据不能为空'
  })
})

/**
 * Validation schema for AI judge request
 */
export const aiJudgeSchema = Joi.object({
  question: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.min': '问题不能为空',
      'string.max': '问题最多500个字符',
      'any.required': '问题不能为空'
    }),
  storyId: Joi.string().required().messages({
    'any.required': '故事 ID 不能为空'
  }),
  story: Joi.object({
    surface: Joi.string().required(),
    bottom: Joi.string().required()
  }).optional()
})

/**
 * Validation schema for AI hint request
 */
export const aiHintSchema = Joi.object({
  story: Joi.object({
    surface: Joi.string().required().messages({
      'any.required': '故事内容不能为空'
    }),
    bottom: Joi.string().allow('')
  }).required().messages({
    'any.required': '故事对象不能为空'
  }),
  messages: Joi.array().items(
    Joi.object({
      question: Joi.string().allow(''),
      content: Joi.string().allow(''),
      answer: Joi.string().allow('')
    })
  ).optional()
})

/**
 * Validation schema for AI story generation
 */
export const aiGenerateSchema = Joi.object({
  keywords: Joi.array()
    .items(Joi.string().max(50))
    .min(3)
    .max(10)
    .required()
    .messages({
      'array.min': '至少需要3个关键词',
      'array.max': '最多10个关键词',
      'any.required': '关键词不能为空'
    })
})

/**
 * Validation schema for friend search
 */
export const friendSearchSchema = Joi.object({
  keyword: Joi.string()
    .max(50)
    .allow('')
    .optional()
    .messages({
      'string.max': '关键词最多50个字符'
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional()
    .messages({
      'number.min': '页码最小值为 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(20)
    .optional()
    .messages({
      'number.min': '每页数量最小值为 1',
      'number.max': '每页数量最大值为 50'
    })
})

/**
 * Validation schema for sending friend request
 */
export const sendFriendRequestSchema = Joi.object({
  toUserId: Joi.string().required().messages({
    'any.required': '目标用户 ID 不能为空'
  })
})

/**
 * Validation schema for friend request actions
 */
export const friendRequestActionSchema = Joi.object({
  requestId: Joi.string().required().messages({
    'any.required': '请求 ID 不能为空'
  })
})

/**
 * Validation schema for delete friend
 */
export const deleteFriendSchema = Joi.object({
  friendId: Joi.string().required().messages({
    'any.required': '好友 ID 不能为空'
  })
})

/**
 * Validation schema for leaderboard query
 */
export const leaderboardQuerySchema = Joi.object({
  type: Joi.string()
    .valid('fastest', 'fewestQuestions', 'streak', 'totalWins')
    .default('totalWins')
    .messages({
      'any.only': '无效的排行榜类型'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.min': 'limit 最小值为 1',
      'number.max': 'limit 最大值为 100'
    })
})

/**
 * Validation schema for user rank query
 */
export const userRankQuerySchema = Joi.object({
  type: Joi.string()
    .valid('fastest', 'fewestQuestions', 'streak', 'totalWins')
    .default('totalWins')
    .messages({
      'any.only': '无效的排行榜类型'
    })
})

/**
 * Validation schema for updating leaderboard
 */
export const updateLeaderboardSchema = Joi.object({
  userId: Joi.string().required().messages({
    'any.required': '用户 ID 不能为空'
  }),
  entryType: Joi.string()
    .valid('fastest', 'fewestQuestions', 'streak', 'totalWins')
    .required()
    .messages({
      'any.only': '无效的排行榜类型',
      'any.required': '排行榜类型不能为空'
    }),
  value: Joi.number().required().messages({
    'any.required': '值不能为空'
  }),
  storyId: Joi.string().optional()
})

/**
 * Generic validation middleware factory
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
export function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    })

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }))

      return res.status(400).json({
        success: false,
        error: '参数验证失败',
        code: 'VALIDATION_ERROR',
        details: errors,
        requestId: req.requestId
      })
    }

    // Replace with validated and sanitized values
    req[property] = value
    next()
  }
}

/**
 * Validation middleware for request body
 */
export const validateBody = (schema) => validate(schema, 'body')

/**
 * Validation middleware for query parameters
 */
export const validateQuery = (schema) => validate(schema, 'query')

/**
 * Validation middleware for route parameters
 */
export const validateParams = (schema) => validate(schema, 'params')
