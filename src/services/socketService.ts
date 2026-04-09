// Socket.IO 客户端服务
import { io, Socket } from 'socket.io-client'

// Socket.IO 服务器地址
const SOCKET_URL = import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:3001'

class SocketService {
  private socket: Socket | null = null
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map()
  // 保存 socket 原生事件监听器引用，用于 off 时移除
  private socketListeners: Map<string, Set<(...args: any[]) => void>> = new Map()

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

        // 补挂连接前已注册的业务事件，避免“先订阅后连接”丢监听
        this.listeners.forEach((_callbacks, event) => {
          if (!this.socketListeners.has(event)) {
            this.socketListeners.set(event, new Set())
          }
          if (this.socketListeners.get(event)?.size === 0) {
            const socketCallback = (...args: any[]) => {
              this.notifyListeners(event, ...args)
            }
            this.socket?.on(event, socketCallback)
            this.socketListeners.get(event)?.add(socketCallback)
          }
        })

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
    this.socketListeners.clear()
  }

  // 发送事件
  emit(event: string, data?: any, timeout = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'))
        return
      }

      const timer = setTimeout(() => {
        reject(new Error('Request timeout'))
      }, timeout)

      this.socket.emit(event, data, (response: any) => {
        clearTimeout(timer)
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
      this.socketListeners.set(event, new Set())
      // 如果是第一次订阅这个事件，设置服务器监听
      if (this.socket) {
        const socketCallback = (...args: any[]) => {
          this.notifyListeners(event, ...args)
        }
        this.socket.on(event, socketCallback)
        this.socketListeners.get(event)?.add(socketCallback)
      }
    }
    this.listeners.get(event)?.add(callback)
  }

  // 取消订阅
  off(event: string, callback: (...args: any[]) => void) {
    this.listeners.get(event)?.delete(callback)
    // 如果该事件没有更多监听器，移除 socket.io 的监听器
    if (this.listeners.get(event)?.size === 0) {
      const socketCallbacks = this.socketListeners.get(event)
      if (socketCallbacks && this.socket) {
        socketCallbacks.forEach(cb => {
          this.socket?.off(event, cb)
        })
        socketCallbacks.clear()
      }
      this.listeners.delete(event)
      this.socketListeners.delete(event)
    }
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

  // 跳过当前问题（放弃回合）
  async skipQuestion(reason?: string) {
    return this.emit('skip-question', { reason })
  }

  // 放弃游戏（主动认输）
  async abandonGame() {
    return this.emit('abandon-game')
  }

  async getRoomList() {
    return this.emit('get-room-list')
  }

  // ==================== 房间内聊天 ====================

  // 发送房间聊天消息
  async sendRoomChat(message: string) {
    return this.emit('room-chat', { message })
  }

  // 断线重连恢复
  async reconnect(odId: string, playerName: string) {
    return this.emit('reconnect', { odId, playerName })
  }

  getSocketId(): string | undefined {
    return this.socket?.id
  }

  // ==================== 好友私聊 ====================

  // 发送私聊消息
  async sendPrivateMessage(toUserId: string, content: string) {
    return this.emit('private-message', { toUserId, content })
  }

  // 撤回私信（60秒内）
  async recallMessage(messageId: string) {
    return this.emit('recall-message', { messageId })
  }

  // 获取与某好友的聊天历史
  async getPrivateChatHistory(friendId: string, before?: number) {
    return this.emit('get-private-history', { friendId, before })
  }

  // 标记私聊消息已读
  async markPrivateMessagesRead(friendId: string) {
    return this.emit('mark-private-read', { friendId })
  }

  // 绑定用户到 socket（登录后调用）
  async bindUser(odId: string, username: string) {
    return this.emit('bind-user', { odId, username })
  }

  // 解绑用户（登出时调用）
  async unbindUser() {
    return this.emit('unbind-user', {})
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
