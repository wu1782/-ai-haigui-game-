import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import Avatar from './Avatar'
import type { PrivateMessage } from '../types/message'

interface FriendChatProps {
  friendId: string
  friendUsername: string
  friendAvatar?: string
  messages: PrivateMessage[]
  onSend: (content: string) => void
  onClose: () => void
  onLoadMore?: () => void
  hasMore?: boolean
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - timestamp

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天 ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * FriendChat - 好友私聊界面
 */
export default function FriendChat({
  friendUsername,
  friendAvatar,
  messages,
  onSend,
  onClose,
  onLoadMore,
  hasMore = false
}: FriendChatProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 处理滚动加载更多
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (target.scrollTop === 0 && hasMore && onLoadMore) {
      onLoadMore()
    }
  }

  // 发送消息
  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed) return
    onSend(trimmed)
    setInputValue('')
    inputRef.current?.focus()
  }

  // 键盘快捷键
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isMyMessage = (msg: PrivateMessage) => msg.fromUserId === 'me'

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 h-14 bg-gray-50 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <Avatar src={friendAvatar} username={friendUsername} size="sm" />
          <span className="font-medium text-gray-900">{friendUsername}</span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* 消息列表 */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {/* 加载更多提示 */}
        {hasMore && (
          <div className="text-center py-2">
            <button
              onClick={onLoadMore}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              加载更多消息
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm">还没有消息</p>
            <p className="text-xs text-gray-300 mt-1">开始和好友聊天吧</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${isMyMessage(message) ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] ${isMyMessage(message) ? 'order-2' : 'order-1'}`}>
                <div
                  className={`px-3 py-2 rounded-2xl text-sm break-words ${
                    isMyMessage(message)
                      ? 'bg-gray-900 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}
                >
                  {message.content}
                </div>
                <div
                  className={`text-[10px] text-gray-400 mt-1 ${
                    isMyMessage(message) ? 'text-right' : 'text-left'
                  }`}
                >
                  {formatTime(message.timestamp)}
                  {isMyMessage(message) && message.status === 'pending' && (
                    <span className="ml-1 text-amber-500">发送中...</span>
                  )}
                  {isMyMessage(message) && message.status === 'failed' && (
                    <span className="ml-1 text-red-500">发送失败</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-200 px-4 py-3 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2
                       text-sm text-gray-900 placeholder-gray-400
                       focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200
                       transition-all duration-200"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="w-10 h-10 flex items-center justify-center bg-gray-900 hover:bg-gray-800 active:scale-95
                       text-white rounded-full disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-150"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
