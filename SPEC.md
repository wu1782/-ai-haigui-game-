# AI 海龟汤游戏 - 项目规范文档

## 1. 项目概述

### 项目名称
AI 海龟汤游戏 (AI Turtle Soup)

### 项目类型
全栈 Web 游戏应用 - 推理社交游戏

### 核心功能
玩家通过只能回答"是"、"否"或"无关"的问题来推理海龟汤故事的真相。

### 目标用户
- 推理游戏爱好者
- 休闲玩家
- 朋友聚会场景

## 2. 技术架构

### 前端技术栈
- React 18 + TypeScript
- Vite (构建工具)
- Tailwind CSS (样式)
- React Router DOM (路由)
- Socket.IO Client (实时通信)
- Axios (HTTP客户端)

### 后端技术栈
- Node.js + Express
- Socket.IO (实时通信)
- DeepSeek API (AI判定)
- SQLite (用户数据)
- Redis (缓存，可选)
- MongoDB (故事数据，可选)
- JWT + bcrypt (认证)

### 架构模式
- 前后端分离
- RESTful API + WebSocket 混合
- JWT/Cookie 双模式认证

## 3. 功能模块

### 3.1 认证系统
- [x] 用户注册 (用户名/邮箱/密码)
- [x] 用户登录
- [x] JWT Token 认证
- [x] Cookie 自动登录
- [x] 用户资料更新
- [x] 退出登录

### 3.2 单人游戏
- [x] 故事列表 (筛选/排序)
- [x] AI 提问判断
- [x] AI 提示系统
- [x] 猜答案
- [x] 游戏结果页
- [x] 游戏回放
- [x] 每日挑战 *(服务端统一管理，防伪造)*

**每日挑战规则**：
- 重置时间: UTC 0 点（次日 00:00 UTC 自动重置）
- 挑战次数: 每天 1 次（开始挑战即消耗次数）
- 完成条件: 20题内猜出答案
- 挑战失败/放弃/超时 = 不返还次数，次日重置
- 胜利奖励: 2倍积分 (bonusMultiplier = 2.0)
- 服务端校验: `verifyDailyChallenge(odId, { won, questionCount })`

### 3.3 AI 生成
- [x] 关键词生成故事
- [x] DeepSeek API 集成
- [x] 自定义故事私人录入

### 3.4 多人游戏
- [x] 创建房间
- [x] 加入房间
- [x] 玩家准备状态
- [x] 回合制提问
- [x] Socket.IO 实时同步

### 3.5 社交系统
- [x] 好友列表
- [x] 好友请求
- [x] 用户搜索
- [x] 私聊功能
- [x] 对战邀请

### 3.6 成就系统
- [x] 胜利成就 (初露锋芒/小有成就/推理大师)
- [x] 连胜成就 (三连胜/五福临门)
- [x] 难度成就 (入门/中等/困难/极难通关)
- [x] 游戏次数成就
- [x] 完美破案成就

### 3.7 排行榜
- [x] 最快推理时间
- [x] 最少提问次数
- [x] 用户排名查询

### 3.8 评论系统
- [x] 故事评分 (难度/有趣度)
- [x] 评论列表
- [x] 评论点赞
- [x] 评论时间显示

### 3.9 投稿审核系统
- [x] 用户投稿 (Contribute.tsx)
- [x] 投稿状态查询 (pending/approved/rejected)
- [x] 管理员审核页面 (AdminReview.tsx)
- [x] 故事批准上架
- [x] 故事拒绝 (需填写原因)
- [x] 审核统计面板
- [x] 角色权限控制 (user/admin)

## 4. 数据库设计

### SQLite 表 *(只用于用户认证，不与 MongoDB 双写)*
```sql
-- 用户表
users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  stats TEXT (JSON),
  avatar TEXT,
  createdAt TEXT
)

-- 排行榜表
leaderboard (
  id TEXT PRIMARY KEY,
  userId TEXT,
  entryType TEXT,
  value REAL,
  storyId TEXT,
  createdAt TEXT
)
```

### MongoDB 集合 *(Stories、Users 副本、Friendships、Achievements)*
```javascript
// 故事集合
Story {
  _id: ObjectId,
  title: String,
  surface: String,
  bottom: String,
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme',
  starLevel: Number,
  keywords: [String],
  tags: [String],
  hint: String,
  hotScore: Number,
  playCount: Number,
  isAiGenerated: Boolean,
  creatorId: String,
  status: 'pending' | 'approved' | 'rejected',
  contributorId: String,
  reviewInfo: {
    reviewedBy: String,
    reviewedAt: Date,
    rejectionReason: String
  },
  createdAt: Date
}

// 用户集合 (包含 role, friends, achievements 等扩展信息)
User {
  _id: ObjectId,
  odId: String,          // 对应 SQLite users.id
  username: String,
  email: String,
  role: 'user' | 'admin',
  friends: [String],      // 好友 odId 列表
  achievements: [{
    id: String,
    unlockedAt: Date
  }],
  stats: {
    totalGames: Number,
    wins: Number,
    currentStreak: Number,
    bestStreak: Number,
    ...
  }
}

// 好友关系
Friendship {
  _id: ObjectId,
  fromUserId: String,     // 发起者 odId
  toUserId: String,       // 接收者 odId
  status: 'pending' | 'accepted' | 'rejected',
  createdAt: Date
}

// 成就解锁记录 (后端验证，防伪造)
Achievement {
  _id: ObjectId,
  odId: String,           // 用户 odId
  achievementId: String,
  storyId: String,       // 解锁该成就对应的游戏故事
  unlockedAt: Date
}

// 私信记录
Message {
  _id: ObjectId,
  fromUserId: String,
  toUserId: String,
  content: String,
  isRead: Boolean,
  createdAt: Date
}

// 评论记录
Comment {
  _id: ObjectId,
  odId: String,
  username: String,
  avatar: String,
  storyId: ObjectId,
  content: String,
  likes: Number,
  likedBy: [String],
  isEdited: Boolean,
  editedAt: Date,
  createdAt: Date
}

// 通知记录
Notification {
  _id: ObjectId,
  odId: String,
  type: 'system'|'review_approved'|'review_rejected'|'friend_request'|'friend_accepted'|'achievement'|'challenge',
  title: String,
  content: String,
  isRead: Boolean,
  data: Mixed,
  expiresAt: Date,  // TTL索引永不过期为null
  createdAt: Date
}
```

### Redis 缓存策略 *(明确的 Key 规范和 TTL)*
```
# AI 响应缓存 (降低 DeepSeek API 成本)
AI:response:{storyId}:{md5(question)} -> answer  TTL: 1小时

# 排行榜缓存 (避免频繁查询)
leaderboard:{type}:{period} -> JSON  TTL: 5分钟
(period: all/week/month)

# 用户 AI 配额计数 (防刷API)
AI:quota:{odId}:{YYYYMMDD} -> count  TTL: 24小时
(每日500次上限)

# Socket.IO 房间状态 (内存，进程重启消失，依赖 roomManager.js)
# 不使用 Redis 存储房间状态
```

## 5. API 接口文档

### 认证接口
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录(含登录锁定: 5次失败锁15分钟) |
| POST | /api/auth/logout | 退出登录 |
| POST | /api/auth/refresh *(新)* | 刷新 access token |
| GET | /api/auth/me | 获取当前用户 |
| PUT | /api/auth/profile | 更新用户资料 |
| PUT | /api/auth/stats | 更新用户统计 |
| POST | /api/auth/verify *(新)* | 验证邮箱 Token |
| POST | /api/auth/send-verify-email *(新)* | 重新发送验证邮件 |
| POST | /api/auth/forgot-password *(新)* | 发送密码重置邮件 |
| POST | /api/auth/reset-password *(新)* | 使用 Token 重置密码 |
| GET | /api/auth/sessions *(新)* | 获取登录设备列表 |
| DELETE | /api/auth/sessions/:sessionId *(新)* | 登出指定设备 |
| DELETE | /api/auth/sessions *(新)* | 登出所有/其他设备 |

### AI 接口
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/ai/judge | AI 问题判定 |
| POST | /api/ai/hint | AI 提示生成 |
| POST | /api/ai/generate | AI 故事生成 |

### 社交接口
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/friends | 获取好友列表 |
| GET | /api/friends/requests | 获取好友请求 |
| GET | /api/friends/search | 搜索用户 |
| POST | /api/friends/request | 发送好友请求 |
| PUT | /api/friends/request/:id | 处理好友请求 |
| POST | /api/friends/block/:friendId *(新)* | 拉黑用户(同时删除好友关系) |
| DELETE | /api/friends/block/:friendId *(新)* | 取消拉黑 |
| GET | /api/friends/blocked *(新)* | 获取已拉黑用户列表 |
| GET | /api/friends/blocked/:userId *(新)* | 检查是否拉黑某用户 |

### 排行榜接口
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/leaderboard | 获取排行榜(支持period: all/week/month) |
| GET | /api/leaderboard/rank/:userId | 获取用户排名(含历史最高bestRank) |
| POST | /api/leaderboard | 更新排行榜(自动记录历史最高rank) |

### 投稿接口
| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | /api/stories/contribute | 用户投稿(封禁检查) | user |
| GET | /api/stories/my-contributions | 我的投稿列表 | user |
| PUT | /api/stories/:id/resubmit *(新)* | 被拒稿修改重提(限3次) | user |
| GET | /api/stories/pending | 待审核列表 | admin |
| GET | /api/stories/review/:status | 按状态获取审核列表 | admin |
| GET | /api/stories/review/detail/:id | 故事详情(审核) | admin |
| PUT | /api/stories/:id/review | 审核故事(自动记录拒稿次数) | admin |
| GET | /api/stories/stats | 审核统计数据 | admin |

**投稿规则**：
- 故事字数: 汤面10-500字，汤底10-1000字
- 被拒稿: 可修改内容重提（限3次）
- 累计被拒5次: 禁止投稿30天
- 72小时未审核: 后台日志提醒管理员

### 成就接口 *(后端验证)*
| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /api/achievements | 获取用户成就列表 | user |
| POST | /api/achievements/unlock | 游戏结束解锁成就 | user |

### 评论接口 *(新增 CRUD)*
| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /api/comments/story/:storyId | 获取故事评论列表 | - |
| POST | /api/comments | 发表评论 | user |
| PUT | /api/comments/:id | 编辑评论(30分钟内) | user |
| DELETE | /api/comments/:id | 删除评论 | user/admin |
| POST | /api/comments/:id/like | 点赞 | user |
| DELETE | /api/comments/:id/like | 取消点赞 | user |

### 通知接口 *(新增站内通知)*
| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /api/notifications | 获取通知列表(分页) | user |
| GET | /api/notifications/unread-count | 获取未读数量 | user |
| PUT | /api/notifications/:id/read | 标记已读 | user |
| PUT | /api/notifications/read-all | 全部标记已读 | user |
| DELETE | /api/notifications/:id | 删除通知 | user |

**通知类型**: system / review_approved / review_rejected / friend_request / friend_accepted / achievement / challenge
**过期机制**: TTL 索引自动删除（expiresAt 字段支持）

### 每日挑战接口 *(新增)*
| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /api/daily-challenge | 获取今日挑战信息 | user |
| POST | /api/daily-challenge/start | 开始挑战 | user |
| POST | /api/daily-challenge/complete | 挑战完成回调 | user |

**每日挑战规则**：
- 重置时间: UTC 0 点
- 挑战次数: 每天 1 次
- 完成条件: 20题内猜出答案
- 奖励: 胜利后获得 2倍积分

### Socket.IO 事件

> ⚠️ **文档与代码同步说明**：以下为完整事件列表，包含代码中已实现但旧文档未列出的事件。

**房间事件**
| 事件 | 描述 | 回调格式 |
|------|------|----------|
| create-room | 创建房间 | `callback({ success, room })` |
| join-room | 加入房间 | `callback({ success, room })` |
| leave-room | 离开房间 | - |
| toggle-ready | 切换准备状态 | `callback({ success })` |
| start-game | 开始游戏(仅房主) | `callback({ success })` |
| get-room-list | 获取房间列表 | `callback({ success, rooms })` |
| player-joined *(补)* | 其他玩家加入房间 | `io.to(roomId).emit('player-joined', { player, playerCount, players })` |
| player-left *(补)* | 其他玩家离开房间 | `io.to(roomId).emit('player-left', { playerId, playerCount, players, newHostId })` |
| player-ready *(补)* | 玩家准备状态变化 | `io.to(roomId).emit('player-ready', { playerId, ready, players })` |
| game-started *(补)* | 游戏正式开始 | `io.to(roomId).emit('game-started', { story, currentPlayer, players })` |
| room-chat *(补)* | 发送房间聊天消息 | `callback({ success })` |
| room-message *(补)* | 房间消息广播 | `io.to(roomId).emit('room-message', { id, playerId, playerName, content, timestamp })` |

**游戏事件**
| 事件 | 描述 | 回调/广播格式 |
|------|------|---------------|
| ask-question | 提问(需在己方回合) | `callback({ success, answer, isVictory })` |
| guess-answer | 猜答案 | `callback({ success, answer, isVictory })` |
| skip-question *(新)* | 跳过当前问题 | `callback({ success })` + `io.to(roomId).emit('question-skipped', { skippedBy, reason, currentPlayer, players })` |
| abandon-game *(新)* | 放弃游戏(认输) | `callback({ success })` + `game-over` |
| answer-question *(补)* | 问题回答广播(非己方回合) | `io.to(roomId).emit('answer-question', { question, answer, isVictory, currentPlayer, players })` |
| question-skipped *(新)* | 问题跳过广播 | `io.to(roomId).emit('question-skipped', { skippedBy, reason, currentPlayer, players })` |
| turn-state *(补)* | 当前回合状态(玩家变更/计时) | `io.to(roomId).emit('turn-state', { currentPlayer, remainingSeconds, players })` |
| turn-timeout *(补)* | 回合超时(玩家被跳过) | `io.to(roomId).emit('turn-timeout', { playerId, playerName, nextPlayer })` |
| game-over | 游戏结束 | `io.to(roomId).emit('game-over', { winner, story, totalQuestions, players })` |

**好友私聊事件**
| 事件 | 描述 | 回调格式 |
|------|------|----------|
| private-message | 发送私信 | `callback({ success, messageId, createdAt })` |
| recall-message *(补)* | 撤回私信(60秒内) | `callback({ success })` |
| get-private-history | 获取聊天历史 | `callback({ success, messages })` |
| mark-private-read *(补)* | 标记消息已读 | `callback({ success, markedCount })` |
| get-unread-private-count *(补)* | 获取未读消息数 | `callback({ success, count })` |
| bind-user *(补)* | 绑定用户到socket | `callback({ success })` |
| unbind-user *(补)* | 解绑用户 | `callback({ success })` |
| message-recalled *(补)* | 对方撤回消息通知 | `io.to('user:odId').emit('message-recalled', { messageId, recalledBy })` |
| messages-read *(补)* | 消息已读通知 | `io.to('user:odId').emit('messages-read', { byOdId, count })` |

**对战邀请事件** *(补)*
| 事件 | 描述 | 回调/广播格式 |
|------|------|---------------|
| create-challenge-room | 创建对战房间 | `callback({ success, room })` |
| join-challenge-room | 加入对战房间 | `callback({ success, room })` |
| send-challenge-invite | 发送挑战邀请 | `callback({ success })` |
| accept-challenge | 接受挑战 | `io.to(roomId).emit('challenge-accepted', { room })` |
| reject-challenge | 拒绝挑战 | `io.to(fromUserId).emit('challenge-rejected', { roomId })` |

**系统事件**
| 事件 | 描述 | 回调/广播格式 |
|------|------|---------------|
| achievement-unlocked *(补)* | 成就解锁通知 | `io.to(socketId).emit('achievement-unlocked', { achievements: [id1, id2] })` |
| reconnect *(补)* | 断线重连恢复 | `callback({ success, room })` |
| player-disconnected *(补)* | 玩家断线(60秒可重连) | `io.to(roomId).emit('player-disconnected', { playerId, playerName, reconnectable, reconnectDeadline })` |
| player-reconnected *(补)* | 玩家重连成功 | `io.to(roomId).emit('player-reconnected', { playerId, playerName, players })` |
| bind-notifications *(补)* | 订阅通知频道 | `callback({ success })` |
| notification *(补)* | 新通知推送 | `io.to('notifications:odId').emit('notification', { id, type, title, content, data, createdAt })` |

## 6. 前端路由

| 路径 | 组件 | 描述 |
|------|------|------|
| / | Home | 首页 |
| /auth | Auth | 登录/注册 |
| /game/:storyId | Game | 游戏页面 |
| /game/custom | Game | 自定义游戏 |
| /generate | Generate | AI生成 |
| /custom | Custom | 私人录入 |
| /friends | Friends | 好友管理 |
| /achievements | Achievements | 荣誉墙 |
| /leaderboard | Leaderboard | 排行榜 |
| /profile | Profile | 个人资料 |
| /result | Result | 游戏结果 |
| /contribute | Contribute | 故事投稿 |
| /admin/review | AdminReview | 审核管理 |

## 7. 组件结构

```
src/
├── components/
│   ├── AchievementBadge.tsx    # 成就徽章
│   ├── AchievementGrid.tsx     # 成就网格
│   ├── AchievementToast.tsx    # 成就通知 (待添加)
│   ├── Avatar.tsx             # 头像组件
│   ├── ChallengeModal.tsx      # 挑战弹窗
│   ├── CluePanel.tsx          # 线索面板
│   ├── CommentList.tsx         # 评论列表
│   ├── ConfirmModal.tsx        # 确认弹窗
│   ├── FriendChat.tsx          # 好友聊天
│   ├── FriendsDrawer.tsx       # 好友抽屉
│   ├── GameHeader.tsx         # 游戏头部
│   ├── Header.tsx             # 全局头部
│   ├── LoadingSpinner.tsx     # 加载中
│   ├── Message.tsx             # 消息气泡
│   ├── Modal.tsx               # 通用弹窗
│   ├── Navbar.tsx             # 导航栏
│   ├── PrivateRoute.tsx       # 私有路由
│   ├── QuestionInput.tsx       # 问题输入
│   ├── RatingStars.tsx         # 星级评分
│   ├── ShareCard.tsx          # 分享卡片
│   ├── SkeletonCard.tsx        # 骨架屏卡片
│   ├── StoryCard.tsx          # 故事卡片
│   └── Toast.tsx              # 提示消息
├── context/
│   ├── AuthContext.tsx        # 认证上下文
│   └── ToastContext.tsx       # 提示上下文
├── data/
│   ├── analytics.ts           # 分析数据 (待添加)
│   ├── dailyChallenge.ts      # 每日挑战
│   ├── leaderboard.ts         # 排行榜
│   ├── replays.ts             # 游戏回放
│   ├── stories.ts             # 故事数据
│   ├── storyComments.ts       # 故事评论
│   ├── storyRatings.ts        # 故事评分
│   └── userData.ts           # 用户数据
├── hooks/
│   ├── useAuth.ts             # 认证Hook
│   ├── useChat.ts             # 聊天Hook
│   ├── useGame.ts             # 游戏Hook
│   ├── useMultiplayer.ts      # 多人游戏Hook
│   ├── useSound.ts            # 音效Hook
│   ├── useTheme.ts            # 主题Hook
│   ├── useVoice.ts            # 语音输入 (待添加)
│   └── ...
├── pages/
│   ├── Achievements.tsx       # 荣誉墙
│   ├── Auth.tsx               # 登录注册
│   ├── Custom.tsx             # 私人录入
│   ├── Friends.tsx            # 好友页
│   ├── Game.tsx               # 游戏页
│   ├── Generate.tsx           # AI生成
│   ├── Home.tsx               # 首页
│   ├── Leaderboard.tsx        # 排行榜
│   ├── Profile.tsx            # 个人资料
│   └── Result.tsx             # 结果页
├── services/
│   ├── aiService.ts           # AI服务
│   ├── authService.ts         # 认证服务
│   ├── friendChatService.ts   # 聊天服务
│   ├── friendService.ts       # 好友服务
│   └── socketService.ts      # Socket服务
├── types/
│   ├── auth.ts               # 认证类型
│   ├── friend.ts             # 好友类型
│   ├── game.ts               # 游戏类型
│   ├── index.ts              # 导出
│   ├── leaderboard.ts        # 排行榜类型
│   ├── message.ts            # 消息类型
│   ├── story.ts              # 故事类型
│   └── user.ts               # 用户类型
└── utils/
    ├── shareUtils.ts         # 分享工具
    └── ...
```

## 8. 待完成功能

### 高优先级
- [x] 语音输入问题 (Web Speech API) - useVoice.ts + Game.tsx 集成
- [x] 骨架屏加载状态 - Skeletons.tsx 完整组件库
- [x] MongoDB 模型完整实现 (含 Achievement 成就记录表)
- [x] AI 每日配额限制 (500次/天)
- [x] 游戏计时机制 (120秒/题回合超时)
- [x] 断线重连 (60秒恢复窗口)

### 中优先级
- [x] 高级提示系统 (渐进式提示 - hintService.js)
- [x] 游戏数据分析 - useAnalytics hook (本地 localStorage)
- [x] Docker 容器化 - docker-compose.yml + Dockerfile.frontend + server/Dockerfile
- [x] CI/CD 自动化部署 - .github/workflows/ci-cd.yml
- [x] 成就后端验证 (已实现 gameHandler 集成)
- [x] Socket 事件文档补全
- [x] 评论 CRUD (编辑/删除/点赞)
- [x] 敏感词过滤 (全局工具)
- [x] 游戏计时机制 (120秒/题)
- [x] 房间内聊天 (room-chat)
- [x] 每日挑战规则明确 (服务端 dailyChallengeService.js)
- [x] 好友请求72小时失效 (自动清理)
- [x] 站内通知系统 (MongoDB + Socket.IO 实时推送)
- [x] 投稿规则完善 (被拒可重提3次/累计5次封禁30天/72h超时提醒)

### 低优先级
- [x] 成就解锁动画 - AchievementUnlockEffect 组件 (inline CSS 动画)
- [x] 高级音效系统 - Web Audio API 程序化音效 (useSound.ts)
- [x] 深色/浅色主题切换 - ThemeToggle 组件
- [x] PWA 支持 - manifest.json + sw.js (Service Worker)

## 9. 部署架构

```
                    ┌─────────────┐
                    │   Vercel    │
                    │  (Frontend) │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Railway   │
                    │  (Backend)  │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │   Redis    │  │  MongoDB   │  │  SQLite    │
    │  (Cache)   │  │  (Stories) │  │  (Users)   │
    └────────────┘  └────────────┘  └────────────┘
```

## 10. 环境变量

### 前端 (.env)
```
VITE_API_BASE_URL=https://api.example.com
VITE_API_KEY=your_api_key
```

### 后端 (.env)
```
PORT=3001
JWT_SECRET=your_jwt_secret
DEEPSEEK_API_KEY=your_deepseek_key
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
NODE_ENV=development
```
