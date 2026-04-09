import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getReplayById, type GameReplay } from '../data/replays'
import Message from '../components/Message'
import type { TMessage } from '../types'
import { PageTransition } from '../components/PageTransition'

/**
 * 游戏回放页面 - 游戏化风格
 */
export default function Replay() {
  const { replayId } = useParams<{ replayId: string }>()
  const navigate = useNavigate()
  const [replay, setReplay] = useState<GameReplay | null>(null)
  const [messages, setMessages] = useState<TMessage[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1000)

  useEffect(() => {
    if (replayId) {
      const found = getReplayById(replayId)
      if (found) {
        setReplay(found)
        setMessages([found.messages[0]])
      } else {
        navigate('/')
      }
    }
  }, [replayId, navigate])

  useEffect(() => {
    if (!replay || !isPlaying) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const next = prev + 1
        if (next < replay.messages.length) {
          setMessages(replay.messages.slice(0, next + 1))
          return next
        } else {
          setIsPlaying(false)
          return prev
        }
      })
    }, playSpeed)

    return () => clearInterval(interval)
  }, [replay, isPlaying, playSpeed])

  const handlePlay = () => {
    if (currentIndex >= (replay?.messages.length || 0) - 1) {
      setCurrentIndex(0)
      setMessages(replay?.messages.slice(0, 1) || [])
    }
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentIndex(0)
    if (replay) {
      setMessages([replay.messages[0]])
    }
  }

  if (!replay) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-900 dark:to-dark-800 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center text-3xl mx-auto shadow-lg animate-pulse">
              🐢
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">加载中...</p>
        </div>
      </div>
    )
  }

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const progress = ((currentIndex + 1) / replay.messages.length) * 100

  const speedOptions = [
    { value: 2000, label: '慢' },
    { value: 1000, label: '正常' },
    { value: 500, label: '快' },
    { value: 100, label: '极快' }
  ]

  return (
    <PageTransition>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/10 to-purple-50/10 dark:from-dark-900 dark:via-game-900/10 dark:to-purple-900/10 flex flex-col relative overflow-hidden">
      {/* 顶部栏 */}
      <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="group flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
              <span className="text-sm font-medium hidden sm:inline">返回</span>
            </button>
            <div className="h-8 w-px bg-gray-200 dark:bg-dark-700 hidden sm:block" />
            <div>
              <h1 className="text-gray-900 dark:text-white font-bold">{replay.story.title}</h1>
              <p className="text-xs text-gray-500 flex items-center gap-2">
                {replay.isWin ? (
                  <span className="text-emerald-500">✓ 已破案</span>
                ) : (
                  <span className="text-red-500">未破案</span>
                )}
                <span>·</span>
                <span>{replay.questionCount}次提问</span>
                <span>·</span>
                <span>{formatTime(replay.elapsedTime)}</span>
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-game-500/10 text-game-600 dark:text-game-400 text-sm font-bold rounded-lg">
            {currentIndex + 1} / {replay.messages.length}
          </span>
        </div>
      </header>

      {/* 进度条 */}
      <div className="h-1.5 bg-gray-200 dark:bg-dark-700">
        <div
          className="h-full bg-gradient-to-r from-game-500 to-purple-500 transition-all duration-300 relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-gradient-to-br from-game-500 to-purple-600 rounded-full shadow-lg" />
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-1">
            {messages.map((message, index) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* 播放控制栏 */}
      <div className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-dark-700/50 px-6 py-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* 速度控制 */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-xs text-gray-500 mr-2 font-medium">播放速度:</span>
            {speedOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setPlaySpeed(option.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  playSpeed === option.value
                    ? 'bg-gradient-to-r from-game-500 to-purple-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* 播放按钮 */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleReset}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors shadow-sm"
              title="重置"
            >
              <span className="text-xl">⏮</span>
            </button>

            {isPlaying ? (
              <button
                onClick={handlePause}
                className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 text-white transition-colors shadow-lg shadow-game-500/30"
                title="暂停"
              >
                <span className="text-2xl">⏸</span>
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 text-white transition-colors shadow-lg shadow-game-500/30"
                title="播放"
              >
                <span className="text-2xl ml-1">▶</span>
              </button>
            )}

            <button
              onClick={() => {
                setCurrentIndex(replay.messages.length - 1)
                setMessages(replay.messages)
                setIsPlaying(false)
              }}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors shadow-sm"
              title="跳到结尾"
            >
              <span className="text-xl">⏭</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  )
}
