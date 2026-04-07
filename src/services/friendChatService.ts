/**
 * 好友聊天服务
 */
import { socketService } from './socketService'
import type { PrivateMessage } from '../types/message'

const CHAT_HISTORY_KEY = 'turtle-soup-chat-history'
const UNREAD_KEY = 'turtle-soup-unread-messages'

export interface ChatConversation {
  friendId: string
  friendUsername: string
  friendAvatar?: string
  messages: PrivateMessage[]
  unreadCount: number
  lastMessageTime?: number
}

/**
 * 获取本地聊天历史
 */
export function getLocalChatHistory(friendId: string): PrivateMessage[] {
  try {
    const saved = localStorage.getItem(`${CHAT_HISTORY_KEY}_${friendId}`)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

/**
 * 保存聊天历史到本地
 */
export function saveLocalChatHistory(friendId: string, messages: PrivateMessage[]) {
  try {
    localStorage.setItem(`${CHAT_HISTORY_KEY}_${friendId}`, JSON.stringify(messages))
  } catch (error) {
    console.error('保存聊天历史失败:', error)
  }
}

/**
 * 获取本地未读消息
 */
export function getLocalUnreadMessages(): Record<string, number> {
  try {
    const saved = localStorage.getItem(UNREAD_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

/**
 * 保存未读消息计数
 */
export function saveLocalUnreadMessages(unreadMap: Record<string, number>) {
  try {
    localStorage.setItem(UNREAD_KEY, JSON.stringify(unreadMap))
  } catch (error) {
    console.error('保存未读消息失败:', error)
  }
}

/**
 * 发送私聊消息
 */
export async function sendPrivateMessage(
  toUserId: string,
  content: string
): Promise<{ success: boolean; message?: PrivateMessage; error?: string }> {
  // 离线模式：直接保存到本地
  if (!socketService.isConnected()) {
    const localMessage: PrivateMessage = {
      id: `local-${Date.now()}`,
      fromUserId: 'me',
      toUserId,
      content,
      timestamp: Date.now(),
      status: 'pending'
    }
    return { success: true, message: localMessage }
  }

  try {
    const result = await socketService.sendPrivateMessage(toUserId, content)
    return { success: true, message: result.message }
  } catch (error) {
    console.error('发送私聊消息错误:', error)
    // 离线模式：保存到本地
    const localMessage: PrivateMessage = {
      id: `local-${Date.now()}`,
      fromUserId: 'me',
      toUserId,
      content,
      timestamp: Date.now(),
      status: 'pending'
    }
    return { success: true, message: localMessage }
  }
}

/**
 * 获取聊天历史
 */
export async function getPrivateChatHistory(
  friendId: string,
  before?: number
): Promise<PrivateMessage[]> {
  // socket 未连接时直接使用本地存储
  if (!socketService.isConnected()) {
    const localHistory = getLocalChatHistory(friendId)
    if (before) {
      return localHistory.filter(m => m.timestamp < before)
    }
    return localHistory
  }

  try {
    const result = await socketService.getPrivateChatHistory(friendId, before)
    return result.messages || []
  } catch (error) {
    console.error('获取聊天历史错误:', error)
    // 降级到本地存储
    const localHistory = getLocalChatHistory(friendId)
    if (before) {
      return localHistory.filter(m => m.timestamp < before)
    }
    return localHistory
  }
}

/**
 * 标记消息已读
 */
export async function markPrivateMessagesRead(friendId: string): Promise<void> {
  // 清除本地未读计数（无论是否连接成功都清除）
  const unread = getLocalUnreadMessages()
  delete unread[friendId]
  saveLocalUnreadMessages(unread)

  if (!socketService.isConnected()) return

  try {
    await socketService.markPrivateMessagesRead(friendId)
  } catch (error) {
    // 静默处理，local unread 已清除
  }
}

/**
 * 获取未读消息数量
 */
export async function getUnreadPrivateCount(): Promise<Record<string, number>> {
  try {
    const result = await socketService.getUnreadPrivateCount()
    return result.counts || {}
  } catch (error) {
    console.error('获取未读数量错误:', error)
    return getLocalUnreadMessages()
  }
}

/**
 * 增加未读计数
 */
export function incrementUnreadCount(friendId: string) {
  const unread = getLocalUnreadMessages()
  unread[friendId] = (unread[friendId] || 0) + 1
  saveLocalUnreadMessages(unread)
}

/**
 * 监听私聊消息
 */
export function onPrivateMessage(callback: (message: PrivateMessage) => void) {
  socketService.on('private-message', callback)
}

/**
 * 取消监听私聊消息
 */
export function offPrivateMessage(callback: (message: PrivateMessage) => void) {
  socketService.off('private-message', callback)
}

/**
 * 监听消息已读事件
 */
export function onMessagesRead(callback: (data: { friendId: string }) => void) {
  socketService.on('private-messages-read', callback)
}

/**
 * 取消监听消息已读
 */
export function offMessagesRead(callback: (data: { friendId: string }) => void) {
  socketService.off('private-messages-read', callback)
}
