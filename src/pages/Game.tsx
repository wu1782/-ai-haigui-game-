import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStoryById } from '../data/stories'
import Message from '../components/Message'
import CluePanel from '../components/CluePanel'
import { askAI, getAIHint } from '../api'
import type { TMessage, TGameStatus, TStory, TMessageType, GameRecord } from '../types'
import { useSound } from '../hooks/useSound'
import { saveReplay } from '../data/replays'
import { completeDailyChallenge, getDailyChallenge } from '../data/dailyChallenge'

/**
 * 保存游戏记录到localStorage
 * 最多保留100条记录，超出后删除最旧的
 */
const MAX_RECORDS = 100

const saveGameRecord = (record: GameRecord) => {
  try {
    const saved = localStorage.getItem('turtle-soup-records')
    const records: GameRecord[] = saved ? JSON.parse(saved) : []
    // 移除同一故事的旧记录
    const filtered = records.filter(r => r.storyId !== record.storyId)
    filtered.push(record)
    // 限制最大记录数（保留最新的100条）
    const trimmed = filtered.slice(-MAX_RECORDS)
    localStorage.setItem('turtle-soup-records', JSON.stringify(trimmed))
  } catch (e) {
    console.warn('Failed to save game record:', e)
  }
}

/**
 * 维度配置
 */
const dimensionLabels: Record<string, { label: string; icon: string; color: string }> = {
  '人物': { label: '人物', icon: '👤', color: 'text-blue-500' },
  '物品': { label: '物品', icon: '📦', color: 'text-amber-500' },
  '事件': { label: '事件', icon: '⚡', color: 'text-purple-500' },
  '时间': { label: '时间', icon: '⏰', color: 'text-cyan-500' },
  '原因': { label: '原因', icon: '❓', color: 'text-rose-500' },
  '位置': { label: '位置', icon: '📍', color: 'text-emerald-500' },
  '状态': { label: '状态', icon: '🔄', color: 'text-orange-500' },
  '关系': { label: '关系', icon: '🔗', color: 'text-pink-500' },
  '未知': { label: '其他', icon: '💡', color: 'text-gray-500' }
}

/**
 * 难度徽章配置
 */
const difficultyConfig = {
  easy: { label: '入门', bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30' },
  medium: { label: '中等', bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/30' },
  hard: { label: '困难', bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-500/30' },
  extreme: { label: '极难', bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/30' }
}

/**
 * Game - 游戏页面 - 游戏化风格
 */
function Game() {
  const { storyId } = useParams<{ storyId: string }>()
  const navigate = useNavigate()
  const { playSound } = useSound()

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
  const inputRef = useRef<HTMLInputElement>(null)

  // AI辅助提示状态
  const [showHint, setShowHint] = useState(false)
  const [currentHint, setCurrentHint] = useState<{ hint: string; dimension: string } | null>(null)
  const [isHintLoading, setIsHintLoading] = useState(false)
  const [hintError, setHintError] = useState<string | null>(null)

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

  // 格式化时间
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // 消息折叠
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false)
  const COLLAPSE_THRESHOLD = 5

  // 线索笔记面板
  const [isCluePanelOpen, setIsCluePanelOpen] = useState(false)

  // 获取故事
  useEffect(() => {
    if (storyId === 'custom') {
      const data = new URLSearchParams(window.location.search).get('data')
      if (data) {
        try {
          const customStory = JSON.parse(decodeURIComponent(atob(data)))
          setStory(customStory)
          setTimeout(() => setIsInitializing(false), 400)
          return
        } catch (e) {
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
    setTimeout(() => setIsInitializing(false), 400)
  }, [storyId, navigate])

  // 初始化消息
  useEffect(() => {
    if (!story || isInitializing) return

    const welcomeMessage: TMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `欢迎来到海龟汤游戏

汤面：${story.surface}

请开始你的推理之旅，每轮只能提问可以用「是」「否」或「无关」回答的问题。`,
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
    setHintError(null)
    setShowHint(true)
    setCurrentHint(null)

    try {
      const hint = await getAIHint(story, messages)
      setCurrentHint(hint)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '获取提示失败'
      setHintError(msg)
    } finally {
      setIsHintLoading(false)
    }
  }, [story, messages, isHintLoading])

  // 发送消息
  const handleSend = useCallback(async () => {
    const question = inputValue.trim()
    if (!question || isLoading || gameStatus !== 'playing' || !story) return

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
      content: 'thinking...',
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

          const newQuestionCount = questionCount + 1
          setQuestionCount(newQuestionCount)

          saveGameRecord({
            storyId: story.id,
            playedAt: new Date().toISOString(),
            questionCount: newQuestionCount,
            isWin: true,
            endType: 'guess'
          })

          // 保存回放
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

          // 检查是否完成每日挑战
          const dailyChallenge = getDailyChallenge()
          if (dailyChallenge && dailyChallenge.storyId === story.id && !dailyChallenge.completed) {
            completeDailyChallenge()
          }

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

          return finalMessages
        }

        const newQuestionCount = questionCount + 1
        setQuestionCount(newQuestionCount)
        playSound('receive')
        return updated
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      setError(errorMessage)

      const isInvalidAnswer = errorMessage.includes('不符合规范')

      setMessages(prev => prev.map(msg =>
        msg.id === loadingMessageId
          ? {
              ...msg,
              content: isInvalidAnswer
                ? `${errorMessage}\n\n请重新提问，使用可以用「是」「否」或「无关」回答的问题。`
                : `抱歉，AI 服务暂时不可用: ${errorMessage}`,
              type: 'system' as const,
              status: 'success' as const
            }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, gameStatus, story, questionCount, navigate, inputValue, playSound, elapsedTime])

  // 键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 放弃游戏
  const handleGiveUp = () => {
    playSound('defeat')
    setShowConfirm(true)
  }
  const confirmGiveUp = () => {
    if (story) {
      saveGameRecord({
        storyId: story.id,
        playedAt: new Date().toISOString(),
        questionCount: questionCount + 1,
        isWin: false,
        endType: 'giveup'
      })
      // 保存回放
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
      // 保存回放
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

  if (!story) return null

  const isGameOver = gameStatus !== 'playing'
  const diffConfig = difficultyConfig[story.difficulty]

  // 加载状态
  if (isInitializing) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-900 dark:to-dark-800 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center text-5xl mx-auto shadow-lg shadow-game-500/30 animate-pulse">
              🐢
            </div>
            {/* 加载光环 */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-game-400 to-purple-400 opacity-30 blur-xl animate-pulse" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-dark-900 flex flex-col relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-game-500/5 to-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
      </div>

      {/* 顶部栏 */}
      <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50 px-6 py-4 shrink-0 z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* 左侧 */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="group flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
              <span className="text-sm font-medium hidden sm:inline">返回</span>
            </button>

            <div className="h-8 w-px bg-gray-200 dark:bg-dark-700 hidden sm:block" />

            {/* 标题和难度 */}
            <div className="flex items-center gap-3">
              <h1 className="text-gray-900 dark:text-white font-bold">{story.title}</h1>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${diffConfig.bg} ${diffConfig.text} ${diffConfig.border} border`}>
                {diffConfig.label}
              </span>
            </div>
          </div>

          {/* 右侧状态 */}
          <div className="flex items-center gap-4">
            {/* 计时器 */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-dark-700 rounded-xl">
              <span className="text-lg">⏱️</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{formatTime(elapsedTime)}</span>
            </div>

            {/* 提问次数 */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-dark-700 rounded-xl">
              <span className="text-lg">❓</span>
              <span className="font-bold text-gray-900 dark:text-white">{questionCount}</span>
              <span className="text-gray-500 text-xs hidden sm:inline">次提问</span>
            </div>

            {/* 提示按钮 */}
            <button
              onClick={handleGetHint}
              disabled={isHintLoading || isGameOver}
              className="flex items-center gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-lg">💡</span>
              <span className="text-sm font-medium hidden sm:inline">
                {isHintLoading ? '分析中...' : '提示'}
              </span>
            </button>

            {/* 线索按钮 */}
            <button
              onClick={() => setIsCluePanelOpen(!isCluePanelOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-500/20 hover:bg-purple-200 dark:hover:bg-purple-500/30 text-purple-600 dark:text-purple-400 rounded-xl transition-colors"
            >
              <span className="text-lg">📋</span>
              <span className="text-sm font-medium hidden sm:inline">线索</span>
            </button>
          </div>
        </div>
      </header>

      {/* 错误提示 - 游戏化风格 */}
      {error && (
        <div className="relative bg-gradient-to-r from-red-500/10 to-rose-500/10 border-b border-red-500/20 px-6 py-3 shrink-0">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <span className="text-red-500">⚠️</span>
              </div>
              <span className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors p-1"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* AI提示区域 */}
      {showHint && (
        <div className="relative bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20 px-6 py-4 shrink-0">
          <div className="flex items-start gap-4 max-w-4xl mx-auto">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              💡
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-amber-600 dark:text-amber-400 text-sm font-bold">AI 提示</span>
                {currentHint && dimensionLabels[currentHint.dimension] && (
                  <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-dark-800/50 ${dimensionLabels[currentHint.dimension].color}`}>
                    <span>{dimensionLabels[currentHint.dimension].icon}</span>
                    <span>{dimensionLabels[currentHint.dimension].label}</span>
                  </span>
                )}
              </div>
              {isHintLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-amber-600 dark:text-amber-400 text-sm">AI 正在分析中...</span>
                </div>
              ) : hintError ? (
                <p className="text-red-500 text-sm">{hintError}</p>
              ) : currentHint ? (
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{currentHint.hint}</p>
              ) : null}
            </div>
            <button
              onClick={() => setShowHint(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 汤面提示 - 游戏化风格 */}
      <div className="relative bg-gradient-to-r from-game-500/5 to-purple-500/5 border-b border-game-500/10 px-6 py-4 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow">
            汤
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm italic">"{story.surface}"</p>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="relative flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-game-500/20 to-purple-500/20 flex items-center justify-center text-4xl mb-4">
                🐢
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-sm">开始你的推理之旅</p>
            </div>
          ) : (
            <>
              {/* 折叠/展开按钮 */}
              {messages.length > COLLAPSE_THRESHOLD && (
                <button
                  onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                  className="w-full mb-4 py-2.5 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isHistoryCollapsed ? (
                    <>
                      <span>▼</span>
                      <span>展开剩余 {messages.length - COLLAPSE_THRESHOLD} 条消息</span>
                    </>
                  ) : (
                    <>
                      <span>▲</span>
                      <span>收起早期消息</span>
                    </>
                  )}
                </button>
              )}

              <div className="space-y-1">
                {(isHistoryCollapsed ? messages.slice(-COLLAPSE_THRESHOLD) : messages).map((message, index) => {
                  const actualIndex = isHistoryCollapsed ? messages.length - COLLAPSE_THRESHOLD + index : index
                  return (
                    <div
                      key={message.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${actualIndex * 30}ms` }}
                    >
                      <Message
                        message={message}
                        isLatest={actualIndex === messages.length - 1}
                      />
                    </div>
                  )
                })}
              </div>
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 - 游戏化风格 */}
      <div className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-dark-700/50 px-6 py-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isGameOver ? '游戏已结束' : '输入问题...'}
              disabled={isGameOver}
              className="flex-1 bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-2xl px-5 py-3.5
                         text-sm text-gray-900 dark:text-white placeholder-gray-400
                         focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isGameOver || isLoading}
              className="px-6 py-3.5 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700
                         text-white font-bold rounded-2xl text-sm shadow-lg shadow-game-500/30
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                         transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              {isLoading ? (
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
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-400">
              按 Enter 发送 | 仅支持是/否/无关类型问题
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleGiveUp}
                disabled={isGameOver}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <span>🏳️</span>
                <span>放弃</span>
              </button>
              <button
                onClick={handleGuess}
                disabled={isGameOver}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <span>🎯</span>
                <span>猜答案</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 确认弹窗 */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="relative bg-white dark:bg-dark-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl overflow-hidden">
            {/* 装饰 */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-transparent rounded-bl-full" />

            <div className="relative">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center">
                <span className="text-3xl">🏳️</span>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">确认放弃？</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
                你已提问 <span className="font-bold text-gray-900 dark:text-white">{questionCount}</span> 次，确认要放弃并查看汤底吗？
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors font-medium text-sm"
                >
                  继续游戏
                </button>
                <button
                  onClick={confirmGiveUp}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-colors font-bold text-sm shadow-lg shadow-red-500/30"
                >
                  确认放弃
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 线索笔记面板 */}
      <CluePanel
        messages={messages}
        isOpen={isCluePanelOpen}
        onToggle={() => setIsCluePanelOpen(!isCluePanelOpen)}
      />
    </div>
  )
}

export default Game
