import { useState, useEffect, memo } from 'react'
import type { TMessage } from '../types'
import { getUserSettings } from '../data/userData'

interface MessageProps {
  message: TMessage
  isLatest?: boolean
}

// 获取动画速度（毫秒）
const getTypingSpeed = (animationSpeed: 'normal' | 'fast' | 'instant'): number => {
  switch (animationSpeed) {
    case 'instant': return 0
    case 'fast': return 5
    default: return 15
  }
}

// 气泡样式映射 - 游戏化风格
const BUBBLE_STYLES = {
  is: 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white border border-emerald-400/50 shadow-emerald-500/20',
  no: 'bg-gradient-to-br from-red-500 to-rose-500 text-white border border-red-400/50 shadow-red-500/20',
  irrelevant: 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-dark-600',
  system: 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-dark-600',
  victory: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white border border-amber-400/50 shadow-amber-500/30',
  user: 'bg-gradient-to-br from-game-500 to-purple-600 text-white border border-game-400/50 shadow-game-500/20'
}

// 答案图标
const ANSWER_ICONS = {
  is: '✓',
  no: '✗',
  irrelevant: '○',
  victory: '🎉',
  user: null,
  system: null
}

/**
 * 根据消息类型获取AI回复的气泡样式
 */
function getAssistantBubbleStyle(type: TMessage['type']): string {
  return BUBBLE_STYLES[type] || BUBBLE_STYLES.system
}

/**
 * Message - 单条聊天消息组件 - 游戏化风格
 */
const Message = memo(function Message({ message }: MessageProps) {
  const isUser = message.role === 'user'
  const bubbleStyle = isUser
    ? 'bg-gradient-to-br from-game-500 to-game-600 text-white border border-game-400/50 shadow-game-500/30'
    : getAssistantBubbleStyle(message.type)
  const answerIcon = isUser ? null : ANSWER_ICONS[message.type]

  // 打字机效果
  const [displayedContent, setDisplayedContent] = useState(message.content)
  const [showCursor, setShowCursor] = useState(false)

  useEffect(() => {
    if (message.status === 'loading' || isUser) {
      setDisplayedContent(message.content)
      setShowCursor(false)
      return
    }

    // instant 模式直接显示
    const settings = getUserSettings()
    const baseSpeed = getTypingSpeed(settings.animationSpeed)

    if (baseSpeed === 0) {
      setDisplayedContent(message.content)
      setShowCursor(false)
      return
    }

    setDisplayedContent('')
    setShowCursor(true)

    const fullContent = message.content
    let index = 0
    const speed = fullContent.length > 100 ? baseSpeed : baseSpeed + 5

    const timer = setInterval(() => {
      if (index <= fullContent.length) {
        setDisplayedContent(fullContent.slice(0, index))
        index++
      } else {
        clearInterval(timer)
        setShowCursor(false)
      }
    }, speed)

    return () => clearInterval(timer)
  }, [message.content, message.status, isUser])

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2 mb-3 animate-fade-in-up`}>
      {/* AI 头像 */}
      {!isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-game-400 to-game-600 flex items-center justify-center text-lg shadow-lg border-2 border-game-300/50">
          🐢
        </div>
      )}

      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${bubbleStyle} transition-all duration-300 ${message.type === 'victory' ? 'answer-impact' : 'shadow-md'} ${isUser ? 'rounded-br-md' : 'rounded-bl-md'}`}>
        {/* 带答案图标的标签 */}
        {answerIcon && message.type !== 'system' && message.type !== 'irrelevant' && (
          <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-white/10">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              message.type === 'is' ? 'bg-emerald-400/30' :
              message.type === 'no' ? 'bg-red-400/30' :
              message.type === 'victory' ? 'bg-amber-400/30' : 'bg-gray-400/30'
            }`}>
              {answerIcon}
            </span>
            <span className="text-xs font-medium opacity-80">
              {message.type === 'is' ? '肯定' : message.type === 'no' ? '否定' : message.type === 'victory' ? '破案' : '无效'}
            </span>
          </div>
        )}

        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.status === 'loading' ? (
            <span className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-current opacity-40"
                  style={{
                    animation: `bounce 1s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </span>
          ) : (
            <span>
              {displayedContent}
              {showCursor && (
                <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse" />
              )}
            </span>
          )}
        </p>
      </div>

      {/* 用户头像 */}
      {isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-lg border-2 border-purple-300/50">
          {message.type === 'victory' ? '🎯' : '你'}
        </div>
      )}
    </div>
  )
})

export default Message
