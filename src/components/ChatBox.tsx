import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import Message from './Message'
import type { TMessage } from '../types'

interface ChatBoxProps {
  messages: TMessage[]
  onSend: (content: string) => void
  disabled?: boolean
}

/**
 * ChatBox - 简约现代风格聊天界面
 */
function ChatBox({ messages, onSend, disabled = false }: ChatBoxProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 新消息自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息
  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed || disabled) return
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

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="text-3xl font-bold mb-4">🐢</div>
            <p className="text-sm text-gray-400 px-8 mb-6">
              准备开始你的推理之旅
            </p>
            <p className="text-xs text-gray-300">
              每轮只能提问可以用「是」「否」或「无关」回答的问题
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <Message
                message={message}
                isLatest={index === messages.length - 1}
              />
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? '游戏已结束' : '输入问题...'}
            disabled={disabled}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-5 py-3
                       text-sm text-gray-900 placeholder-gray-400
                       focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || disabled}
            className="px-6 py-3 bg-gray-900 hover:bg-gray-800 active:scale-95
                       text-white font-medium rounded-lg text-sm
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-150"
          >
            发送
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-2 text-center hidden sm:block">
          按 Enter 发送 | 仅支持是/否/无关类型问题
        </p>
      </div>
    </div>
  )
}

export default ChatBox
