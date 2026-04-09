import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStoryById } from '../data/stories'
import { askAI, getAIHint } from '../api'
import type { TMessage, TGameStatus, TStory, TMessageType, GameRecord } from '../types'
import { useSound } from '../hooks/useSound'
import { useVoice } from '../hooks/useVoice'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { saveReplay } from '../data/replays'
import { completeDailyChallenge } from '../data/dailyChallenge'
import { PageTransition } from '../components/PageTransition'
import { GameSkeleton } from '../components'
import { validateQuestion } from '../utils/validation'
import { useToast } from '../context/ToastContext'

/**
 * 保存游戏记录到localStorage
 */
const MAX_RECORDS = 100

const saveGameRecord = (record: GameRecord) => {
  try {
    const saved = localStorage.getItem('turtle-soup-records')
    const records: GameRecord[] = saved ? JSON.parse(saved) : []
    const filtered = records.filter(r => r.storyId !== record.storyId)
    filtered.push(record)
    const trimmed = filtered.slice(-MAX_RECORDS)
    localStorage.setItem('turtle-soup-records', JSON.stringify(trimmed))
  } catch (e) {
    console.warn('Failed to save game record:', e)
  }
}

/**
 * 消息气泡组件
 */
const MessageBubble = memo(({ message }: { message: TMessage }) => {
  const isUser = message.role === 'user'
  const isLoading = message.status === 'loading'

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="flex items-center gap-3 px-6 py-4 bg-dark-800 rounded-2xl border border-dark-700">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-game-500 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <span className="text-game-400 text-sm">审讯中...</span>
        </div>
      </div>
    )
  }

  if (message.type === 'victory') {
    return (
      <div className="flex justify-center py-4">
        <div className="text-center">
          <div className="text-6xl mb-2 animate-bounce">🎉</div>
          <p className="text-emerald-400 text-lg font-medium">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mr-2 bg-dark-800 border border-dark-700">
          🐢
        </div>
      )}

      <div className="max-w-[85%]">
        {isUser ? (
          <div className="bg-gradient-to-br from-game-500 to-purple-600 rounded-2xl rounded-br-md px-5 py-3 shadow-lg shadow-game-500/20">
            <p className="text-white text-[15px] leading-relaxed">{message.content}</p>
          </div>
        ) : (
          <div className="bg-dark-800 rounded-2xl rounded-bl-md px-5 py-3 border border-dark-700">
            <p className="text-gray-300 text-[15px] leading-relaxed">{message.content}</p>
          </div>
        )}

        {!isUser && message.type && message.type !== 'system' && message.type !== 'user' && (
          <div className="flex items-center gap-2 mt-2">
            <AnswerBadge type={message.type} />
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ml-2 bg-gradient-to-br from-rose-500 to-pink-500">
          ?
        </div>
      )}
    </div>
  )
})

/**
 * 答案徽章
 */
const AnswerBadge = ({ type }: { type: string }) => {
  const config = {
    is: { text: '是', bg: 'bg-emerald-500/20', textColor: 'text-emerald-400', border: 'border-emerald-500/30' },
    no: { text: '否', bg: 'bg-red-500/20', textColor: 'text-red-400', border: 'border-red-500/30' },
    irrelevant: { text: '无关', bg: 'bg-gray-500/20', textColor: 'text-gray-400', border: 'border-gray-500/30' }
  }[type] || { text: type, bg: 'bg-gray-500/20', textColor: 'text-gray-400', border: 'border-gray-500/30' }

  return (
    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${config.bg} ${config.textColor} border ${config.border}`}>
      {config.text}
    </span>
  )
}

/**
 * 汤面卡片组件
 */
const SurfaceCard = ({ surface, difficulty }: { surface: string; difficulty: string }) => {
  const difficultyConfig = {
    easy: { label: '入门', color: '#10B981' },
    medium: { label: '中等', color: '#F59E0B' },
    hard: { label: '困难', color: '#EF4444' },
    extreme: { label: '极难', color: '#8B5CF6' }
  }
  const diff = difficultyConfig[difficulty as keyof typeof difficultyConfig] || difficultyConfig.medium

  return (
    <div className="relative">
      {/* 装饰线条 */}
      <div className="absolute -left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-game-500 to-transparent" />

      <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
        {/* 标签 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold tracking-[0.2em] text-game-400 uppercase">Case File</span>
          <span className="w-px h-3 bg-dark-600" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: diff.color }}>{diff.label}</span>
        </div>

        {/* 汤面内容 */}
        <p className="text-gray-100 text-[15px] leading-relaxed font-medium">
          "{surface}"
        </p>

        {/* 底部装饰 */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-dark-700">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-game-500" />
            <div className="w-2 h-2 rounded-full bg-game-500/50" />
            <div className="w-2 h-2 rounded-full bg-game-500/20" />
          </div>
          <span className="text-[10px] text-gray-500 tracking-wider">RESTRICTED</span>
        </div>
      </div>
    </div>
  )
}

/**
 * 状态栏组件
 */
const StatusBar = ({ time, count, onHelp, onInvite }: { time: string; count: number; onHelp: () => void; onInvite: () => void }) => (
  <div className="flex items-center justify-between px-4 py-3 bg-dark-900 border-b border-dark-800">
    <div className="flex items-center gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center">
          <span className="text-sm">🐢</span>
        </div>
        <span className="text-white font-bold text-sm tracking-tight">海龟汤</span>
      </div>
    </div>

    <div className="flex items-center gap-6">
      {/* 计时器 */}
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="text-gray-300 font-mono text-sm">{time}</span>
      </div>

      {/* 提问次数 */}
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="text-gray-300 font-mono text-sm">{count} 次</span>
      </div>

      {/* 按钮组 */}
      <div className="flex items-center gap-1">
        <button
          onClick={onInvite}
          className="p-2 rounded-lg hover:bg-dark-800 transition-colors text-gray-500 hover:text-gray-300"
          title="邀请"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>
        <button
          onClick={onHelp}
          className="p-2 rounded-lg hover:bg-dark-800 transition-colors text-gray-500 hover:text-gray-300"
          title="帮助"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-dark-800 transition-colors text-gray-500 hover:text-gray-300"
          title="返回"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>
    </div>
  </div>
)

/**
 * 输入区域组件
 */
const InputArea = ({
  value,
  onChange,
  onSubmit,
  onGiveUp,
  onGuess,
  disabled,
  isLoading
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onGiveUp: () => void
  onGuess: () => void
  disabled: boolean
  isLoading: boolean
}) => (
  <div className="bg-dark-900 border-t border-dark-800 px-4 py-4">
    <div className="max-w-3xl mx-auto">
      {/* 输入框 */}
      <div className="relative mb-4">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSubmit()}
          placeholder="输入你的问题..."
          disabled={disabled}
          className="w-full bg-dark-800 border border-dark-700 rounded-xl px-5 py-4 text-white placeholder-gray-500 text-[15px]
                     focus:outline-none focus:border-game-500 focus:ring-1 focus:ring-game-500/50 transition-all
                     disabled:opacity-50"
        />

        {/* 发送按钮 */}
        <button
          onClick={onSubmit}
          disabled={!value.trim() || disabled || isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-game-500 hover:bg-game-600 disabled:bg-dark-700 disabled:cursor-not-allowed rounded-lg transition-all text-white"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>

      {/* 底部操作 */}
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs">按 Enter 发送</span>
        <div className="flex items-center gap-4">
          <button
            onClick={onGiveUp}
            disabled={disabled}
            className="flex items-center gap-1.5 text-gray-500 hover:text-red-400 text-xs transition-colors disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
            放弃
          </button>
          <button
            onClick={onGuess}
            disabled={disabled}
            className="flex items-center gap-1.5 text-gray-500 hover:text-emerald-400 text-xs transition-colors disabled:opacity-40"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            猜答案
          </button>
        </div>
      </div>
    </div>
  </div>
)

/**
 * 弹窗组件
 */
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-dark-800 rounded-2xl border border-dark-700 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-700">
          <h3 className="text-white font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-dark-700 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

/**
 * Game - 游戏页面
 */
function Game() {
  const { storyId } = useParams<{ storyId: string }>()
  const navigate = useNavigate()
  const { playSound } = useSound()
  const { showToast } = useToast()

  const [story, setStory] = useState<TStory | null>(null)
  const [messages, setMessages] = useState<TMessage[]>([])
  const [gameStatus, setGameStatus] = useState<TGameStatus>('playing')
  const [questionCount, setQuestionCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const confirmingRef = useRef(false)

  // AI辅助提示状态
  const [showHint, setShowHint] = useState(false)
  const [currentHint, setCurrentHint] = useState<{ hint: string; dimension: string } | null>(null)
  const [isHintLoading, setIsHintLoading] = useState(false)

  // 帮助弹窗
  const [showHelp, setShowHelp] = useState(false)

  // 邀请弹窗
  const [showInvite, setShowInvite] = useState(false)

  // 语音输入状态
  const { isListening, transcript: voiceTranscript, interimTranscript, startListening, stopListening, isSupported: voiceSupported } = useVoice()

  // 键盘快捷键
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: '?',
        shiftKey: true,
        action: () => setShowHelp(prev => !prev),
        description: '帮助',
        scope: 'local' as const
      },
      {
        key: 'Escape',
        action: () => {
          if (showHelp) setShowHelp(false)
          else if (showHint) setShowHint(false)
          else if (showConfirm) setShowConfirm(false)
          else if (showInvite) setShowInvite(false)
        },
        description: '关闭弹窗',
        scope: 'global' as const,
        preventDefault: true
      }
    ]
  })

  // 用时统计
  const [startTime, setStartTime] = useState<number>(0)
  const [elapsedTime, setElapsedTime] = useState<number>(0)

  // 初始化开始时间
  useEffect(() => {
    if (story && !isInitializing) {
      setStartTime(Date.now())
      setElapsedTime(0)
    }
  }, [story, isInitializing])

  // 计时器
  useEffect(() => {
    if (gameStatus !== 'playing' || !startTime) return
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime)
    }, 1000)
    return () => clearInterval(interval)
  }, [gameStatus, startTime])

  // 语音识别结果处理
  useEffect(() => {
    if (voiceTranscript && !isListening) {
      setInputValue(voiceTranscript)
    }
  }, [voiceTranscript, isListening])

  // 格式化时间
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // 获取故事
  useEffect(() => {
    if (storyId === 'custom') {
      const data = new URLSearchParams(window.location.search).get('data')
      if (data) {
        try {
          const customStory = JSON.parse(decodeURIComponent(atob(data)))
          setStory(customStory)
          setTimeout(() => setIsInitializing(false), 500)
          return
        } catch {
          navigate('/')
          return
        }
      }
      navigate('/')
      return
    }

    const foundStory = getStoryById(storyId || '')
    if (!foundStory) {
      navigate('/')
      return
    }
    setStory(foundStory)
    setTimeout(() => setIsInitializing(false), 500)
  }, [storyId, navigate])

  // 初始化消息
  useEffect(() => {
    if (!story || isInitializing) return

    const welcomeMessage: TMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `这是一道海龟汤谜题\n\n汤面：${story.surface}\n\n请通过提问来还原真相。只能问可以用「是」「否」或「无关」回答的问题。`,
      timestamp: Date.now(),
      type: 'user'
    }
    setMessages([welcomeMessage])
  }, [story, isInitializing])

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // AI 回答映射
  const mapAnswerToType = (answer: string): TMessageType => {
    switch (answer) {
      case '是': return 'is'
      case '否': return 'no'
      case '已破案': return 'victory'
      default: return 'irrelevant'
    }
  }

  // 获取AI提示
  const handleGetHint = useCallback(async () => {
    if (!story || isHintLoading) return

    setIsHintLoading(true)
    setShowHint(true)
    setCurrentHint(null)

    try {
      const hint = await getAIHint(story, messages)
      setCurrentHint(hint)
    } catch {
      setCurrentHint({ hint: '暂时无法获取提示', dimension: '未知' })
    } finally {
      setIsHintLoading(false)
    }
  }, [story, messages, isHintLoading])

  // 发送消息
  const handleSend = useCallback(async () => {
    const rawQuestion = (inputValue.trim() || voiceTranscript.trim())
    if (!rawQuestion || isLoading || gameStatus !== 'playing' || !story) return

    const validation = validateQuestion(rawQuestion)
    if (!validation.isValid) {
      setError(validation.errors[0])
      return
    }

    const question = validation.sanitized!
    setError(null)
    setShowHint(false)
    setCurrentHint(null)
    setInputValue('')

    setIsLoading(true)

    const userMessage: TMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: Date.now(),
      type: 'user'
    }
    setMessages(prev => [...prev, userMessage])
    playSound('send')

    const loadingMessageId = `loading-${Date.now()}`
    const loadingMessage: TMessage = {
      id: loadingMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      type: 'system',
      status: 'loading'
    }
    setMessages(prev => [...prev, loadingMessage])

    try {
      const answer = await askAI(question, story)
      const answerType = mapAnswerToType(answer)

      setMessages(prev => {
        const updated = prev.map(msg =>
          msg.id === loadingMessageId
            ? { ...msg, content: answer, type: answerType, status: 'success' as const }
            : msg
        )

        if (answer === '已破案') {
          setGameStatus('success')
          playSound('victory')

          setQuestionCount(prev => {
            const newQuestionCount = prev + 1

            saveGameRecord({
              storyId: story.id,
              playedAt: new Date().toISOString(),
              questionCount: newQuestionCount,
              isWin: true,
              endType: 'guess'
            })

            saveReplay({
              storyId: story.id,
              story,
              messages: updated,
              questionCount: newQuestionCount,
              isWin: true,
              endType: 'guess',
              elapsedTime,
              playedAt: new Date().toISOString()
            })

            completeDailyChallenge(true, newQuestionCount).catch(() => {})

            const victoryMsg: TMessage = {
              id: `victory-${Date.now()}`,
              role: 'assistant',
              content: '恭喜！你已经还原了真相！',
              timestamp: Date.now(),
              type: 'victory'
            }

            const finalMessages = [...updated, victoryMsg]
            setTimeout(() => {
              navigate('/result', {
                state: { story, questionCount: newQuestionCount, messages: finalMessages, isWin: true, endType: 'guess', elapsedTime }
              })
            }, 1500)

            return newQuestionCount
          })

          return updated
        }

        setQuestionCount(prev => prev + 1)
        playSound('receive')
        return updated
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '服务暂不可用'
      setError(errorMessage)

      setMessages(prev => prev.map(msg =>
        msg.id === loadingMessageId
          ? { ...msg, content: errorMessage, type: 'system' as const, status: 'success' as const }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, gameStatus, story, navigate, inputValue, voiceTranscript, playSound, elapsedTime])

  // 放弃游戏
  const handleGiveUp = () => {
    playSound('defeat')
    setShowConfirm(true)
  }

  const confirmGiveUp = () => {
    if (confirmingRef.current) return
    confirmingRef.current = true

    if (story) {
      saveGameRecord({
        storyId: story.id,
        playedAt: new Date().toISOString(),
        questionCount: questionCount + 1,
        isWin: false,
        endType: 'giveup'
      })
      saveReplay({
        storyId: story.id,
        story,
        messages,
        questionCount: questionCount + 1,
        isWin: false,
        endType: 'giveup',
        elapsedTime,
        playedAt: new Date().toISOString()
      })
    }
    navigate('/result', {
      state: { story, questionCount: questionCount + 1, messages, isWin: false, endType: 'giveup', elapsedTime }
    })
  }

  // 猜答案
  const handleGuess = () => {
    if (story) {
      saveGameRecord({
        storyId: story.id,
        playedAt: new Date().toISOString(),
        questionCount: questionCount + 1,
        isWin: true,
        endType: 'guess'
      })
      saveReplay({
        storyId: story.id,
        story,
        messages,
        questionCount: questionCount + 1,
        isWin: true,
        endType: 'guess',
        elapsedTime,
        playedAt: new Date().toISOString()
      })
    }
    navigate('/result', {
      state: { story, questionCount: questionCount + 1, messages, isWin: true, endType: 'guess', elapsedTime }
    })
  }

  // 邀请好友
  const handleInvite = () => {
    const inviteLink = `${window.location.origin}/game/${storyId}`
    navigator.clipboard.writeText(inviteLink).then(() => {
      showToast('链接已复制', 'success')
    }).catch(() => {
      showToast('复制失败', 'error')
    })
    setShowInvite(false)
  }

  if (!story) return null

  const isGameOver = gameStatus !== 'playing'

  if (isInitializing) {
    return <GameSkeleton />
  }

  return (
    <PageTransition>
    <div className="h-screen bg-dark-900 flex flex-col relative overflow-hidden">
      {/* 背景效果 */}
      <div className="fixed inset-0 pointer-events-none">
        {/* 网格背景 */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />

        {/* 渐变光晕 */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-game-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[150px]" />
      </div>

      {/* 状态栏 */}
      <StatusBar
        time={formatTime(elapsedTime)}
        count={questionCount}
        onHelp={() => setShowHelp(true)}
        onInvite={() => setShowInvite(true)}
      />

      {/* 主内容 */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {/* 汤面卡片 */}
            <SurfaceCard surface={story.surface} difficulty={story.difficulty} />

            {/* 消息列表 */}
            <div className="mt-6 space-y-1">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 右侧边栏 */}
        <div className="hidden w-72 border-l border-dark-800 bg-dark-900/50 lg:flex flex-col backdrop-blur-sm">
          <div className="p-4 border-b border-dark-800">
            <h3 className="text-gray-400 text-xs font-bold tracking-wider uppercase">审讯记录</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.filter(m => m.role === 'user' || (m.type !== 'system' && m.type !== 'user')).map((msg) => (
              <div
                key={msg.id}
                className="p-3 rounded-lg bg-dark-800 border border-dark-700 hover:border-dark-600 transition-colors"
              >
                {msg.role === 'user' ? (
                  <p className="text-gray-200 text-sm">{msg.content}</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <AnswerBadge type={msg.type} />
                    <span className="text-gray-500 text-xs truncate">{msg.content}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 提示按钮 */}
          <div className="p-4 border-t border-dark-800">
            <button
              onClick={handleGetHint}
              disabled={isHintLoading || isGameOver}
              className="w-full py-3 bg-dark-800 hover:bg-dark-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-gray-400 text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-dark-700"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="9" y1="18" x2="15" y2="18" />
                <line x1="10" y1="22" x2="14" y2="22" />
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
              </svg>
              {isHintLoading ? '分析中...' : '获取提示'}
            </button>
          </div>
        </div>
      </div>

      {/* AI提示 */}
      {showHint && (
        <div className="relative z-10 mx-4 mb-2 p-4 bg-dark-800 rounded-xl border border-dark-700">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                <line x1="9" y1="18" x2="15" y2="18" />
                <line x1="10" y1="22" x2="14" y2="22" />
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
              </svg>
            </div>
            <div className="flex-1">
              <span className="text-amber-400 text-xs font-bold">AI 提示</span>
              {isHintLoading ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  <span className="text-amber-400/60 text-xs">分析中...</span>
                </div>
              ) : currentHint ? (
                <p className="text-gray-400 text-sm mt-1">{currentHint.hint}</p>
              ) : null}
            </div>
            <button onClick={() => setShowHint(false)} className="text-gray-500 hover:text-gray-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="relative z-10 mx-4 mb-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <div className="flex items-center justify-between">
            <span className="text-red-400 text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400">×</button>
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <InputArea
        value={inputValue}
        onChange={setInputValue}
        onSubmit={handleSend}
        onGiveUp={handleGiveUp}
        onGuess={handleGuess}
        disabled={isGameOver}
        isLoading={isLoading}
      />

      {/* 确认放弃弹窗 */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="确认放弃">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
          <p className="text-gray-400 mb-2">你已提问 <span className="text-white font-bold">{questionCount}</span> 次</p>
          <p className="text-gray-500 text-sm mb-6">确认要放弃并查看汤底吗？</p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 py-3 bg-dark-700 hover:bg-dark-600 rounded-xl text-gray-300 font-medium transition-colors"
            >
              继续
            </button>
            <button
              onClick={confirmGiveUp}
              className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-bold transition-colors"
            >
              放弃
            </button>
          </div>
        </div>
      </Modal>

      {/* 帮助弹窗 */}
      <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="游戏规则">
        <div className="space-y-4">
          <div className="p-4 bg-dark-700 rounded-xl">
            <h4 className="text-white font-bold mb-2">规则</h4>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>• 每轮只能提问可以用「是」「否」或「无关」回答的问题</li>
              <li>• 通过提问逐步还原故事真相</li>
              <li>• 点击「猜答案」可以直接揭晓答案</li>
            </ul>
          </div>
          <div className="p-4 bg-dark-700 rounded-xl">
            <h4 className="text-white font-bold mb-2">快捷键</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-dark-900 rounded text-game-400 text-xs">Enter</kbd>
                <span className="text-gray-500">发送</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-dark-900 rounded text-game-400 text-xs">?</kbd>
                <span className="text-gray-500">帮助</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* 邀请弹窗 */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="邀请好友">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-game-500/10 border border-game-500/20 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="text-gray-400 mb-2">当前故事：{story.title}</p>
          <p className="text-gray-500 text-sm mb-6">邀请好友一起来解谜</p>
          <button
            onClick={handleInvite}
            className="w-full py-3 bg-game-500 hover:bg-game-600 rounded-xl text-white font-bold transition-colors"
          >
            复制邀请链接
          </button>
        </div>
      </Modal>
    </div>
    </PageTransition>
  )
}

export default Game
