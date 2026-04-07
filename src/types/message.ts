// Message - 对话消息
export type TMessageType = 'is' | 'no' | 'irrelevant' | 'system' | 'victory' | 'user'

export interface TMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  type: TMessageType
  status?: 'loading' | 'success'
}

// PrivateMessage - 好友私聊消息
export interface PrivateMessage {
  id: string
  fromUserId: string
  toUserId: string
  content: string
  timestamp: number
  status?: 'sending' | 'sent' | 'pending' | 'failed'
  isRead?: boolean
}
