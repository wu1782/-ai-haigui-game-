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
  }

  addPlayer(socketId, playerName) {
    const player = {
      id: socketId,
      name: playerName,
      isReady: false,
      isWinner: false,
      questionCount: 0
    }
    this.players.set(socketId, player)
    return player
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

// 房间管理器单例
class RoomManager {
  constructor() {
    this.rooms = new Map()
  }

  createRoom(hostId, hostName, story) {
    const roomId = generateRoomId()
    const room = new Room(roomId, hostId, hostName, story)
    room.addPlayer(hostId, hostName)
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

  removePlayerFromRoom(socketId) {
    const room = this.findRoomByPlayerId(socketId)
    if (room) {
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
