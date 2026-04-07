// 游戏处理器 - 处理 Socket.IO 事件

import { roomManager } from './roomManager.js'

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
  const keywords = story.bottom.split(/[,，、]/).map(k => k.trim().toLowerCase())
  const questionLower = question.toLowerCase()

  // 检查是否猜中答案（汤底关键词匹配）
  const matchCount = keywords.filter(k => k && questionLower.includes(k)).length
  if (matchCount >= 2) {
    return '已破案'
  }

  // 检查是否匹配
  for (const keyword of keywords) {
    if (keyword && keyword.length > 2 && questionLower.includes(keyword)) {
      return '是'
    }
  }

  // 随机返回
  const rand = Math.random()
  if (rand < 0.33) return '是'
  if (rand < 0.66) return '不是'
  return '与此无关'
}

// 设置 Socket.IO 事件处理
export function setupGameHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`)

    // 创建房间
    socket.on('create-room', async (data, callback) => {
      const { hostName, story } = data

      if (!hostName || !validateStory(story)) {
        callback({ success: false, error: '参数错误' })
        return
      }

      const room = roomManager.createRoom(socket.id, hostName, story)
      socket.join(room.id)
      socket.roomId = room.id

      console.log(`[Room] Created: ${room.id} by ${hostName}`)

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
      const { roomId, playerName } = data

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

      const player = room.addPlayer(socket.id, playerName)
      socket.join(roomId)
      socket.roomId = roomId

      console.log(`[Room] ${playerName} joined room ${roomId}`)

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

      room.gameStatus = 'playing'
      room.currentTurnIndex = 0

      console.log(`[Game] Started in room ${room.id}`)

      // 通知所有玩家游戏开始
      io.to(room.id).emit('game-started', {
        story: room.story,
        currentPlayer: room.getCurrentPlayer(),
        players: room.getPlayerList()
      })

      callback?.({ success: true })
    })

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

      // 判断是否破案
      const isVictory = answer === '已破案'

      if (isVictory) {
        room.setWinner(socket.id)

        io.to(room.id).emit('game-over', {
          winner: {
            id: socket.id,
            name: currentPlayer.name
          },
          story: room.story,
          totalQuestions: room.questionCount,
          players: room.getPlayerList()
        })
      } else {
        // 下一个回合
        const nextPlayer = room.nextTurn()

        io.to(room.id).emit('answer-question', {
          question,
          answer,
          isVictory: false,
          currentPlayer: nextPlayer,
          players: room.getPlayerList()
        })
      }

      callback?.({ success: true, answer, isVictory })
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
        room.setWinner(socket.id)

        io.to(room.id).emit('game-over', {
          winner: {
            id: socket.id,
            name: player.name
          },
          guess,
          story: room.story,
          totalQuestions: room.questionCount,
          players: room.getPlayerList()
        })
      }

      callback?.({ success: true, answer, isVictory })
    })

    // 获取房间列表
    socket.on('get-room-list', (data, callback) => {
      const rooms = roomManager.getRoomList()
      callback?.({ success: true, rooms })
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

    const room = roomManager.removePlayerFromRoom(socket.id)

    if (room) {
      io.to(socket.roomId).emit('player-left', {
        playerId: socket.id,
        playerCount: room.getPlayerCount(),
        players: room.getPlayerList(),
        newHostId: room.hostId
      })

      // 如果房间空了，删除并通知
      if (room.getPlayerCount() === 0) {
        roomManager.deleteRoom(socket.roomId)
        console.log(`[Room] Deleted: ${socket.roomId}`)
      }
    }

    socket.leave(socket.roomId)
    socket.roomId = null
  }
}
