import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { setupGameHandlers } from './socket/gameHandler.js';
import { setupFriendHandlers } from './socket/friendHandler.js';
import { setupNotificationHandlers } from './socket/notificationHandler.js';
import authRoutes from './routes/auth.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler, asyncHandler } from './middleware/errorHandler.js';
import { aiRateLimiter, cleanup as cleanupRateLimiter } from './middleware/rateLimiter.js';
import { getCachedAIJudgment } from './middleware/cacheLimiter.js';
import {
  validateBody,
  aiJudgeSchema,
  aiHintSchema,
  aiGenerateSchema
} from './utils/validation.js';

// MongoDB imports
import { connectDB, disconnectDB, getConnectionStatus, onConnectionChange, checkHealth } from './db/mongodb.js';
import friendsDb from './db/friends.js';
import userDb from './db/sqlite.js';
import friendsRoutes from './routes/friends.js';
import leaderboardRoutes from './routes/leaderboard.js';
import storiesRoutes from './routes/stories.js';
import contributionsRoutes from './routes/contributions.js';
import achievementsRoutes from './routes/achievements.js';
import commentsRoutes from './routes/comments.js';
import notificationsRoutes from './routes/notifications.js';
import dailyChallengeRoutes from './routes/dailyChallenge.js';

dotenv.config();

// MongoDB initialization state
let mongoAvailable = null; // null=初始化中, true=已连接, false=不可用

const app = express();
const PORT = process.env.PORT || 3001;

// API Versioning
const API_VERSION = 'v1';
const API_PREFIX = `/api/${API_VERSION}`;

// Create HTTP server and Socket.IO server
const httpServer = createServer(app);
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

// CORS origin validator with wildcard support
const corsOriginValidator = (origin, callback) => {
  // Allow requests with no origin (mobile apps, curl, etc.)
  if (!origin) {
    return callback(null, true);
  }

  // Check against whitelist
  const isAllowed = CORS_ORIGINS.some(allowed => {
    if (allowed === '*') return true;
    if (allowed.includes('*')) {
      // Convert wildcard pattern to regex
      const pattern = allowed
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape special chars
        .replace(/\*/g, '.*');  // * matches any string
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return origin === allowed;
  });

  if (isAllowed) {
    callback(null, true);
  } else {
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  }
};

const io = new Server(httpServer, {
  cors: {
    origin: corsOriginValidator,
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration with preflight handling
app.use(cors({
  origin: corsOriginValidator,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-Request-Id'],
  maxAge: 86400
}));

// Middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(requestLogger);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from Express server!', status: 'ok' });
});

// Health check - basic liveness probe
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    requestId: req.requestId
  });
});

// Readiness check - includes dependency checks
app.get('/api/ready', async (req, res) => {
  try {
    // Check SQLite database connections
    let sqliteStatus = 'unknown';
    try {
      userDb.prepare('SELECT 1').get();
      sqliteStatus = 'connected';
    } catch (e) {
      sqliteStatus = 'disconnected';
    }

    // Check MongoDB
    let mongoStatus = 'not_configured';
    if (process.env.MONGODB_URI) {
      const mongoHealth = await checkHealth();
      mongoStatus = mongoHealth.healthy ? 'connected' : 'disconnected';
    }

    // Check Redis (if configured) — reuse single connection per check
    let redisStatus = 'not_configured';
    let redisClient = null;
    try {
      if (process.env.REDIS_URL) {
        const Redis = (await import('ioredis')).default;
        redisClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 2000 });
        await redisClient.ping();
        redisClient.disconnect();
        redisClient = null;
        redisStatus = 'connected';
      }
    } catch (e) {
      redisStatus = 'disconnected';
    } finally {
      if (redisClient) {
        try { redisClient.disconnect(); } catch {}
        redisClient = null;
      }
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      dependencies: {
        sqlite: sqliteStatus,
        mongodb: mongoStatus,
        redis: redisStatus
      }
    });
  } catch (error) {
    if (redisClient) {
      try { redisClient.disconnect(); } catch {}
      redisClient = null;
    }
    res.status(503).json({ status: 'not_ready', error: error.message });
  }
});

// Test database connection
app.get('/api/test-db', (req, res) => {
  try {
    let userCount = { count: 0 }
    try {
      userCount = userDb.prepare('SELECT COUNT(*) as count FROM users').get()
    } catch (e) {
      console.error('users table error:', e.message)
    }

    let friendCount = { count: 0 }
    try {
      friendCount = friendsDb.prepare('SELECT COUNT(*) as count FROM friendships').get()
    } catch (e) {
      console.error('friendships table error:', e.message)
    }

    let requestCount = { count: 0 }
    try {
      requestCount = friendsDb.prepare('SELECT COUNT(*) as count FROM friend_requests').get()
    } catch (e) {
      console.error('friend_requests table error:', e.message)
    }

    res.json({
      success: true,
      data: {
        users: userCount,
        friendships: friendCount,
        friendRequests: requestCount
      },
      requestId: req.requestId
    })
  } catch (error) {
    console.error('Test-db error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'DATABASE_ERROR',
      requestId: req.requestId
    })
  }
});

// Root endpoint - API info
app.get('/', (req, res) => {
  res.json({
    name: 'AI 海龟汤游戏服务器',
    version: '1.1.0',
    apiVersion: API_VERSION,
    database: mongoAvailable === null ? 'initializing' : mongoAvailable ? 'MongoDB' : 'Static (SQLite fallback)',
    endpoints: {
      health: `GET /api/health`,
      docs: `GET /api/docs`,
      auth: `${API_PREFIX}/auth/*`,
      friends: `${API_PREFIX}/friends/*`,
      leaderboard: `${API_PREFIX}/leaderboard/*`,
      stories: `${API_PREFIX}/stories/*`,
      ai: {
        judge: `POST ${API_PREFIX}/ai/judge`,
        hint: `POST ${API_PREFIX}/ai/hint`,
        generate: `POST ${API_PREFIX}/ai/generate`
      }
    },
    rateLimits: {
      ai: '30次/分钟 + 500次/天',
      auth: '10次/5分钟',
      general: '100次/分钟'
    },
    socket: {
      events: [
        'create-room', 'join-room', 'leave-room',
        'player-joined', 'player-left',
        'start-game', 'game-started',
        'ask-question', 'answer-question',
        'guess-answer', 'game-over',
        'toggle-ready', 'player-ready',
        'get-room-list'
      ]
    }
  });
});

// AI Hint endpoint (提示功能)
/**
 * @swagger
 * /api/v1/ai/hint:
 *   post:
 *     summary: AI 提示生成
 *     description: 根据游戏状态生成方向性提示
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - story
 *             properties:
 *               story:
 *                 type: object
 *                 required:
 *                   - surface
 *                 properties:
 *                   surface:
 *                     type: string
 *                     description: 故事汤面
 *                   bottom:
 *                     type: string
 *                     description: 故事汤底
 *               messages:
 *                 type: array
 *                 description: 之前的问答历史
 *                 items:
 *                   type: object
 *                   properties:
 *                     question:
 *                       type: string
 *                     answer:
 *                       type: string
 *     responses:
 *       200:
 *         description: 生成的提示
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
app.post(`${API_PREFIX}/ai/hint`, aiRateLimiter, validateBody(aiHintSchema), asyncHandler(async (req, res) => {
  const { story, messages } = req.body;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: '服务器未配置 API Key',
      code: 'AI_SERVICE_ERROR',
      requestId: req.requestId
    });
  }

  // Build conversation history
  const historyText = Array.isArray(messages) && messages.length > 0
    ? messages.map((m, i) => `Q${i + 1}: ${m.question || m.content || ''}\nA${i + 1}: ${m.answer || ''}`).join('\n')
    : '暂无'

  const prompt = `你是"海龟汤"推理游戏的AI助手。

【游戏背景】
汤面：${story.surface}
汤底：${story.bottom !== undefined ? story.bottom : '未知'}

【当前游戏状态】
玩家已问过的问题和回答：
${historyText}

【任务】
请分析当前游戏状态，给玩家一个方向性的提示，帮助他们继续推理。
要求：
1. 不要透露答案
2. 只给出思考方向（1-2句话）
3. 语言简洁，适合游戏提示`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7
      }),
      signal: controller.signal
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error: '请求超时',
        code: 'TIMEOUT',
        requestId: req.requestId
      });
    }
    throw e;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error('AI API error');
  }

  const data = await response.json();
  const hint = data.choices?.[0]?.message?.content?.trim() || '暂时无法获取提示';

  res.json({
    success: true,
    data: { hint, dimension: '综合分析' },
    requestId: req.requestId
  });
}));

// AI Chat endpoint (Legacy - 保留兼容)
app.post('/api/chat', aiRateLimiter, async (req, res) => {
  const { question, story } = req.body;

  // 验证参数
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question 参数缺失或格式错误' });
  }
  if (!story || typeof story !== 'object') {
    return res.status(400).json({ error: 'story 参数缺失或格式错误' });
  }

  // 从环境变量读取 API Key
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '服务器未配置 API Key' });
  }

  try {
    // 构建 prompt
    const prompt = `你是"海龟汤"推理游戏的裁判。

【游戏规则】
- 玩家通过提问（只能问是非题）来推理故事真相
- 你只能回答："是"、"不是"、"与此无关"、"已破案"
- 只能回答单个词语，不需要解释

【判断标准】
- "是"：玩家问题与汤底事实一致
- "不是"：玩家问题与汤底事实矛盾
- "与此无关"：无法根据汤底判断（问题与故事无关、问题涉及未知信息、问题本身自相矛盾）
- "已破案"：玩家猜出了完整的汤底真相

【当前故事】
故事背景：${story.surface || '未知'}
汤底：${story.bottom !== undefined ? story.bottom : '未知'}

玩家问题：${question}

请判断并回答（只输出一个词）：`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 50,
          temperature: 0.1
        }),
        signal: controller.signal
      });
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        return res.status(504).json({ error: '请求超时', code: 'TIMEOUT' });
      }
      throw e;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('DeepSeek API error:', response.status, errorData);
      return res.status(502).json({ error: 'AI 服务响应错误' });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim() || '无法获取回答';

    res.json({ answer });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// AI Judge endpoint (新版 - 500+用户优化)
/**
 * @swagger
 * /api/v1/ai/judge:
 *   post:
 *     summary: AI 问题判定
 *     description: 判断玩家的问题是否正确，需要传入故事 ID 和玩家问题
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - storyId
 *             properties:
 *               question:
 *                 type: string
 *                 description: 玩家的问题
 *                 example: "凶手是男性吗？"
 *               storyId:
 *                 type: string
 *                 description: 故事 ID
 *                 example: "story-123"
 *               story:
 *                 type: object
 *                 description: 自定义故事数据（可选）
 *                 properties:
 *                   surface:
 *                     type: string
 *                   bottom:
 *                     type: string
 *     responses:
 *       200:
 *         description: 判定结果
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 故事不存在
 *       429:
 *         description: 请求过于频繁
 */
app.post(`${API_PREFIX}/ai/judge`, aiRateLimiter, validateBody(aiJudgeSchema), asyncHandler(async (req, res) => {
  const { question, storyId, story: storyData } = req.body;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: '服务器未配置 API Key',
      code: 'AI_SERVICE_ERROR',
      requestId: req.requestId
    });
  }

  // Get story from database or use provided story data
  // Dynamically import to avoid hard dependency when MongoDB is unavailable
  let story = null;
  if (storyId) {
    try {
      const { getStoryById } = await import('./services/storyService.js');
      story = await getStoryById(storyId);
    } catch (e) {
      // storyService may require MongoDB; fall through to storyData check
    }
  }
  if (!story && storyData && storyData.surface && storyData.bottom) {
    story = {
      id: storyId,
      surface: storyData.surface,
      bottom: storyData.bottom
    };
  }
  if (!story) {
    return res.status(404).json({
      success: false,
      error: '故事不存在',
      code: 'NOT_FOUND',
      requestId: req.requestId
    });
  }

  // Get cached or fresh AI judgment
  const answer = await getCachedAIJudgment(question, storyId, async () => {
    const prompt = `【角色】你是"海龟汤"推理游戏的AI裁判。

【核心规则】
玩家通过提问（只能问是非题）来推理故事真相。你必须严格按以下规则回答：

【回答词汇】（只输出其中一个，禁止添加任何解释）
- "是"：玩家问题与汤底事实一致，包含关键信息
- "否"：玩家问题与汤底事实矛盾
- "无关"：无法从汤底判断（问题与故事无关/涉及未知信息/问题自相矛盾）
- "已破案"：玩家完整猜出汤底真相

【判断标准 - 详细说明】
1. "是"的条件：
   - 问题与汤底核心事实完全吻合
   - 问题的否定形式与汤底矛盾（即正确的问题描述是对的）

2. "否"的条件：
   - 问题与汤底事实直接矛盾

3. "无关"的条件：
   - 问题涉及汤底未提及的信息
   - 问题无法用是/否回答

4. "已破案"的条件：
   - 玩家完整准确地说出汤底真相

【当前故事】
汤面：${story.surface}
汤底：${story.bottom !== undefined ? story.bottom : '未知'}

【输出要求】
- 只输出一个词："是"、"否"、"无关"或"已破案"
- 禁止输出任何其他内容

玩家问题：${question}

回答：`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 50,
          temperature: 0.1
        }),
        signal: controller.signal
      });
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        console.warn('[AI Judge] Request timeout');
      }
      throw e;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('AI API error');
    }

    const data = await response.json();
    const rawAnswer = data.choices?.[0]?.message?.content?.trim() || '';

    const validAnswers = ['是', '否', '无关', '已破案'];
    const normalizedAnswer = rawAnswer.replace(/[。！？，,.!?…~$%^&*()（）]/g, '').trim();

    if (validAnswers.includes(normalizedAnswer)) {
      return normalizedAnswer;
    }

    // Robust fallback: match any of the valid answer words
    const answerWordMatch = rawAnswer.match(/(是|否|无关|已破案)/);
    if (answerWordMatch) {
      return answerWordMatch[1];
    }

    console.warn(`AI返回不规范答案: "${rawAnswer}"，已Fallback为"无关"`);
    return '无关';
  });

  res.json({
    success: true,
    data: { answer },
    requestId: req.requestId
  });
}));

// AI Generate endpoint
/**
 * @swagger
 * /api/v1/ai/generate:
 *   post:
 *     summary: AI 故事生成
 *     description: 根据关键词生成海龟汤故事
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - keywords
 *             properties:
 *               keywords:
 *                 type: array
 *                 minItems: 3
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 description: 生成故事的关键词（3-10个）
 *                 example: ["医院", "死亡", "秘密"]
 *     responses:
 *       200:
 *         description: 生成的故事
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 服务器错误
 */
app.post(`${API_PREFIX}/ai/generate`, aiRateLimiter, validateBody(aiGenerateSchema), asyncHandler(async (req, res) => {
  const { keywords } = req.body;

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: '服务器未配置 API Key',
      code: 'AI_SERVICE_ERROR',
      requestId: req.requestId
    });
  }

  const prompt = `【角色】你是一个资深的"海龟汤推理游戏"出题专家。

【任务】根据用户提供的3个关键词，生成一个逻辑自洽、悬疑性强的海龟汤故事。

【输出格式 - 严格JSON】
只输出有效JSON，禁止任何解释文字：
{
  "title": "标题（2-20字）",
  "surface": "汤面（50-150字，悬疑/荒诞背景）",
  "bottom": "汤底（50-150字，核心反转，逻辑自洽）",
  "difficulty": 难度数值（1=简单，2=容易，3=中等，4=困难，5=地狱）,
  "tags": ["标签1", "标签2"]
}

【约束】
❌ 禁止输出JSON以外的任何内容
❌ 禁止在title中透露汤底信息
❌ 汤底必须能通过"是/否/无关"穷尽

关键词：${keywords.join('、')}

请生成故事：`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response;
  try {
    response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.8
      }),
      signal: controller.signal
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error: '生成超时，请重试',
        code: 'TIMEOUT',
        requestId: req.requestId
      });
    }
    throw e;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error('AI API error');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';

  // Parse JSON response with multiple fallback strategies
  let parsed = null;
  const errors = [];

  // Strategy 1: Direct JSON parse
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    errors.push(`direct: ${e.message}`);
  }

  // Strategy 2: Extract JSON from markdown code blocks
  if (!parsed) {
    try {
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        parsed = JSON.parse(codeBlockMatch[1].trim());
      }
    } catch (e) {
      errors.push(`codeblock: ${e.message}`);
    }
  }

  // Strategy 3: Extract the last complete JSON object (greedy — fixes non-greedy bug)
  if (!parsed) {
    try {
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        parsed = JSON.parse(objectMatch[0]);
      }
    } catch (e) {
      errors.push(`object: ${e.message}`);
    }
  }

  if (parsed) {
    return res.json({
      success: true,
      data: {
        title: parsed.title || '无标题',
        surface: parsed.surface || '',
        bottom: parsed.bottom || '',
        difficulty: Math.min(5, Math.max(1, parsed.difficulty || 3)),
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['脑洞']
      },
      requestId: req.requestId
    });
  }

  // All parsing strategies failed
  console.error(`[AI Generate] Failed to parse response. Content preview: "${content.substring(0, 200)}...". Errors: ${errors.join('; ')}`);
  return res.status(500).json({
    success: false,
    error: '解析AI响应失败，请重试',
    code: 'AI_SERVICE_ERROR',
    requestId: req.requestId
  });
}));

// Auth routes with API versioning
app.use(`${API_PREFIX}/auth`, authRoutes);

// Friends routes with API versioning
app.use(`${API_PREFIX}/friends`, friendsRoutes);

// Leaderboard routes with API versioning
app.use(`${API_PREFIX}/leaderboard`, leaderboardRoutes);

// Stories routes (MongoDB backed) — gracefully skip if MongoDB unavailable
if (storiesRoutes) {
  app.use(`${API_PREFIX}/stories`, storiesRoutes);
}

// Contributions routes (submission and review) - mounted on different path
app.use(`${API_PREFIX}/contributions`, contributionsRoutes);

// Achievements routes (后端验证)
app.use(`${API_PREFIX}/achievements`, achievementsRoutes);

// Comments routes
app.use(`${API_PREFIX}/comments`, commentsRoutes);

// Notifications routes
app.use(`${API_PREFIX}/notifications`, notificationsRoutes);

// Daily Challenge routes
app.use(`${API_PREFIX}/daily-challenge`, dailyChallengeRoutes);

// Swagger 配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI 海龟汤游戏 API',
      version: '1.1.0',
      description: 'AI 海龟汤推理游戏的 RESTful API 文档',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: '开发环境服务器'
      },
      {
        url: 'https://api.example.com',
        description: '生产环境服务器'
      }
    ],
    tags: [
      { name: '认证', description: '用户注册、登录、登出' },
      { name: '好友', description: '好友关系管理' },
      { name: '排行榜', description: '游戏排行榜' },
      { name: 'AI', description: 'AI 游戏接口' },
      { name: '游戏', description: '游戏大厅 Socket.IO' }
    ]
  },
  apis: ['./routes/*.js', './index.js']
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// 404 处理
app.use(notFoundHandler)

// 全局错误处理（必须放在最后）
app.use(errorHandler)

// Setup Socket.IO handlers
setupGameHandlers(io);
setupFriendHandlers(io);
setupNotificationHandlers(io);

// Initialize MongoDB connection with fallback
async function initializeMongoDB() {
  if (!process.env.MONGODB_URI) {
    console.log('[MongoDB] MONGODB_URI not configured, using static data fallback');
    mongoAvailable = false;
    return;
  }

  try {
    await connectDB();
    mongoAvailable = true;

    // Subscribe to connection changes
    onConnectionChange((status) => {
      console.log(`[MongoDB] Status changed: ${status.state}`);
      mongoAvailable = status.isConnected;
    });

    console.log('[MongoDB] Initialization complete');
  } catch (error) {
    console.warn('[MongoDB] Failed to connect, falling back to static data:', error.message);
    mongoAvailable = false;
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  console.log(`\n[Server] Received ${signal}, starting graceful shutdown...`);

  try {
    // Clean up rate limiter intervals
    cleanupRateLimiter();

    // Close MongoDB connection — use strict true check (null=initializing, false=unavailable)
    if (mongoAvailable === true) {
      await disconnectDB();
    }

    // Close HTTP server
    await new Promise((resolve) => {
      httpServer.close(resolve);
    });

    console.log('[Server] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Server] Shutdown error:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
httpServer.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API version: ${API_VERSION}`);
  console.log(`API 文档: http://localhost:${PORT}/api/docs`);
  console.log(`Socket.IO ready for connections`);

  // Initialize MongoDB after server starts
  await initializeMongoDB();

  if (mongoAvailable === true) {
    console.log('[Server] Running with MongoDB support');
    const status = getConnectionStatus();
    console.log(`[MongoDB] Connection state: ${status.state}`);
  } else {
    console.log('[Server] Running with static data fallback (MongoDB unavailable)');
  }
});
