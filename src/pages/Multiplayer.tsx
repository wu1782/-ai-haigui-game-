// 多人游戏页面 - 游戏化风格
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMultiplayer } from '../hooks/useMultiplayer'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import { stories } from '../data/stories'
import RoomCard from '../components/RoomCard'
import PlayerList from '../components/PlayerList'
import VoiceControl from '../components/VoiceControl'
import type { TStory } from '../types'
import { PageTransition } from '../components/PageTransition'

type MultiplayerPhase = 'lobby' | 'create' | 'join' | 'room'

function Multiplayer() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { isAuthenticated } = useAuth()
  const {
    isConnected,
    isConnecting,
    error,
    room,
    currentPlayer,
    gameStatus,
    messages,
    winner,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleReady,
    startGame,
    askQuestion,
    guessAnswer,
    roomList,
    refreshRoomList,
    getSocketId
  } = useMultiplayer()

  const [phase, setPhase] = useState<MultiplayerPhase>('lobby')
  const [playerName, setPlayerName] = useState('')
  const [roomIdInput, setRoomIdInput] = useState('')
  const [selectedStory, setSelectedStory] = useState<TStory | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  // 输入问题
  const [questionInput, setQuestionInput] = useState('')
  const [guessInput, setGuessInput] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [isGuessing, setIsGuessing] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 登录检查
  useEffect(() => {
    if (!isAuthenticated) {
      showToast('请先登录后进入多人游戏', 'warning')
      navigate('/auth')
    }
  }, [isAuthenticated, navigate, showToast])

  // 初始化连接
  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      connect().catch(console.error)
    }
  }, [isConnected, connect, isAuthenticated])

  // 自动刷新房间列表
  useEffect(() => {
    if (phase === 'lobby') {
      refreshRoomList()
      const interval = setInterval(refreshRoomList, 5000)
      return () => clearInterval(interval)
    }
  }, [phase, refreshRoomList])

  // 自动滚动消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 监听语音输入
  const handleTranscriptChange = useCallback((text: string) => {
    if (text && gameStatus === 'playing' && currentPlayer?.id === getSocketId()) {
      setQuestionInput(text)
    }
  }, [gameStatus, currentPlayer, getSocketId])

  // 创建房间
  const handleCreateRoom = async () => {
    if (!playerName.trim() || !selectedStory) return

    if (!isConnected) {
      try {
        await connect()
      } catch (e) {
        return
      }
    }

    try {
      await createRoom(playerName.trim(), selectedStory)
      setPhase('room')
    } catch (e) {
      // 错误已在 hook 中设置
    }
  }

  // 加入房间
  const handleJoinRoom = async (roomId?: string) => {
    const targetRoomId = roomId || roomIdInput.trim().toUpperCase()
    if (!playerName.trim() || !targetRoomId) return

    if (!isConnected) {
      try {
        await connect()
      } catch (e) {
        return
      }
    }

    setIsJoining(true)
    try {
      await joinRoom(targetRoomId, playerName.trim())
      setPhase('room')
      setRoomIdInput('')
    } catch (e) {
      // 错误已在 hook 中设置
    } finally {
      setIsJoining(false)
    }
  }

  // 离开房间
  const handleLeaveRoom = async () => {
    await leaveRoom()
    setPhase('lobby')
    setSelectedStory(null)
    setIsReady(false)
  }

  // 切换准备状态
  const handleToggleReady = async () => {
    const newReady = !isReady
    setIsReady(newReady)
    try {
      await toggleReady(newReady)
    } catch (e) {
      setIsReady(!newReady)
    }
  }

  // 开始游戏
  const handleStartGame = async () => {
    try {
      await startGame()
    } catch (e) {
      // 错误已在 hook 中设置
    }
  }

  // 提问
  const handleAskQuestion = async () => {
    if (!questionInput.trim() || isAsking) return

    setIsAsking(true)
    setCurrentAnswer(null)

    try {
      const result = await askQuestion(questionInput.trim())
      setCurrentAnswer(result.answer)
      setQuestionInput('')

      if (result.isVictory) {
        // 游戏结束，Winner 状态会通过 socket 更新
      }
    } catch (e) {
      // 错误已在 hook 中设置
    } finally {
      setIsAsking(false)
    }
  }

  // 猜答案
  const handleGuessAnswer = async () => {
    if (!guessInput.trim() || isGuessing) return

    setIsGuessing(true)
    try {
      const result = await guessAnswer(guessInput.trim())
      setCurrentAnswer(result.answer)
      setGuessInput('')

      if (result.isVictory) {
        // 游戏结束
      }
    } catch (e) {
      // 错误已在 hook 中设置
    } finally {
      setIsGuessing(false)
    }
  }

  // 返回首页
  const handleBack = () => {
    disconnect()
    navigate('/')
  }

  const socketId = getSocketId()
  const isHost = socketId ? room?.hostId === socketId : false
  const isMyTurn = socketId ? currentPlayer?.id === socketId : false

  // 渲染大厅
  if (phase === 'lobby') {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/20 to-purple-50/20 dark:from-dark-900 dark:via-game-900/10 dark:to-purple-900/10 relative overflow-hidden">
          {/* 背景装饰 */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-game-500/10 to-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
          </div>

          {/* 顶部导航 */}
          <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50 sticky top-0 z-30">
            <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
              <button
                onClick={handleBack}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              >
                <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
                <span className="text-sm font-medium hidden sm:inline">返回</span>
              </button>
              <div className="flex items-center gap-3">
                <span className="text-2xl">👥</span>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">多人模式</h1>
              </div>
              <div className="w-20" />
            </div>
          </header>

          <div className="relative z-10 max-w-2xl mx-auto px-6 py-8">
            {/* 玩家名称输入 */}
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 mb-6 shadow-lg">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">你的昵称</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="输入昵称..."
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl
                           text-gray-900 dark:text-white placeholder-gray-400 text-sm
                           focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20 transition-all"
              />
            </div>

            {/* 操作按钮 */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setPhase('create')}
                disabled={!playerName.trim() || !isConnected}
                className="p-5 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50
                           hover:border-game-500/50 hover:shadow-lg
                           disabled:opacity-40 disabled:cursor-not-allowed transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-game-500/20 to-purple-500/20 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                  ➕
                </div>
                <div className="text-gray-900 dark:text-white font-bold mb-1">创建房间</div>
                <div className="text-gray-500 text-xs">
                  {!isConnected ? '连接中...' : '创建专属游戏房间'}
                </div>
              </button>

              <button
                onClick={() => setPhase('join')}
                disabled={!playerName.trim() || !isConnected}
                className="p-5 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50
                           hover:border-purple-500/50 hover:shadow-lg
                           disabled:opacity-40 disabled:cursor-not-allowed transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform">
                  🚪
                </div>
                <div className="text-gray-900 dark:text-white font-bold mb-1">加入房间</div>
                <div className="text-gray-500 text-xs">
                  {!isConnected ? '连接中...' : '输入房间号加入'}
                </div>
              </button>
            </div>

            {/* 连接状态 */}
            {isConnecting && (
              <div className="text-center py-3 text-game-500 text-sm mb-4 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-game-500/30 border-t-game-500 rounded-full animate-spin" />
                <span>正在连接服务器...</span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-medium">
                {error}
              </div>
            )}

            {/* 房间列表 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-900 dark:text-white font-bold flex items-center gap-2">
                  <span className="w-1 h-5 bg-gradient-to-b from-game-500 to-purple-500 rounded-full" />
                  房间列表
                </h2>
                <button
                  onClick={refreshRoomList}
                  className="px-3 py-1.5 text-xs font-medium text-game-500 hover:bg-game-500/10 rounded-lg transition-colors"
                >
                  刷新
                </button>
              </div>

              {roomList.length === 0 ? (
                <div className="text-center py-12 bg-white/50 dark:bg-dark-800/50 backdrop-blur rounded-2xl border border-gray-200/50 dark:border-dark-700/50">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center text-3xl">
                    🔍
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">暂无房间，创建一个吧！</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {roomList.map(r => (
                    <RoomCard
                      key={r.id}
                      room={r}
                      onJoin={handleJoinRoom}
                      isJoining={isJoining}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </PageTransition>
    )
  }

  // 创建房间
  if (phase === 'create') {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/20 to-purple-50/20 dark:from-dark-900 dark:via-game-900/10 dark:to-purple-900/10 relative overflow-hidden">
        <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50 sticky top-0 z-30">
          <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
            <button
              onClick={() => setPhase('lobby')}
              className="group flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
              <span className="text-sm font-medium">返回</span>
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">创建房间</h1>
            <div className="w-20" />
          </div>
        </header>

        <div className="relative z-10 max-w-2xl mx-auto px-6 py-6">
          <h2 className="text-gray-900 dark:text-white font-bold mb-4 flex items-center gap-2">
            <span className="text-xl">📚</span>
            <span>选择故事</span>
          </h2>

          <div className="space-y-3">
            {stories.map(story => (
              <button
                key={story.id}
                onClick={() => setSelectedStory(story)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedStory?.id === story.id
                    ? 'bg-gradient-to-br from-game-500/10 to-purple-500/10 border-game-500/50 shadow-lg'
                    : 'bg-white/80 dark:bg-dark-800/80 border-gray-200/50 dark:border-dark-700/50 hover:border-game-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900 dark:text-white">{story.title}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                    story.difficulty === 'easy' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                    story.difficulty === 'medium' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                    story.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                    'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                  }`}>
                    {story.difficulty === 'easy' ? '入门' : story.difficulty === 'medium' ? '中等' : story.difficulty === 'hard' ? '困难' : '极难'}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-1">{story.surface}</p>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={handleCreateRoom}
              disabled={!selectedStory}
              className="w-full py-4 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 text-white font-bold
                         rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all shadow-lg shadow-game-500/30 flex items-center justify-center gap-2"
            >
              <span>🎮</span>
              <span>创建房间</span>
            </button>
          </div>
        </div>
        </div>
      </PageTransition>
    )
  }

  // 加入房间
  if (phase === 'join') {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/20 to-purple-50/20 dark:from-dark-900 dark:via-game-900/10 dark:to-purple-900/10 relative overflow-hidden">
          <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50 sticky top-0 z-30">
            <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
              <button
                onClick={() => setPhase('lobby')}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              >
                <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
                <span className="text-sm font-medium">返回</span>
              </button>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">加入房间</h1>
              <div className="w-20" />
            </div>
          </header>

          <div className="relative z-10 max-w-2xl mx-auto px-6 py-6">
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-6 shadow-lg">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <span className="text-xl">🔑</span>
                <span>房间号</span>
              </label>
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                placeholder="输入6位房间号..."
                maxLength={6}
                className="w-full px-4 py-4 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-2xl
                           text-gray-900 dark:text-white placeholder-gray-400 text-center text-2xl tracking-[0.3em] font-mono font-bold
                           focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20 transition-all"
              />
            </div>

            {error && (
              <div className="mt-4 p-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium text-center">
                {error}
              </div>
            )}

            <button
              onClick={() => handleJoinRoom()}
              disabled={roomIdInput.length !== 6}
              className="w-full mt-6 py-4 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 text-white font-bold
                         rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all shadow-lg shadow-game-500/30 flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>加入中...</span>
                </>
              ) : (
                <>
                  <span>🚪</span>
                  <span>加入房间</span>
                </>
              )}
            </button>
          </div>
        </div>
      </PageTransition>
    )
  }

  // 房间内等待
  if (phase === 'room' && room && gameStatus === 'waiting') {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/20 to-purple-50/20 dark:from-dark-900 dark:via-game-900/10 dark:to-purple-900/10 relative overflow-hidden">
          <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50 sticky top-0 z-30">
            <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
              <button
                onClick={handleLeaveRoom}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              >
                <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
                <span className="text-sm font-medium">离开</span>
              </button>
              <div className="px-4 py-2 bg-gradient-to-r from-game-500/20 to-purple-500/20 rounded-xl font-mono font-bold text-game-500">
                {room.id}
              </div>
              <div className="w-20" />
            </div>
          </header>

          <div className="relative z-10 max-w-2xl mx-auto px-6 py-6">
            {/* 故事信息 */}
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 mb-6 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📚</span>
                <span className="text-xs text-gray-500 font-medium">当前故事</span>
              </div>
              <div className="font-bold text-gray-900 dark:text-white mb-2">{room.story?.title}</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2">{room.story?.surface}</p>
            </div>

            {/* 玩家列表 */}
            <div className="mb-6">
              <PlayerList
                players={room.players}
                currentPlayerId={getSocketId?.()}
                hostId={room.hostId}
                isGameStarted={false}
              />
            </div>

            {/* 等待状态 */}
            {!isHost && (
              <div className="text-center py-4 text-gray-500 text-sm mb-4 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-game-500/30 border-t-game-500 rounded-full animate-spin" />
                <span>等待房主开始游戏...</span>
              </div>
            )}

            {/* 操作按钮 */}
            {isHost ? (
              <button
                onClick={handleStartGame}
                disabled={room.players.length < 2}
                className="w-full py-4 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 text-white font-bold
                           rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all shadow-lg shadow-game-500/30 flex items-center justify-center gap-2"
              >
                {room.players.length < 2
                  ? `等待玩家加入 (${room.players.length}/2)`
                  : '🎮 开始游戏'}
              </button>
            ) : (
              <button
                onClick={handleToggleReady}
                className={`w-full py-4 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${
                  isReady
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-dark-600'
                }`}
              >
                {isReady ? '✓ 已准备' : '准备'}
              </button>
            )}

            {error && (
              <div className="mt-4 p-3 bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium text-center">
                {error}
              </div>
            )}
          </div>
        </div>
      </PageTransition>
    )
  }

  // 游戏进行中
  if (phase === 'room' && room && gameStatus === 'playing') {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/20 to-purple-50/20 dark:from-dark-900 dark:via-game-900/10 dark:to-purple-900/10 relative overflow-hidden flex flex-col">
          {/* 顶部栏 */}
          <header className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50 px-6 py-4 flex items-center justify-between shrink-0 z-20">
            <button
              onClick={handleLeaveRoom}
              className="px-3 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors text-sm font-medium"
            >
              退出
            </button>
            <h1 className="text-gray-900 dark:text-white font-bold truncate max-w-[120px] sm:max-w-[200px]">
              {room.story?.title}
            </h1>
            <div className="px-3 py-1.5 bg-game-500/10 text-game-600 dark:text-game-400 text-sm font-bold rounded-lg">
              Q{messages.length}
            </div>
          </header>

          {/* 玩家列表 */}
          <div className="bg-white/50 dark:bg-dark-800/50 px-6 py-3 border-b border-gray-200/50 dark:border-dark-700/50">
            <PlayerList
              players={room.players}
              currentPlayerId={getSocketId?.()}
              hostId={room.hostId}
              isGameStarted={true}
            />
          </div>

          {/* 消息区域 */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* 汤面 */}
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-dark-700/50 mb-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">📜</span>
                <span className="text-xs text-game-500 font-medium">汤面</span>
              </div>
              <p className="text-gray-700 dark:text-gray-200 text-sm">{room.story?.surface}</p>
            </div>

            {/* 聊天消息 */}
            {messages.map((msg, index) => (
              <div key={msg.id || index} className="animate-fade-up">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-game-500/20 to-purple-500/20 flex items-center justify-center text-game-500 font-bold shrink-0">
                    {msg.playerName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-900 dark:text-white text-sm font-bold">{msg.playerName}</span>
                      <span className="text-gray-400 text-xs">{new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur rounded-2xl px-4 py-3 border border-gray-200/50 dark:border-dark-700/50">
                      <p className="text-gray-700 dark:text-gray-200 text-sm mb-1">问：{msg.question}</p>
                      <p className={`text-sm font-bold ${
                        msg.answer === '是' ? 'text-emerald-500' :
                        msg.answer === '不是' || msg.answer === '否' ? 'text-red-500' :
                        msg.answer === '与此无关' ? 'text-gray-400' :
                        msg.answer === '已破案' ? 'text-game-500' : 'text-gray-700 dark:text-gray-200'
                      }`}>
                        答：{msg.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* 当前回答显示 */}
            {currentAnswer && (
              <div className="bg-gradient-to-r from-game-500/10 to-purple-500/10 rounded-2xl px-5 py-4 border border-game-500/20 animate-fade-up">
                <div className="text-game-500 text-xs font-bold mb-1">最新回答</div>
                <p className="text-gray-900 dark:text-white text-lg font-bold">{currentAnswer}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-dark-700/50 px-6 py-4 shrink-0">
            {/* 语音控制 */}
            <div className="flex items-center justify-between mb-3">
              <VoiceControl onTranscriptChange={handleTranscriptChange} disabled={!isMyTurn} />
              {isMyTurn ? (
                <div className="text-game-500 text-xs font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  请提问...
                </div>
              ) : (
                <div className="text-gray-400 text-xs">等待 {currentPlayer?.name} 提问</div>
              )}
            </div>

            {/* 问题/猜答案输入 */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                placeholder={isMyTurn ? '输入问题...' : '等待中...'}
                disabled={!isMyTurn || isAsking}
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-2xl
                           text-gray-900 dark:text-white placeholder-gray-400 text-sm
                           focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20
                           disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              />
              <button
                onClick={handleAskQuestion}
                disabled={!isMyTurn || !questionInput.trim() || isAsking}
                className="px-6 py-3 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 text-white font-bold rounded-2xl text-sm
                           disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-game-500/30"
              >
                {isAsking ? '...' : '提问'}
              </button>
            </div>

            {/* 猜答案按钮 */}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGuessAnswer()}
                placeholder="猜答案..."
                disabled={isGuessing}
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-2xl
                           text-gray-900 dark:text-white placeholder-gray-400 text-sm
                           focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20
                           disabled:opacity-40 transition-all"
              />
              <button
                onClick={handleGuessAnswer}
                disabled={!guessInput.trim() || isGuessing}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-2xl text-sm
                           disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {isGuessing ? '...' : '猜'}
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    )
  }

  // 游戏结束
  if (phase === 'room' && room && gameStatus === 'finished') {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/20 to-purple-50/20 dark:from-dark-900 dark:via-game-900/10 dark:to-purple-900/10 relative overflow-hidden">
          {/* 背景光晕 */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-gradient-to-br from-game-500/10 to-purple-500/10 rounded-full blur-[150px]" />
            {winner && (
              <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-[150px]" />
            )}
          </div>

          <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50 sticky top-0 z-30">
            <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-center">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">游戏结束</h1>
            </div>
          </header>

          <div className="relative z-10 max-w-2xl mx-auto px-6 py-8">
            {/* 结果 */}
            <div className="text-center mb-8 animate-fade-up">
              <div className={`relative inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
                winner
                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-amber-500/50'
                  : 'bg-gradient-to-br from-red-500 to-rose-600 shadow-xl'
              }`}>
                <span className={`text-4xl ${winner ? 'animate-bounce' : ''}`}>
                  {winner ? '👑' : '💀'}
                </span>
              </div>

              <h2 className={`text-2xl font-bold mb-2 ${
                winner ? 'text-gradient' : 'text-gray-900 dark:text-white'
              }`}>
                {winner ? '游戏胜利！' : '游戏结束'}
              </h2>

              {winner && (
                <p className="text-game-500 font-medium">
                  {winner.name} 成功破案！
                </p>
              )}
            </div>

            {/* 汤底 */}
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50 p-6 mb-6 shadow-lg animate-fade-up">
              <h3 className="text-gray-900 dark:text-white font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">🔮</span>
                <span>汤底揭晓</span>
              </h3>
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-1">故事</div>
                <div className="font-bold text-gray-900 dark:text-white">{room.story?.title}</div>
              </div>
              <div className="pt-4 border-t border-gray-200/50 dark:border-dark-700/50">
                <div className="text-xs text-gray-500 mb-2">真相</div>
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{room.story?.bottom}</p>
              </div>
            </div>

            {/* 统计 */}
            <div className="grid grid-cols-2 gap-4 mb-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
              <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-dark-700/50 text-center shadow-sm">
                <div className="text-2xl font-bold text-game-500">{messages.length}</div>
                <div className="text-xs text-gray-500 mt-1">提问总数</div>
              </div>
              <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-200/50 dark:border-dark-700/50 text-center shadow-sm">
                <div className="text-2xl font-bold text-game-500">{room.players.length}</div>
                <div className="text-xs text-gray-500 mt-1">参与玩家</div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 animate-fade-up" style={{ animationDelay: '200ms' }}>
              <button
                onClick={handleLeaveRoom}
                className="flex-1 py-3.5 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-200 font-medium rounded-2xl
                           hover:bg-gray-200 dark:hover:bg-dark-600 transition-all flex items-center justify-center gap-2"
              >
                <span>🏠</span>
                <span>返回大厅</span>
              </button>
              <button
                onClick={() => handleLeaveRoom()}
                className="flex-1 py-3.5 bg-gradient-to-r from-game-500 to-purple-600 text-white font-bold rounded-2xl
                           hover:from-game-600 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>再来一局</span>
              </button>
            </div>
          </div>
        </div>
      </PageTransition>
    )
  }

  return null
}

export default Multiplayer
