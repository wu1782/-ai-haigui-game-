// 语音控制组件 - 霓虹风格
import { useEffect } from 'react'
import { useVoice } from '../hooks/useVoice'

interface VoiceControlProps {
  onTranscriptChange?: (text: string) => void
  disabled?: boolean
}

function VoiceControl({ onTranscriptChange, disabled }: VoiceControlProps) {
  const {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    speak,
    isSupported
  } = useVoice()

  // 当有最终识别结果时通知父组件
  useEffect(() => {
    if (transcript && onTranscriptChange) {
      onTranscriptChange(transcript)
    }
  }, [transcript, onTranscriptChange])

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-ink-400 text-xs">
        <span>您的浏览器不支持语音功能</span>
      </div>
    )
  }

  const handleMicClick = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* 麦克风按钮 */}
      <button
        onClick={handleMicClick}
        disabled={disabled}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all
          ${isListening
            ? 'bg-rose-500/20 border-2 border-rose-500 animate-pulse'
            : 'bg-dark-700 border border-neon-500/20 hover:border-neon-400/50'
          }
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isListening ? '停止录音' : '开始语音输入'}
      >
        {/* 麦克风图标 */}
        <svg
          className={`w-5 h-5 ${isListening ? 'text-rose-400' : 'text-neon-400'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a5 5 0 01-5 5m5 5a5 5 0 01-5-5m5 5v3m0 0h3m-3 0h-3M5 11a5 5 0 015-5m-5 5a5 5 0 005 5m-5-5v3m0 0h3m-3 0H5m9 0a9 9 0 0118 0m-18 0a9 9 0 0118 0M12 15v3m0 0h3m-3 0h-3"
          />
        </svg>

        {/* 录音时的波纹动画 */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-rose-500/50 animate-ping" />
            <span className="absolute inset-[-4px] rounded-full border border-rose-500/30 animate-ping" style={{ animationDelay: '0.2s' }} />
          </>
        )}
      </button>

      {/* 语音波形指示 */}
      {isListening && (
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-rose-400 rounded-full animate-bounce"
              style={{
                height: `${8 + Math.random() * 12}px`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      )}

      {/* 当前识别文本 */}
      {(isListening && interimTranscript) && (
        <div className="text-sm text-ink-200 animate-pulse">
          {interimTranscript}
        </div>
      )}

      {/* 测试语音按钮 */}
      <button
        onClick={() => speak('测试语音')}
        disabled={disabled || isSpeaking}
        className={`px-3 py-1.5 text-xs rounded-full border transition-all
          ${isSpeaking
            ? 'bg-neon-500/20 border-neon-500/40 text-neon-400'
            : 'bg-dark-700 border-ink-400/20 text-ink-300 hover:text-white hover:border-neon-500/30'
          }
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title="测试语音播报"
      >
        {isSpeaking ? '播放中...' : '🔊 测试'}
      </button>

      {/* 错误提示 */}
      {error && (
        <div className="text-xs text-rose-400">{error}</div>
      )}
    </div>
  )
}

export default VoiceControl
