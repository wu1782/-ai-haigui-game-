/**
 * @fileoverview API Request/Response Type Definitions (JSDoc)
 * These types document the expected structure of API requests and responses.
 * Used for JSDoc annotations and Swagger documentation.
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request was successful
 * @property {string} [message] - Optional success message
 * @property {string} [error] - Error message if success is false
 * @property {string} [code] - Error code for programmatic handling
 * @property {object} [data] - Response data payload
 * @property {string} requestId - Unique request identifier for tracing
 */

/**
 * @typedef {Object} PaginationParams
 * @property {number} [page=1] - Page number (1-indexed)
 * @property {number} [limit=20] - Items per page (max 100)
 */

/**
 * @typedef {Object} UserInfo
 * @property {string} id - User ID
 * @property {string} username - Username
 * @property {string} [avatar] - Avatar URL
 * @property {string} [email] - Email address
 * @property {UserStats} [stats] - User statistics
 * @property {string} [createdAt] - Account creation timestamp
 */

/**
 * @typedef {Object} UserStats
 * @property {number} totalGames - Total games played
 * @property {number} totalWins - Total games won
 * @property {number} totalLosses - Total games lost
 * @property {number} currentStreak - Current win streak
 * @property {number} bestStreak - Best win streak ever
 * @property {number} winRate - Win rate percentage
 * @property {number} perfectGames - Perfect games (won without hints)
 * @property {string[]} achievements - List of achievement IDs
 * @property {number} rank - User rank
 */

/**
 * @typedef {Object} FriendInfo
 * @property {string} id - Friend user ID
 * @property {string} username - Friend username
 * @property {string} [avatar] - Friend avatar URL
 * @property {string} status - Online status ('online' | 'offline')
 * @property {string} addedAt - When the friendship was created
 */

/**
 * @typedef {Object} FriendRequest
 * @property {string} id - Request ID
 * @property {UserInfo} fromUser - Sender user info
 * @property {UserInfo} toUser - Recipient user info
 * @property {string} status - Request status ('pending' | 'accepted' | 'rejected')
 * @property {string} createdAt - When the request was created
 */

/**
 * @typedef {Object} FriendRequestsResponse
 * @property {FriendRequest[]} received - Received friend requests
 * @property {FriendRequest[]} sent - Sent friend requests
 */

/**
 * @typedef {Object} SearchUserResult
 * @property {string} id - User ID
 * @property {string} username - Username
 * @property {string} [avatar] - Avatar URL
 * @property {boolean} isFriend - Whether this user is a friend
 * @property {boolean} hasSentRequest - Whether current user sent a request to this user
 * @property {boolean} hasReceivedRequest - Whether this user sent a request to current user
 */

/**
 * @typedef {Object} LeaderboardEntry
 * @property {string} userId - User ID
 * @property {string} username - Username
 * @property {string} [avatar] - Avatar URL
 * @property {number} value - Score value
 * @property {string} [storyId] - Related story ID
 * @property {string} createdAt - When this entry was recorded
 */

/**
 * @typedef {Object} LeaderboardResponse
 * @property {string} type - Leaderboard type
 * @property {LeaderboardEntry[]} entries - Leaderboard entries
 */

/**
 * @typedef {Object} UserRankResponse
 * @property {string} userId - User ID
 * @property {string} type - Leaderboard type
 * @property {number|null} rank - User rank (null if no entry)
 * @property {number|null} value - User's value (null if no entry)
 */

/**
 * @typedef {Object} Story
 * @property {string} id - Story ID
 * @property {string} title - Story title
 * @property {string} surface - Story surface (question/hook)
 * @property {string} bottom - Story bottom (answer/revelation)
 * @property {number} difficulty - Difficulty level (1-5)
 * @property {string[]} tags - Story tags
 */

/**
 * @typedef {Object} AIJudgeRequest
 * @property {string} question - The question to judge
 * @property {string} storyId - The story ID
 * @property {Story} [story] - Optional story data for custom stories
 */

/**
 * @typedef {Object} AIJudgeResponse
 * @property {string} answer - The judgment result ('是' | '否' | '无关' | '已破案')
 */

/**
 * @typedef {Object} AIHintRequest
 * @property {Story} story - The story object
 * @property {Array<{question?: string, content?: string, answer?: string}>} [messages] - Previous Q&A history
 */

/**
 * @typedef {Object} AIHintResponse
 * @property {string} hint - The generated hint
 * @property {string} [dimension] - Hint dimension/category
 */

/**
 * @typedef {Object} AIGenerateRequest
 * @property {string[]} keywords - Array of 3+ keywords to generate story from
 */

/**
 * @typedef {Object} AIGenerateResponse
 * @property {string} title - Generated story title
 * @property {string} surface - Generated story surface
 * @property {string} bottom - Generated story bottom
 * @property {number} difficulty - Difficulty level (1-5)
 * @property {string[]} tags - Story tags
 */

/**
 * @typedef {Object} AuthRegisterRequest
 * @property {string} username - Username (3-20 characters)
 * @property {string} email - Email address
 * @property {string} password - Password (min 6 characters)
 */

/**
 * @typedef {Object} AuthLoginRequest
 * @property {string} username - Username or email
 * @property {string} password - Password
 */

/**
 * @typedef {Object} AuthResponse
 * @property {string} message - Success message
 * @property {string} token - JWT token
 * @property {UserInfo} user - User information
 */

/**
 * @typedef {Object} ValidationError
 * @property {string} field - Field that failed validation
 * @property {string} message - Human-readable error message
 */

/**
 * @typedef {Object} HttpError
 * @property {number} statusCode - HTTP status code
 * @property {string} message - Error message
 * @property {string} [code] - Error code for programmatic handling
 */

/**
 * Standard error codes
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR'
}

/**
 * HTTP Status codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
}
