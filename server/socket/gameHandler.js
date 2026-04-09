// 游戏处理器 - 处理 Socket.IO 事件

import { roomManager } from './roomManager.js'
import { filterSensitiveWords } from '../utils/sensitiveWords.js'
import { verifyToken } from '../middleware/auth.js'

// 发送游戏结束事件
async function emitGameOver(io, room, winnerId, winnerName, extra = {}) {
  room.setWinner(winnerId)

  // 停止所有计时器
  room.stopAllTimers()

  // 触发后端成就验证（异步，不阻塞事件广播）
  processGameAchievementsAfterGameEnd(io, room, winnerId).catch(err => {
    console.error('[Achievement] 后端成就验证失败:', err.message)
  })

  io.to(room.id).emit('game-over', {
    winner: { id: winnerId, name: winnerName, odId: room.getPlayer(winnerId)?.odId || null },
    story: room.story,
    totalQuestions: room.questionCount,
    players: room.getPlayerList(),
    ...extra
  })
}

// 游戏结束后处理成就解锁（后端验证）
async function processGameAchievementsAfterGameEnd(io, room, winnerId) {
  // 延迟导入避免循环依赖
  const { processGameAchievements } = await import('../services/achievementService.js').catch(() => null)
  if (!processGameAchievements) return

  const winnerOdId = room.getPlayer(winnerId)?.odId
  if (!winnerOdId) return

  const story = room.story || {}
  const questionCount = room.questionCount || 0

  try {
    const newlyUnlocked = await processGameAchievements(winnerOdId, {
      won: true,
      difficulty: story.difficulty || 'medium',
      questionCount,
      storyId: story.id || null,
      storyMongoId: story.mongoId || null
    })

    if (newlyUnlocked?.length > 0) {
      console.log(`[Achievement] User ${winnerOdId} unlocked: ${newlyUnlocked.join(', ')}`)
      // 通知玩家新成就（通过全局广播，仅自己可收到）
      io.to(winnerId).emit('achievement-unlocked', {
        achievements: newlyUnlocked
      })
    }
  } catch (err) {
    console.error('[Achievement] 解锁成就失败:', err.message)
  }
}

// 验证故事数据
function validateStory(story) {
  return story &&
    typeof story.id === 'string' &&
    typeof story.surface === 'string' &&
    typeof story.bottom === 'string'
}

// 获取 AI 回答
async function getAIAnswer(question, story) {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (!apiKey) {
    // 如果没有 API Key，使用模拟响应
    return simulateAnswer(question, story)
  }

  const prompt = `你是"海龟汤"推理游戏的裁判。

【游戏规则】
- 玩家通过提问（只能问是非题）来推理故事真相
- 你只能回答："是"、"不是"、"与此无关"、"已破案"
- 只能回答单个词语，不需要解释

【判断标准】
- "是"：玩家问题与汤底事实一致
- "不是"：玩家问题与汤底事实矛盾
- "与此无关"：无法根据汤底判断
- "已破案"：玩家猜出了完整的汤底真相

【当前故事】
故事背景：${story.surface}
汤底：${story.bottom}

玩家问题：${question}

请判断并回答（只输出一个词）：`

  try {
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
    })

    if (!response.ok) {
      throw new Error('AI API error')
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || '无法获取回答'
  } catch (error) {
    console.error('AI API error:', error)
    return simulateAnswer(question, story)
  }
}

// 模拟回答（开发阶段）
function simulateAnswer(question, story) {
  const rand = Math.random()
  if (rand < 0.25) return '是'
  if (rand < 0.5) return '否'
  if (rand < 0.75) return '无关'
  return '已破案'
}

// 设置 Socket.IO 事件处理
export function setupGameHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`)

    // 初始化socket用户信息（默认匿名）
    socket.userId = null
    socket.userRole = 'user'

    // 绑定用户到socket（登录后调用）
    // 支持两种模式：1) 传入 token 自动验证  2) 传入 odId+username 直接绑定（调用者已验证）
    socket.on('bind-user', (data, callback) => {
      const { token, odId, username } = data

      // 模式1: 使用 token 验证
      if (token) {
        try {
          const decoded = verifyToken(token)
          if (decoded) {
            socket.userId = decoded.userId
            socket.userRole = decoded.userRole || 'user'
            socket.username = username || decoded.username || '匿名'
            console.log(`[Socket] User bound via token: ${socket.userId} to socket ${socket.id}`)
            callback?.({ success: true, userId: socket.userId })
          } else {
            callback?.({ success: false, error: '无效的令牌' })
          }
          return
        } catch (error) {
          console.error('[Socket] bind-user error:', error.message)
          callback?.({ success: false, error: '认证失败' })
          return
        }
      }

      // 模式2: 直接使用 odId 和 username（调用者已验证）
      if (odId) {
        socket.userId = odId
        socket.userRole = 'user'
        socket.username = username || '匿名'
        console.log(`[Socket] User bound directly: ${socket.userId} to socket ${socket.id}`)
        callback?.({ success: true, userId: socket.userId })
        return
      }

      // 既没有 token 也没有 odId，保持匿名状态
      callback?.({ success: true, anonymous: true })
    })

    // 解绑用户（登出时调用）
    socket.on('unbind-user', (data, callback) => {
      socket.userId = null
      socket.userRole = 'user'
      callback?.({ success: true })
    })

    // 断线重连恢复
    socket.on('reconnect', (data, callback) => {
      const { playerName } = data

      // 如果有绑定用户，使用绑定用户ID；否则使用提供的odId（已废弃，仅向后兼容）
      const odId = socket.userId || data.odId

      if (!odId) {
        callback?.({ success: false, error: '缺少 odId，请先登录' })
        return
      }

      const restored = roomManager.reconnectPlayer(socket.id, odId, playerName)

      if (restored) {
        const { room, player } = restored
        socket.join(room.id)
        socket.roomId = room.id

        // 如果是当前回合玩家，重启计时器
        if (room.currentPlayerId === socket.id) {
          room.startTurnTimer(() => {
            handleTurnTimeout(io, room)
          })
        }

        // 通知房间内其他玩家
        io.to(room.id).emit('player-reconnected', {
          playerId: socket.id,
          playerName: player?.name || playerName,
          players: room.getPlayerList()
        })

        callback?.({
          success: true,
          room: {
            id: room.id,
            hostId: room.hostId,
            hostName: room.getPlayer(room.hostId)?.name || '未知',
            players: room.getPlayerList(),
            story: room.story,
            status: room.gameStatus,
            currentPlayer: room.getCurrentPlayer(),
            remainingSeconds: room.getTurnRemainingSeconds()
          }
        })
      } else {
        callback?.({ success: false, error: '无待恢复的游戏会话' })
      }
    })

    // 创建房间
    socket.on('create-room', async (data, callback) => {
      const { hostName, story, odId } = data

      if (!hostName || !validateStory(story)) {
        callback({ success: false, error: '参数错误' })
        return
      }

      // 优先使用已验证的 socket.userId，如果未登录则使用传入的 odId（仅允许匿名游戏）
      const verifiedOdId = socket.userId || odId

      const room = roomManager.createRoom(socket.id, hostName, story, verifiedOdId || null)
      socket.join(room.id)
      socket.roomId = room.id

      console.log(`[Room] Created: ${room.id} by ${hostName} (odId: ${verifiedOdId || 'anonymous'})`)

      callback({
        success: true,
        room: {
          id: room.id,
          hostId: room.hostId,
          hostName: hostName,
          players: room.getPlayerList(),
          story: room.story,
          status: room.gameStatus
        }
      })
    })

    // 加入房间
    socket.on('join-room', (data, callback) => {
      const { roomId, playerName, odId } = data

      // 优先使用已验证的 socket.userId，如果未登录则使用传入的 odId
      const verifiedOdId = socket.userId || odId

      const room = roomManager.getRoom(roomId)
      if (!room) {
        callback({ success: false, error: '房间不存在' })
        return
      }

      if (room.gameStatus !== 'waiting') {
        callback({ success: false, error: '游戏已开始，无法加入' })
        return
      }

      if (room.getPlayerCount() >= 8) {
        callback({ success: false, error: '房间已满' })
        return
      }

      const player = room.addPlayer(socket.id, playerName, verifiedOdId || null)
      socket.join(roomId)
      socket.roomId = roomId

      console.log(`[Room] ${playerName} joined room ${roomId} (odId: ${verifiedOdId || 'anonymous'})`)

      if (room.getPlayerCount() >= 8) {
        callback({ success: false, error: '房间已满' })
        return
      }

      // 通知房间内所有玩家
      io.to(roomId).emit('player-joined', {
        player,
        playerCount: room.getPlayerCount(),
        players: room.getPlayerList()
      })

      callback({
        success: true,
        room: {
          id: room.id,
          hostId: room.hostId,
          hostName: room.getPlayer(room.hostId)?.name,
          players: room.getPlayerList(),
          story: room.story,
          status: room.gameStatus
        }
      })
    })

    // 离开房间
    socket.on('leave-room', () => {
      handleLeaveRoom(socket, io)
    })

    // 准备/取消准备
    socket.on('toggle-ready', (data, callback) => {
      const { ready } = data
      const room = roomManager.findRoomByPlayerId(socket.id)

      if (!room) {
        callback?.({ success: false, error: '不在任何房间' })
        return
      }

      room.setReady(socket.id, ready)

      io.to(room.id).emit('player-ready', {
        playerId: socket.id,
        ready,
        players: room.getPlayerList()
      })

      callback?.({ success: true })
    })

    // 开始游戏（房主）
    socket.on('start-game', async (data, callback) => {
      const room = roomManager.findRoomByPlayerId(socket.id)

      if (!room) {
        callback?.({ success: false, error: '不在任何房间' })
        return
      }

      if (!room.isHost(socket.id)) {
        callback?.({ success: false, error: '只有房主可以开始游戏' })
        return
      }

      if (room.getPlayerCount() < 2) {
        callback?.({ success: false, error: '至少需要2名玩家' })
        return
      }

      // 检查是否所有非房主玩家都已准备
      if (!room.areAllPlayersReady()) {
        callback?.({ success: false, error: '还有玩家未准备' })
        return
      }

      room.gameStatus = 'playing'
      room.currentTurnIndex = 0

      console.log(`[Game] Started in room ${room.id}`)

      // 通知所有玩家游戏开始
      io.to(room.id).emit('game-started', {
        story: room.story,
        currentPlayer: room.getCurrentPlayer(),
        players: room.getPlayerList(),
        turnTimeoutSeconds: room.turnTimeoutMs / 1000
      })

      // 启动第一个回合的计时器
      const firstPlayer = room.getCurrentPlayer()
      if (firstPlayer) {
        room.currentPlayerId = firstPlayer.id
        room.startTurnTimer(() => {
          handleTurnTimeout(io, room)
        })
        // 广播当前玩家和剩余时间
        broadcastTurnState(io, room)
      }

      callback?.({ success: true })
    })

    // 回合超时处理
    function handleTurnTimeout(io, room) {
      if (room.gameStatus !== 'playing') return

      const timedOutPlayer = room.getCurrentPlayer()
      if (!timedOutPlayer) return

      console.log(`[Game] Turn timeout for ${timedOutPlayer.name} in room ${room.id}`)

      // 通知玩家超时
      io.to(room.id).emit('turn-timeout', {
        playerId: timedOutPlayer.id,
        playerName: timedOutPlayer.name,
        nextPlayer: room.nextTurn()
      })

      // 更新当前玩家计时器
      const nextPlayer = room.getCurrentPlayer()
      if (nextPlayer) {
        room.currentPlayerId = nextPlayer.id
        room.startTurnTimer(() => {
          handleTurnTimeout(io, room)
        })
        broadcastTurnState(io, room)
      }
    }

    // 广播当前回合状态
    function broadcastTurnState(io, room) {
      const currentPlayer = room.getCurrentPlayer()
      if (!currentPlayer) return
      io.to(room.id).emit('turn-state', {
        currentPlayer: {
          id: currentPlayer.id,
          name: currentPlayer.name,
          questionCount: currentPlayer.questionCount
        },
        remainingSeconds: room.getTurnRemainingSeconds(),
        players: room.getPlayerList()
      })
    }

    // 提问
    socket.on('ask-question', async (data, callback) => {
      const { question } = data
      const room = roomManager.findRoomByPlayerId(socket.id)

      if (!room) {
        callback?.({ success: false, error: '不在任何房间' })
        return
      }

      const currentPlayer = room.getCurrentPlayer()
      if (currentPlayer?.id !== socket.id) {
        callback?.({ success: false, error: '不是你的回合' })
        return
      }

      // 获取 AI 回答
      const answer = await getAIAnswer(question, room.story)

      // 记录消息
      room.addMessage({
        id: `msg-${Date.now()}`,
        playerId: socket.id,
        playerName: currentPlayer.name,
        question,
        answer,
        timestamp: Date.now()
      })

      room.incrementPlayerQuestionCount(socket.id)

      // 清除当前回合计时器
      room.clearTurnTimer()

      // 判断是否破案
      const isVictory = answer === '已破案'

      if (isVictory) {
        emitGameOver(io, room, socket.id, currentPlayer.name)
      } else {
        // 下一个回合
        const nextPlayer = room.nextTurn()
        room.currentPlayerId = nextPlayer?.id || null

        io.to(room.id).emit('answer-question', {
          question,
          answer,
          isVictory: false,
          currentPlayer: nextPlayer,
          players: room.getPlayerList()
        })

        // 启动下一回合计时器
        if (nextPlayer) {
          room.startTurnTimer(() => {
            handleTurnTimeout(io, room)
          })
          broadcastTurnState(io, room)
        }
      }

      callback?.({ success: true, answer, isVictory })
    })

    // 跳过问题（放弃当前回合，不记录问题）
    socket.on('skip-question', (data, callback) => {
      const { reason } = data || {}
      const room = roomManager.findRoomByPlayerId(socket.id)

      if (!room) {
        callback?.({ success: false, error: '不在任何房间' })
        return
      }

      const currentPlayer = room.getCurrentPlayer()
      if (currentPlayer?.id !== socket.id) {
        callback?.({ success: false, error: '不是你的回合' })
        return
      }

      if (room.gameStatus !== 'playing') {
        callback?.({ success: false, error: '游戏未进行' })
        return
      }

      // 清除当前回合计时器
      room.clearTurnTimer()

      const skippedBy = currentPlayer.name

      // 下一个回合
      const nextPlayer = room.nextTurn()
      room.currentPlayerId = nextPlayer?.id || null

      io.to(room.id).emit('question-skipped', {
        skippedBy,
        reason: reason || 'voluntary',
        currentPlayer: nextPlayer,
        players: room.getPlayerList()
      })

      // 启动下一回合计时器
      if (nextPlayer) {
        room.startTurnTimer(() => {
          handleTurnTimeout(io, room)
        })
        broadcastTurnState(io, room)
      }

      callback?.({ success: true })
    })

    // 放弃游戏（主动认输）
    socket.on('abandon-game', (data, callback) => {
      const room = roomManager.findRoomByPlayerId(socket.id)

      if (!room) {
        callback?.({ success: false, error: '不在任何房间' })
        return
      }

      if (room.gameStatus !== 'playing') {
        callback?.({ success: false, error: '游戏未进行' })
        return
      }

      const abandoningPlayer = room.getPlayer(socket.id)
      if (!abandoningPlayer) {
        callback?.({ success: false, error: '玩家不在房间内' })
        return
      }

      const roomStory = room.story
      const roomQuestionCount = room.questionCount

      // 清除计时器
      room.clearTurnTimer()

      // 获取其他玩家作为胜者
      const remainingPlayers = room.getPlayerList().filter(p => p.id !== socket.id)
      const winner = remainingPlayers.length > 0 ? remainingPlayers[0] : null

      if (winner) {
        emitGameOver(io, room, winner.id, winner.name, {
          story: roomStory,
          totalQuestions: roomQuestionCount,
          reason: 'opponent_abandoned',
          abandonedBy: abandoningPlayer.name
        })
      } else {
        // 只有一个人，直接结束
        room.setWinner(socket.id)
        io.to(room.id).emit('game-over', {
          roomId: room.id,
          winner: { id: socket.id, name: abandoningPlayer.name },
          reason: 'abandoned_no_opponent',
          story: roomStory,
          totalQuestions: roomQuestionCount
        })
      }

      roomManager.deleteRoom(room.id)

      callback?.({ success: true })
    })

    // 猜答案
    socket.on('guess-answer', async (data, callback) => {
      const { guess } = data
      const room = roomManager.findRoomByPlayerId(socket.id)

      if (!room) {
        callback?.({ success: false, error: '不在任何房间' })
        return
      }

      const player = room.getPlayer(socket.id)
      if (!player) {
        callback?.({ success: false, error: '玩家不存在' })
        return
      }

      // 获取 AI 判断
      const answer = await getAIAnswer(guess, room.story)
      const isVictory = answer === '已破案'

      if (isVictory) {
        room.clearTurnTimer() // 清除计时器
        emitGameOver(io, room, socket.id, player.name, { guess })
      }

      callback?.({ success: true, answer, isVictory })
    })

    // 房间内聊天（游戏外闲聊）
    socket.on('room-chat', (data, callback) => {
      const { message } = data
      const room = roomManager.findRoomByPlayerId(socket.id)

      if (!room) {
        callback?.({ success: false, error: '不在任何房间' })
        return
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        callback?.({ success: false, error: '消息不能为空' })
        return
      }

      // 敏感词过滤
      let content = message.trim().slice(0, 200) // 限制200字
      const result = filterSensitiveWords(content)
      content = result.filtered
      if (result.words.length > 0) {
        console.warn(`[Chat] 敏感词过滤: ${result.words.join(', ')} from socket ${socket.id}`)
      }

      const player = room.getPlayer(socket.id)

      // 广播给房间内所有玩家
      io.to(room.id).emit('room-message', {
        id: `msg-${Date.now()}`,
        playerId: socket.id,
        playerName: player?.name || '匿名',
        content,
        timestamp: Date.now()
      })

      callback?.({ success: true })
    })

    // 获取房间列表
    socket.on('get-room-list', (data, callback) => {
      const rooms = roomManager.getRoomList()
      callback?.({ success: true, rooms })
    })

    // ==================== 好友挑战房间 ====================

    // 创建挑战房间（向好友发起挑战）
    socket.on('create-challenge-room', async (data, callback) => {
      const { friendId, storyId, odId } = data

      if (!friendId || !storyId) {
        callback?.({ success: false, error: '参数错误：缺少 friendId 或 storyId' })
        return
      }

      const verifiedOdId = socket.userId || odId
      if (!verifiedOdId) {
        callback?.({ success: false, error: '请先登录' })
        return
      }

      try {
        // 获取故事信息
        const { getStoryById } = await import('../services/storyService.js')
        const story = await getStoryById(storyId)

        if (!story) {
          callback?.({ success: false, error: '故事不存在' })
          return
        }

        // 创建挑战房间
        const challengeRoomId = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const room = roomManager.createRoom(socket.id, `挑战房间`, {
          id: storyId,
          surface: story.surface,
          bottom: story.bottom,
          difficulty: story.difficulty,
          title: story.title
        }, verifiedOdId)

        // 标记为挑战房间
        room.isChallenge = true
        room.challengeInvitedPlayer = friendId

        socket.join(room.id)
        socket.roomId = room.id

        // 向好友发送挑战邀请
        io.to(`user:${friendId}`).emit('challenge-invite', {
          roomId: room.id,
          fromOdId: verifiedOdId,
          fromName: socket.username || '匿名',
          storyId,
          storyTitle: story.title
        })

        callback?.({
          success: true,
          roomId: room.id,
          message: '挑战邀请已发送'
        })
      } catch (error) {
        console.error('[Challenge] Create error:', error.message)
        callback?.({ success: false, error: '创建挑战房间失败' })
      }
    })

    // 加入挑战房间（接受挑战）
    socket.on('join-challenge-room', (data, callback) => {
      const { roomId, playerName, odId } = data

      const verifiedOdId = socket.userId || odId
      if (!verifiedOdId) {
        callback?.({ success: false, error: '请先登录' })
        return
      }

      const room = roomManager.getRoom(roomId)
      if (!room) {
        callback?.({ success: false, error: '房间不存在' })
        return
      }

      if (!room.isChallenge) {
        callback?.({ success: false, error: '不是挑战房间' })
        return
      }

      const player = room.addPlayer(socket.id, playerName || socket.username || '匿名', verifiedOdId)
      socket.join(roomId)
      socket.roomId = roomId

      // 通知挑战发起者有人加入了
      io.to(roomId).emit('challenge-joined', {
        roomId,
        playerId: socket.id,
        playerName: player.name,
        players: room.getPlayerList()
      })

      callback?.({
        success: true,
        roomId: room.id,
        room: {
          id: room.id,
          hostId: room.hostId,
          players: room.getPlayerList(),
          story: room.story,
          status: room.gameStatus
        }
      })
    })

    // 接受挑战
    socket.on('accept-challenge', (data, callback) => {
      const { roomId } = data

      const room = roomManager.getRoom(roomId)
      if (!room) {
        callback?.({ success: false, error: '房间不存在' })
        return
      }

      // 通知挑战发起者
      io.to(room.hostId).emit('challenge-accepted', {
        roomId,
        accepterId: socket.userId,
        accepterName: socket.username || '匿名'
      })

      callback?.({ success: true })
    })

    // 拒绝挑战
    socket.on('reject-challenge', (data, callback) => {
      const { roomId } = data

      const room = roomManager.getRoom(roomId)
      if (room) {
        roomManager.deleteRoom(roomId)
      }

      // 通知挑战发起者
      io.to(roomId).emit('challenge-rejected', {
        roomId,
        rejecterId: socket.userId,
        rejecterName: socket.username || '匿名'
      })

      callback?.({ success: true })
    })

    // 发送挑战邀请（向好友发送挑战邀请）
    socket.on('send-challenge-invite', (data, callback) => {
      const { toUserId, storyId } = data

      if (!toUserId || !storyId) {
        callback?.({ success: false, error: '参数错误' })
        return
      }

      // 直接通知对方，客户端会引导创建房间
      io.to(`user:${toUserId}`).emit('challenge-invite-direct', {
        fromOdId: socket.userId,
        fromName: socket.username || '匿名',
        storyId,
        timestamp: Date.now()
      })

      callback?.({ success: true })
    })

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`)
      handleLeaveRoom(socket, io)
    })
  })

  // 处理离开房间
  function handleLeaveRoom(socket, io) {
    if (!socket.roomId) return

    const room = roomManager.findRoomByPlayerId(socket.id)
    if (!room) {
      socket.leave(socket.roomId)
      socket.roomId = null
      return
    }

    const wasInGame = room.gameStatus === 'playing'
    const isCurrentPlayer = room.currentPlayerId === socket.id

    // 清除回合计时器（如果离开的是当前玩家）
    if (isCurrentPlayer && wasInGame) {
      room.clearTurnTimer()
    }
    const remainingPlayers = wasInGame ? room.getPlayerList().filter(p => p.id !== socket.id) : null
    const roomStory = room.story
    const roomQuestionCount = room.questionCount
    const playerName = room.getPlayer(socket.id)?.name || '玩家'

    // 先获取是否被缓存（游戏中断线会缓存，60秒内可重连）
    const cached = roomManager.getDisconnectedPlayer(room.getPlayer(socket.id)?.odId)

    const result = roomManager.removePlayerFromRoom(socket.id)

    if (result) {
      // 游戏中断线 → 发 player-disconnected（不立即释放座位）
      // 主动离开或游戏外断线 → 发 player-left
      if (wasInGame && cached) {
        io.to(result.id).emit('player-disconnected', {
          playerId: socket.id,
          playerName,
          playerCount: result.getPlayerCount(),
          players: result.getPlayerList(),
          newHostId: result.hostId,
          reconnectable: true,
          reconnectDeadline: cached.disconnectedAt + 60000
        })
      } else {
        io.to(result.id).emit('player-left', {
          playerId: socket.id,
          playerCount: result.getPlayerCount(),
          players: result.getPlayerList(),
          newHostId: result.hostId
        })

        // 如果游戏进行中只剩1人，判定胜者并结束游戏
        if (wasInGame && remainingPlayers?.length === 1) {
          const winner = remainingPlayers[0]
          emitGameOver(io, result, winner.id, winner.name, {
            story: roomStory,
            totalQuestions: roomQuestionCount,
            reason: 'opponent_disconnected'
          }).catch(err => {
            console.error('[Game] 发送 game-over 事件失败:', err.message)
          })
          console.log(`[Game] Game over in room ${result.id}: ${winner.name} wins by default`)
        }
      }

      // 如果房间空了，删除并通知
      if (result.getPlayerCount() === 0) {
        roomManager.deleteRoom(result.id)
        console.log(`[Room] Deleted: ${result.id}`)
      }
    }

    socket.leave(socket.roomId)
    socket.roomId = null
  }
}
