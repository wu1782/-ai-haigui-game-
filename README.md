# AI 海龟汤游戏

基于 AI 的海龟汤推理游戏，玩家通过提出只能回答"是"、"否"或"无关"的问题，逐步还原故事真相。

## 功能特性

- **AI 智能裁判**：DeepSeek API 驱动，精准判定玩家提问
- **单人模式**：50+ 精心设计的推理故事
- **AI 生成故事**：输入 3 个关键词，AI 实时生成原创故事
- **私人录入**：创建自定义故事并分享链接
- **多人对战**：Socket.IO 实时多人房间对战
- **好友系统**：添加好友、私聊、对战邀请
- **排行榜**：最快推理、提问最少、连胜王等维度
- **成就系统**：解锁各种游戏成就
- **每日挑战**：每日特殊任务，获取额外奖励
- **游戏回放**：保存并回放精彩对局

## 技术栈

### 前端
- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS
- React Router DOM
- Socket.IO Client
- Axios

### 后端
- Node.js + Express
- Socket.IO (实时通信)
- DeepSeek API (AI 判定)
- SQLite (用户数据)
- Redis (缓存)
- MongoDB (可选，故事数据)
- JWT + bcrypt (认证)

## 项目结构

```
├── src/                      # 前端源码
│   ├── api.ts               # AI API 调用
│   ├── components/           # React 组件
│   ├── context/             # React Context
│   ├── data/                # 本地数据管理
│   ├── hooks/               # 自定义 Hooks
│   ├── pages/               # 页面组件
│   ├── services/            # API 服务
│   ├── types/               # TypeScript 类型
│   └── utils/               # 工具函数
├── server/                   # 后端源码
│   ├── db/                  # 数据库
│   ├── middleware/          # Express 中间件
│   ├── routes/              # API 路由
│   ├── services/            # 业务逻辑
│   ├── socket/              # Socket.IO 处理
│   └── index.js            # 服务器入口
└── index.html              # 前端入口
```

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装

```bash
# 安装前端依赖
npm install

# 安装后端依赖（自动执行）
npm run postinstall
```

### 配置

创建 `server/.env` 文件：

```env
PORT=3001
JWT_SECRET=your_jwt_secret_here
DEEPSEEK_API_KEY=your_deepseek_api_key
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 运行

```bash
# 开发模式（前端）
npm run dev

# 启动后端
npm run start

# 或一键启动（需要 concurrently）
```

### 生产构建

```bash
npm run build
```

## API 接口

### 认证接口
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/logout | 用户登出 |
| GET | /api/auth/me | 获取当前用户 |
| PUT | /api/auth/profile | 更新用户资料 |
| PUT | /api/auth/stats | 更新用户统计 |

### 游戏接口
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/ai/judge | AI 问题判定 |
| POST | /api/ai/hint | AI 提示获取 |
| POST | /api/ai/generate | AI 生成故事 |

### 社交接口
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/friends | 获取好友列表 |
| GET | /api/friends/requests | 获取好友请求 |
| GET | /api/friends/search | 搜索用户 |
| POST | /api/friends/request | 发送好友请求 |

### 排行榜接口
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/leaderboard | 获取排行榜 |
| GET | /api/leaderboard/rank/:userId | 获取用户排名 |
| POST | /api/leaderboard | 更新排行榜 |

### Socket.IO 事件

**房间事件**
- `create-room` - 创建房间
- `join-room` - 加入房间
- `leave-room` - 离开房间
- `toggle-ready` - 切换准备状态
- `start-game` - 开始游戏

**游戏事件**
- `ask-question` - 提问
- `guess-answer` - 猜答案
- `answer-question` - 回答问题
- `game-over` - 游戏结束

**好友事件**
- `private-message` - 发送私信
- `get-private-history` - 获取聊天历史

## 游戏规则

1. 每轮只能提问可以用「是」「否」或「无关」回答的问题
2. AI 将根据汤底进行判断，回答「是」「否」或「无关」
3. 尽可能用最少的提问次数还原真相
4. 当你认为已经还原真相时，可以选择「猜答案」

## 部署

### 前端部署 (Vercel)
```bash
npm run build
```

### 后端部署 (Railway/Render)
```bash
cd server
npm start
```

### Docker 部署
```dockerfile
# Dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 环境变量说明

| 变量名 | 必需 | 说明 |
|--------|------|------|
| PORT | 否 | 服务器端口，默认 3001 |
| JWT_SECRET | 是 | JWT 密钥，用于用户认证 |
| DEEPSEEK_API_KEY | 是 | DeepSeek API 密钥 |
| REDIS_URL | 否 | Redis 连接 URL |
| CORS_ORIGINS | 否 | CORS 允许的 origins |

## License

MIT
