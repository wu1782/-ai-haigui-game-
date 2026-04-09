// 房间管理器 - 管理所有游戏房间

// 生成唯一房间号
function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// 房间类
class Room {
  constructor(id, hostId, hostName, story) {
    this.id = id
    this.hostId = hostId
    this.players = new Map()
    this.story = story
    this.currentTurnIndex = 0
    this.gameStatus = 'waiting' // waiting, playing, finished
    this.messages = []
    this.questionCount = 0
    this.createdAt = Date.now()

    // 回合计时器
    this.turnTimer = null
    this.turnTimeoutMs = 120000 // 120秒/题
    this.currentPlayerId = null
    this.turnStartTime = null
  }

  addPlayer(socketId, playerName, odId = null) {
    const player = {
      id: socketId,
      name: playerName,
      odId,  // 用户真实 odId（来自 JWT）
      isReady: false,
      isWinner: false,
      questionCount: 0
    }
    this.players.set(socketId, player)
    return player
  }

  // 启动回合计时器
  startTurnTimer(onTimeout) {
    this.clearTurnTimer()
    this.turnStartTime = Date.now()
    this.turnTimer = setTimeout(() => {
      onTimeout()
    }, this.turnTimeoutMs)
  }

  // 清除回合计时器
  clearTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer)
      this.turnTimer = null
    }
  }

  // 获取当前回合剩余秒数
  getTurnRemainingSeconds() {
    if (!this.turnStartTime) return this.turnTimeoutMs / 1000
    const elapsed = Date.now() - this.turnStartTime
    return Math.max(0, Math.ceil((this.turnTimeoutMs - elapsed) / 1000))
  }

  // 停止计时器（游戏结束时）
  stopAllTimers() {
    this.clearTurnTimer()
  }

  removePlayer(socketId) {
    return this.players.delete(socketId)
  }

  getPlayer(socketId) {
    return this.players.get(socketId)
  }

  getPlayerList() {
    return Array.from(this.players.values())
  }

  getPlayerCount() {
    return this.players.size
  }

  isHost(socketId) {
    return this.hostId === socketId
  }

  setReady(socketId, ready) {
    const player = this.players.get(socketId)
    if (player) {
      player.isReady = ready
    }
  }

  areAllPlayersReady() {
    if (this.players.size < 2) return false
    for (const player of this.players.values()) {
      if (!player.isReady && !this.isHost(player.id)) {
        return false
      }
    }
    return true
  }

  getCurrentPlayer() {
    const players = this.getPlayerList()
    if (players.length === 0) return null
    return players[this.currentTurnIndex % players.length]
  }

  nextTurn() {
    this.currentTurnIndex++
    return this.getCurrentPlayer()
  }

  addMessage(message) {
    this.messages.push(message)
    this.questionCount++
  }

  setWinner(socketId) {
    this.gameStatus = 'finished'
    for (const player of this.players.values()) {
      player.isWinner = player.id === socketId
    }
  }

  incrementPlayerQuestionCount(socketId) {
    const player = this.players.get(socketId)
    if (player) {
      player.questionCount++
    }
  }
}

// 断线玩家缓存（支持60秒内重连恢复）
const disconnectedPlayers = new Map()
// Key: odId, Value: { roomId, playerData, socketId(旧), disconnectedAt, timeout }

// 定期清理过期断线记录
setInterval(() => {
  const now = Date.now()
  for (const [odId, data] of disconnectedPlayers.entries()) {
    if (now - data.disconnectedAt > 60000) {
      disconnectedPlayers.delete(odId)
      console.log(`[Room] 断线玩家 ${odId} 重连超时，释放房间座位`)
    }
  }
}, 10000)

// 房间管理器单例
class RoomManager {
  constructor() {
    this.rooms = new Map()
  }

  createRoom(hostId, hostName, story, hostOdId = null) {
    const roomId = generateRoomId()
    const room = new Room(roomId, hostId, hostName, story)
    room.addPlayer(hostId, hostName, hostOdId)
    this.rooms.set(roomId, room)
    return room
  }

  getRoom(roomId) {
    return this.rooms.get(roomId)
  }

  deleteRoom(roomId) {
    return this.rooms.delete(roomId)
  }

  findRoomByPlayerId(socketId) {
    for (const room of this.rooms.values()) {
      if (room.players.has(socketId)) {
        return room
      }
    }
    return null
  }

  // 根据 socketId 查找用户的 odId
  findPlayerOdId(socketId) {
    const room = this.findRoomByPlayerId(socketId)
    if (!room) return null
    const player = room.getPlayer(socketId)
    return player?.odId || null
  }

  // 缓存断线玩家信息（供60秒内重连恢复）
  cacheDisconnectedPlayer(socketId, roomId, odId, playerData) {
    const key = odId || socketId
    disconnectedPlayers.set(key, {
      roomId,
      odId,
      playerData,
      oldSocketId: socketId,
      disconnectedAt: Date.now(),
      timeout: setTimeout(() => {
        // TTL 过期后自动从房间移除
        disconnectedPlayers.delete(key)
      }, 60000)
    })
    console.log(`[Room] 缓存断线玩家 ${playerData?.name}(${odId || 'anonymous'})，60秒内可重连`)
  }

  // 获取断线玩家缓存
  getDisconnectedPlayer(odId) {
    return disconnectedPlayers.get(odId) || null
  }

  // 清除断线玩家缓存（重连成功或超时）
  clearDisconnectedPlayer(odId) {
    const data = disconnectedPlayers.get(odId)
    if (data?.timeout) {
      clearTimeout(data.timeout)
    }
    disconnectedPlayers.delete(odId)
  }

  // 根据旧 socketId 获取断线缓存
  getDisconnectedBySocketId(socketId) {
    for (const data of disconnectedPlayers.values()) {
      if (data.oldSocketId === socketId) {
        return data
      }
    }
    return null
  }

  removePlayerFromRoom(socketId) {
    const room = this.findRoomByPlayerId(socketId)
    if (room) {
      const player = room.getPlayer(socketId)

      // 如果游戏正在进行，缓存玩家信息供重连
      if (room.gameStatus === 'playing' && player) {
        this.cacheDisconnectedPlayer(socketId, room.id, player.odId, player)
      }

      room.removePlayer(socketId)
      // 如果房间空了，删除房间
      if (room.getPlayerCount() === 0) {
        this.deleteRoom(room.id)
      }
      // 如果房主离开，更换房主
      else if (room.hostId === socketId) {
        const players = room.getPlayerList()
        if (players.length > 0 && players[0]) {
          room.hostId = players[0].id
        }
      }
      return room
    }
    return null
  }

  // 恢复重连玩家到房间
  reconnectPlayer(newSocketId, odId, newPlayerName) {
    const cached = this.getDisconnectedPlayer(odId)
    if (!cached) {
      return null
    }

    const room = this.getRoom(cached.roomId)
    if (!room) {
      this.clearDisconnectedPlayer(odId)
      return null
    }

    // 恢复玩家数据（保留原有的问题数等信息）
    const restoredPlayer = {
      ...cached.playerData,
      id: newSocketId,
      socketId: newSocketId,
      isReady: true,
      // 重连后默认准备
    }

    // 更新房间内的玩家映射
    const existingPlayer = room.getPlayer(newSocketId)
    if (existingPlayer) {
      // 已有记录（可能重连很快，socket还没完全清理），更新socketId
      existingPlayer.id = newSocketId
      existingPlayer.socketId = newSocketId
    } else {
      room.addPlayer(newSocketId, restoredPlayer.name || newPlayerName, odId)
      // 手动修复刚添加的玩家数据（因为 addPlayer 会创建新对象）
      const newPlayer = room.getPlayer(newSocketId)
      if (newPlayer) {
        newPlayer.odId = restoredPlayer.odId
        newPlayer.questionCount = restoredPlayer.questionCount
        newPlayer.isWinner = restoredPlayer.isWinner
      }
    }

    this.clearDisconnectedPlayer(odId)

    console.log(`[Room] 玩家 ${newPlayerName}(${odId}) 重连成功，恢复到房间 ${room.id}`)

    return {
      room,
      player: room.getPlayer(newSocketId)
    }
  }

  getRoomList() {
    const roomList = []
    for (const room of this.rooms.values()) {
      roomList.push({
        id: room.id,
        hostId: room.hostId,
        hostName: room.getPlayer(room.hostId)?.name || '未知',
        playerCount: room.getPlayerCount(),
        maxPlayers: 8,
        status: room.gameStatus,
        storyTitle: room.story?.title || '未选择'
      })
    }
    return roomList
  }
}

export const roomManager = new RoomManager()
export { Room }
