import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { setupGameHandlers } from './socket/gameHandler.js';
import authRoutes from './routes/auth.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { aiRateLimiter } from './middleware/rateLimiter.js';
import { getCachedAIJudgment } from './middleware/cacheLimiter.js';
import { getStoryById as getStoryByIdService } from './services/storyService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server and Socket.IO server
const httpServer = createServer(app);
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    credentials: true
  }
});

// CORS configuration
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(cookieParser()); // 支持 cookie 解析
app.use(requestLogger);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from Express server!', status: 'ok' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Test database connection
import userDb from './db/sqlite.js'
import friendsDb from './db/friends.js'

app.get('/api/test-db', (req, res) => {
  try {
    // 尝试查询users表
    let userCount = { count: 0 }
    try {
      userCount = userDb.prepare('SELECT COUNT(*) as count FROM users').get()
    } catch (e) {
      console.error('users table error:', e.message)
    }

    // 尝试查询friendships表
    let friendCount = { count: 0 }
    try {
      friendCount = friendsDb.prepare('SELECT COUNT(*) as count FROM friendships').get()
    } catch (e) {
      console.error('friendships table error:', e.message)
    }

    // 尝试查询friend_requests表
    let requestCount = { count: 0 }
    try {
      requestCount = friendsDb.prepare('SELECT COUNT(*) as count FROM friend_requests').get()
    } catch (e) {
      console.error('friend_requests table error:', e.message)
    }

    res.json({
      success: true,
      users: userCount,
      friendships: friendCount,
      friendRequests: requestCount
    })
  } catch (error) {
    console.error('Test-db error:', error)
    res.status(500).json({ error: error.message })
  }
});

// Root endpoint - API info
app.get('/', (req, res) => {
  res.json({
    name: 'AI 海龟汤游戏服务器',
    version: '1.1.0',
    endpoints: {
      'GET /': '服务信息',
      'GET /api/test': '测试接口',
      'GET /api/health': '健康检查',
      'POST /api/chat': 'AI 对话 (旧版)',
      'POST /api/ai/judge': 'AI 判定问题 (新版)',
      'POST /api/ai/generate': 'AI 生成故事'
    },
    rateLimits: {
      'ai': '30次/分钟',
      'auth': '10次/5分钟'
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
app.post('/api/ai/hint', aiRateLimiter, async (req, res) => {
  const { story, messages } = req.body;

  if (!story || typeof story.surface !== 'string') {
    return res.status(400).json({ error: 'story 参数缺失或格式错误' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '服务器未配置 API Key' });
  }

  try {
    // 构建对话历史
    const historyText = Array.isArray(messages) && messages.length > 0
      ? messages.map((m, i) => `Q${i + 1}: ${m.question || m.content || ''}\nA${i + 1}: ${m.answer || ''}`).join('\n')
      : '暂无'

    const prompt = `你是"海龟汤"推理游戏的AI助手。

【游戏背景】
汤面：${story.surface}
汤底：${story.bottom || '未知'}

【当前游戏状态】
玩家已问过的问题和回答：
${historyText}

【任务】
请分析当前游戏状态，给玩家一个方向性的提示，帮助他们继续推理。
要求：
1. 不要透露答案
2. 只给出思考方向（1-2句话）
3. 语言简洁，适合游戏提示`;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
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
      })
    });

    if (!response.ok) {
      throw new Error('AI API error');
    }

    const data = await response.json();
    const hint = data.choices?.[0]?.message?.content?.trim() || '暂时无法获取提示';

    res.json({ hint, dimension: '综合分析' });
  } catch (error) {
    console.error('AI Hint error:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

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
故事背景：${story.background || '未知'}
汤底：${story.answer || '未知'}

玩家问题：${question}

请判断并回答（只输出一个词）：`;

    // 调用 DeepSeek API
    const response = await fetch('https://api.deepseek.com/chat/completions', {
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
      })
    });

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
app.post('/api/ai/judge', aiRateLimiter, async (req, res) => {
  const { question, storyId } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question 参数缺失' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '服务器未配置 API Key' });
  }

  if (!storyId) {
    return res.status(400).json({ error: 'storyId 参数缺失' });
  }

  try {
    const story = await getStoryByIdService(storyId);
    if (!story) {
      return res.status(404).json({ error: '故事不存在' });
    }

    // 使用缓存的AI判定（减少API调用）
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
   - 例：汤底"凶手是哥哥"，问"凶手是家人吗"→ 是

2. "否"的条件：
   - 问题与汤底事实直接矛盾
   - 例：汤底"凶手是哥哥"，问"凶手是女性吗"→ 否

3. "无关"的条件：
   - 问题涉及汤底未提及的信息
   - 问题无法用是/否回答
   - 例：汤底"凶手是哥哥"，问"哥哥和弟弟感情好吗"→ 无关

4. "已破案"的条件：
   - 玩家完整准确地说出汤底真相
   - 允许语义等价的核心表述

【当前故事】
汤面：${story.surface}
汤底：${story.bottom}

【示例】
示例1：
  汤底：男人在海中溺水死亡，身上有刀伤
  问题："他是被谋杀的？"
  回答：是

示例2：
  汤底：男人在海中溺水死亡，身上有刀伤
  问题："他是自杀的？"
  回答：否

示例3：
  汤底：男人在海中溺水死亡，身上有刀伤
  问题："他有多少钱？"
  回答：无关

示例4：
  汤底：男人在海中溺水死亡，身上有刀伤
  问题："他在海中因刀伤导致失血过多而溺亡？"
  回答：是

示例5：
  汤底：男人在海中溺水死亡，身上有刀伤
  问题："男人在海中溺水死亡，身上有刀伤，是被谋杀的？"
  回答：已破案

【输出要求】
- 只输出一个词："是"、"否"、"无关"或"已破案"
- 禁止输出任何其他内容
- 禁止添加标点符号或解释

玩家问题：${question}

回答：`;

      const response = await fetch('https://api.deepseek.com/chat/completions', {
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
        })
      });

      if (!response.ok) {
        throw new Error('AI API error');
      }

      const data = await response.json();
      const rawAnswer = data.choices?.[0]?.message?.content?.trim() || '';

      // 验证答案是否规范
      const validAnswers = ['是', '否', '无关', '已破案'];
      const normalizedAnswer = rawAnswer.replace(/[。！？，,.!?…~$%^&*()（）]/g, '').trim();

      if (validAnswers.includes(normalizedAnswer)) {
        return normalizedAnswer;
      }

      // Fallback：如果AI回答不规范，尝试从回答中提取关键词
      if (rawAnswer.includes('是') && !rawAnswer.includes('否') && !rawAnswer.includes('无关')) {
        return '是';
      }
      if (rawAnswer.includes('否') && !rawAnswer.includes('是')) {
        return '否';
      }
      if (rawAnswer.includes('无关') || rawAnswer.includes('无法判断') || rawAnswer.includes('无法确定')) {
        return '无关';
      }
      if (rawAnswer.includes('已破案') || rawAnswer.includes('正确') || rawAnswer.includes('猜对了')) {
        return '已破案';
      }

      // 最终fallback：默认返回"无关"
      console.warn(`AI返回不规范答案: "${rawAnswer}"，已Fallback为"无关"`);
      return '无关';
    });

    res.json({ answer });
  } catch (error) {
    console.error('AI Judge error:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// AI Generate endpoint
app.post('/api/ai/generate', aiRateLimiter, async (req, res) => {
  const { keywords } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length < 3) {
    return res.status(400).json({ error: '需要至少3个关键词' });
  }

  // 验证每个关键词的类型和长度
  for (const kw of keywords) {
    if (typeof kw !== 'string' || kw.length > 50) {
      return res.status(400).json({ error: '关键词格式错误或过长（最多50字符）' });
    }
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '服务器未配置 API Key' });
  }

  try {
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

    const response = await fetch('https://api.deepseek.com/chat/completions', {
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
      })
    });

    if (!response.ok) {
      throw new Error('AI API error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    // 解析JSON响应
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        res.json({
          title: parsed.title || '无标题',
          surface: parsed.surface || '',
          bottom: parsed.bottom || '',
          difficulty: Math.min(5, Math.max(1, parsed.difficulty || 3)),
          tags: Array.isArray(parsed.tags) ? parsed.tags : ['脑洞']
        });
      } else {
        res.status(500).json({ error: 'AI返回格式错误' });
      }
    } catch (e) {
      console.error('Parse error:', e);
      res.status(500).json({ error: '解析AI响应失败' });
    }
  } catch (error) {
    console.error('AI Generate error:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 故事服务已通过 import { getStoryById as getStoryByIdService, ... } 引入

// Auth routes
app.use('/api/auth', authRoutes);

// Friends routes
import friendsRoutes from './routes/friends.js';
app.use('/api/friends', friendsRoutes);

// Leaderboard routes
import leaderboardRoutes from './routes/leaderboard.js';
app.use('/api/leaderboard', leaderboardRoutes);

// Swagger 配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI 海龟汤游戏 API',
      version: '1.0.0',
      description: 'AI 海龟汤推理游戏的 RESTful API 文档'
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: '开发环境服务器'
      }
    ],
    tags: [
      { name: '认证', description: '用户注册和登录' },
      { name: '游戏', description: '游戏相关接口' }
    ]
  },
  apis: ['./routes/*.js']
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// 404 处理
app.use(notFoundHandler)

// 全局错误处理（必须放在最后）
app.use(errorHandler)

// Setup Socket.IO handlers
setupGameHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API 文档: http://localhost:${PORT}/api/docs`);
  console.log(`Socket.IO ready for connections`);
});
