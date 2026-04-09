/**
 * 增强版问题输入组件 - 文本 + 语音一体化
 */
import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { useVoice } from '../hooks/useVoice'

interface QuestionInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}

export const QuestionInput = memo(function QuestionInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = '输入问题...',
  maxLength = 100
}: QuestionInputProps) {
  const {
    isListening,
    interimTranscript,
    error,
    startListening,
    stopListening,
    isSupported,
    audioLevel,
    registerVoiceCommand,
    unregisterVoiceCommand
  } = useVoice()

  const [localError, setLocalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputHistory, setInputHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // 注册语音命令
  useEffect(() => {
    if (isListening) {
      registerVoiceCommand('发送', () => {
        stopListening()
        if (value.trim()) {
          onSubmit(value)
        }
      })
      registerVoiceCommand('取消', () => {
        stopListening()
        onChange('')
      })
    }

    return () => {
      unregisterVoiceCommand('发送')
      unregisterVoiceCommand('取消')
    }
  }, [isListening, value, onSubmit, onChange, stopListening, registerVoiceCommand, unregisterVoiceCommand])

  // 语音识别中间结果更新输入框
  useEffect(() => {
    if (interimTranscript) {
      onChange(interimTranscript)
    }
  }, [interimTranscript, onChange])

  // 键盘快捷键
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) {
        // 保存到历史
        setInputHistory(prev => [...prev.slice(-20), value.trim()])
        setHistoryIndex(-1)
        onSubmit(value.trim())
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (inputHistory.length > 0 && historyIndex < inputHistory.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        onChange(inputHistory[inputHistory.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        onChange(inputHistory[inputHistory.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        onChange('')
      }
    } else if (e.key === 'Escape') {
      if (isListening) {
        stopListening()
      }
      onChange('')
    }
  }, [value, onSubmit, onChange, inputHistory, historyIndex, isListening, stopListening])

  // 切换语音
  const toggleVoice = useCallback(() => {
    setLocalError(null)
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  // 处理发送
  const handleSubmit = useCallback(() => {
    if (value.trim() && !disabled) {
      setInputHistory(prev => [...prev.slice(-20), value.trim()])
      setHistoryIndex(-1)
      onSubmit(value.trim())
    }
  }, [value, disabled, onSubmit])

  // 验证输入
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      onChange(newValue)
      setLocalError(null)
    } else {
      setLocalError(`问题不能超过 ${maxLength} 个字符`)
    }
  }, [onChange, maxLength])

  const displayError = error || localError

  return (
    <div className="w-full">
      {/* 输入区域 */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full bg-gray-100 dark:bg-dark-700 border-2 rounded-2xl px-5 py-3.5
              text-sm text-gray-900 dark:text-white placeholder-gray-400
              focus:outline-none transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isListening
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-transparent focus:border-game-500 focus:ring-2 focus:ring-game-500/20'
              }
            `}
          />

          {/* 语音识别中的中间结果覆盖层 */}
          {isListening && interimTranscript && (
            <div className="absolute inset-0 bg-red-500/5 rounded-2xl pointer-events-none flex items-center px-5">
              <span className="text-red-500 text-sm animate-pulse">{interimTranscript}</span>
            </div>
          )}

          {/* 音量指示器 */}
          {isListening && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <div className="flex items-end gap-0.5 h-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-500 rounded-full transition-all duration-100"
                    style={{
                      height: `${Math.min(100, audioLevel * (0.3 + i * 0.25))}%`,
                      opacity: audioLevel > (i + 1) * 20 ? 1 : 0.3
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 字符计数 */}
          <div className="absolute -bottom-5 right-0 text-[10px] text-gray-400">
            {value.length}/{maxLength}
          </div>
        </div>

        {/* 麦克风按钮 */}
        {isSupported && !disabled && (
          <button
            type="button"
            onClick={toggleVoice}
            className={`
              p-3.5 rounded-2xl transition-all duration-200 flex-shrink-0
              ${isListening
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse'
                : 'bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-600 dark:text-gray-300'
              }
            `}
            title={isListening ? '停止录音 (ESC)' : '语音输入'}
          >
            {isListening ? (
              <div className="relative w-5 h-5">
                {/* 录音中的方块动画 */}
                <div className="absolute inset-0 flex items-center justify-center gap-0.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-sm animate-pulse" />
                  <div className="w-1.5 h-1.5 bg-white rounded-sm animate-pulse" style={{ animationDelay: '100ms' }} />
                </div>
              </div>
            ) : (
              <span className="text-lg">🎤</span>
            )}
          </button>
        )}

        {/* 发送按钮 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className="px-6 py-3.5 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700
                     text-white font-bold rounded-2xl text-sm shadow-lg shadow-game-500/30
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                     transition-all duration-200 active:scale-95 flex items-center gap-2"
        >
          {disabled ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>发送中</span>
            </>
          ) : (
            <>
              <span>发送</span>
              <span>→</span>
            </>
          )}
        </button>
      </div>

      {/* 底部提示 */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>↵ 发送</span>
          <span>|</span>
          <span>↑↓ 历史</span>
          <span>|</span>
          <span>ESC 取消</span>
          {isSupported && (
            <>
              <span>|</span>
              <span>🎤 语音输入</span>
            </>
          )}
        </div>
        {isListening && (
          <div className="flex items-center gap-2 text-xs text-red-500 animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>正在聆听...</span>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {displayError && (
        <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
          <span>⚠️</span>
          <span>{displayError}</span>
        </div>
      )}
    </div>
  )
})

export default QuestionInput
