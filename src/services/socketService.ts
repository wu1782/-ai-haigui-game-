// Socket.IO 客户端服务
import { io, Socket } from 'socket.io-client'

// Socket.IO 服务器地址
const SOCKET_URL = import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:3001'

class SocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map()

  // 连接服务器
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve()
        return
      }

      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })

      this.socket.on('connect', () => {
        console.log('[Socket] Connected:', this.socket?.id)
        this.notifyListeners('reconnect')
        resolve()
      })

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error)
        reject(error)
      })

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason)
      })
    })
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.listeners.clear()
  }

  // 发送事件
  emit(event: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'))
        return
      }

      this.socket.emit(event, data, (response: any) => {
        if (response?.success) {
          resolve(response)
        } else {
          reject(new Error(response?.error || 'Unknown error'))
        }
      })
    })
  }

  // 检查是否连接
  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  // 订阅事件
  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
      // 如果是第一次订阅这个事件，设置服务器监听
      if (this.socket) {
        this.socket.on(event, (...args) => {
          this.notifyListeners(event, ...args)
        })
      }
    }
    this.listeners.get(event)?.add(callback)
  }

  // 取消订阅
  off(event: string, callback: (...args: any[]) => void) {
    this.listeners.get(event)?.delete(callback)
  }

  // 通知所有监听器
  private notifyListeners(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(...args)
      } catch (e) {
        console.error(`[Socket] Listener error for ${event}:`, e)
      }
    })
  }

  // 房间操作
  async createRoom(hostName: string, story: any) {
    return this.emit('create-room', { hostName, story })
  }

  async joinRoom(roomId: string, playerName: string) {
    return this.emit('join-room', { roomId, playerName })
  }

  async leaveRoom() {
    return this.emit('leave-room')
  }

  async toggleReady(ready: boolean) {
    return this.emit('toggle-ready', { ready })
  }

  async startGame() {
    return this.emit('start-game')
  }

  async askQuestion(question: string) {
    return this.emit('ask-question', { question })
  }

  async guessAnswer(guess: string) {
    return this.emit('guess-answer', { guess })
  }

  async getRoomList() {
    return this.emit('get-room-list')
  }

  getSocketId(): string | undefined {
    return this.socket?.id
  }

  // ==================== 好友私聊 ====================

  // 发送私聊消息
  async sendPrivateMessage(toUserId: string, content: string) {
    return this.emit('private-message', { toUserId, content })
  }

  // 获取与某好友的聊天历史
  async getPrivateChatHistory(friendId: string, before?: number) {
    return this.emit('get-private-history', { friendId, before })
  }

  // 标记私聊消息已读
  async markPrivateMessagesRead(friendId: string) {
    return this.emit('mark-private-read', { friendId })
  }

  // 获取未读私聊数量
  async getUnreadPrivateCount() {
    return this.emit('get-unread-private-count')
  }

  // ==================== 好友对战 ====================

  // 创建对战房间
  async createChallengeRoom(friendId: string, storyId: string) {
    return this.emit('create-challenge-room', { friendId, storyId })
  }

  // 加入对战房间
  async joinChallengeRoom(roomId: string) {
    return this.emit('join-challenge-room', { roomId })
  }

  // 接受挑战
  async acceptChallenge(roomId: string) {
    return this.emit('accept-challenge', { roomId })
  }

  // 拒绝挑战
  async rejectChallenge(roomId: string) {
    return this.emit('reject-challenge', { roomId })
  }

  // 发送挑战邀请
  async sendChallengeInvite(toUserId: string, storyId: string) {
    return this.emit('send-challenge-invite', { toUserId, storyId })
  }
}

// 导出单例
export const socketService = new SocketService()
