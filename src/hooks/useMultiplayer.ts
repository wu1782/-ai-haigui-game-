// 多人游戏状态管理 Hook
import { useState, useCallback, useEffect, useRef } from 'react'
import { socketService } from '../services/socketService'
import type { TStory } from '../types'

export interface Player {
  id: string
  name: string
  isReady: boolean
  isWinner: boolean
  questionCount: number
}

export interface GameMessage {
  id: string
  playerId: string
  playerName: string
  question: string
  answer: string
  timestamp: number
}

export interface Room {
  id: string
  hostId: string
  hostName: string
  players: Player[]
  story: TStory | null
  status: 'waiting' | 'playing' | 'finished'
}

export interface RoomListItem {
  id: string
  hostId: string
  hostName: string
  playerCount: number
  maxPlayers: number
  status: string
  storyTitle: string
}

export interface UseMultiplayerReturn {
  // 连接状态
  isConnected: boolean
  isConnecting: boolean
  error: string | null

  // 房间状态
  room: Room | null
  currentPlayer: Player | null

  // 游戏状态
  gameStatus: 'waiting' | 'playing' | 'finished'
  messages: GameMessage[]
  winner: Player | null

  // 操作方法
  connect: () => Promise<void>
  disconnect: () => void
  createRoom: (hostName: string, story: TStory) => Promise<void>
  joinRoom: (roomId: string, playerName: string) => Promise<void>
  leaveRoom: () => Promise<void>
  toggleReady: (ready: boolean) => Promise<void>
  startGame: () => Promise<void>
  askQuestion: (question: string) => Promise<{ answer: string; isVictory: boolean }>
  guessAnswer: (guess: string) => Promise<{ answer: string; isVictory: boolean }>

  // 房间列表
  roomList: RoomListItem[]
  refreshRoomList: () => Promise<void>

  // Socket ID
  getSocketId: () => string | undefined
}

// 最大重连次数
const MAX_RECONNECT_ATTEMPTS = 3

export function useMultiplayer(): UseMultiplayerReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting')
  const [messages, setMessages] = useState<GameMessage[]>([])
  const [winner, setWinner] = useState<Player | null>(null)
  const [roomList, setRoomList] = useState<RoomListItem[]>([])

  const reconnectListenerRef = useRef<(() => void) | null>(null)
  const connectionPromiseRef = useRef<Promise<void> | null>(null)
  const reconnectAttemptsRef = useRef(0)

  // 连接
  const connect = useCallback(async () => {
    // 如果已连接，直接返回
    if (socketService.isConnected()) {
      if (!isConnected) setIsConnected(true)
      return
    }

    // 如果正在连接，返回现有的连接 Promise
    if (connectionPromiseRef.current) {
      return connectionPromiseRef.current
    }

    // 防止无限重连
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setError('连接失败，请检查网络后重试')
      return
    }

    setIsConnecting(true)
    setError(null)

    // 创建连接 Promise 并保存引用
    connectionPromiseRef.current = (async () => {
      try {
        await socketService.connect()
        setIsConnected(true)
        reconnectAttemptsRef.current = 0

        // 设置断开重连监听
        reconnectListenerRef.current = () => {
          setIsConnected(false)
          // 先检查再自增，确保最多尝试MAX_RECONNECT_ATTEMPTS次
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++
            connect()
          }
        }
        socketService.on('reconnect', reconnectListenerRef.current)
      } catch (e) {
        setError(e instanceof Error ? e.message : '连接失败')
        setIsConnected(false)
        throw e
      } finally {
        setIsConnecting(false)
        connectionPromiseRef.current = null
      }
    })()

    return connectionPromiseRef.current
  }, [isConnected])

  // 断开连接
  const disconnect = useCallback(() => {
    socketService.disconnect()
    setIsConnected(false)
    setRoom(null)
    setCurrentPlayer(null)
    setGameStatus('waiting')
    setMessages([])
    setWinner(null)

    if (reconnectListenerRef.current) {
      socketService.off('reconnect', reconnectListenerRef.current)
    }
  }, [])

  // 创建房间
  const createRoom = useCallback(async (hostName: string, story: TStory) => {
    setError(null)
    try {
      const result = await socketService.createRoom(hostName, story)
      setRoom({
        id: result.room.id,
        hostId: result.room.hostId,
        hostName: hostName,
        players: result.room.players,
        story: result.room.story,
        status: 'waiting'
      })
      setGameStatus('waiting')
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建房间失败')
      throw e
    }
  }, [])

  // 加入房间
  const joinRoom = useCallback(async (roomId: string, playerName: string) => {
    setError(null)
    try {
      const result = await socketService.joinRoom(roomId, playerName)
      setRoom({
        id: result.room.id,
        hostId: result.room.hostId,
        hostName: result.room.hostName,
        players: result.room.players,
        story: result.room.story,
        status: result.room.status
      })
      setGameStatus(result.room.status)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加入房间失败')
      throw e
    }
  }, [])

  // 离开房间
  const leaveRoom = useCallback(async () => {
    try {
      await socketService.leaveRoom()
    } catch (e) {
      // 忽略错误
    }
    setRoom(null)
    setCurrentPlayer(null)
    setGameStatus('waiting')
    setMessages([])
    setWinner(null)
  }, [])

  // 准备/取消准备
  const toggleReady = useCallback(async (ready: boolean) => {
    try {
      await socketService.toggleReady(ready)
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
      throw e
    }
  }, [])

  // 开始游戏
  const startGame = useCallback(async () => {
    try {
      await socketService.startGame()
    } catch (e) {
      setError(e instanceof Error ? e.message : '开始游戏失败')
      throw e
    }
  }, [])

  // 提问
  const askQuestion = useCallback(async (question: string) => {
    try {
      const result = await socketService.askQuestion(question)
      return { answer: result.answer, isVictory: result.isVictory }
    } catch (e) {
      setError(e instanceof Error ? e.message : '提问失败')
      throw e
    }
  }, [])

  // 猜答案
  const guessAnswer = useCallback(async (guess: string) => {
    try {
      const result = await socketService.guessAnswer(guess)
      return { answer: result.answer, isVictory: result.isVictory }
    } catch (e) {
      setError(e instanceof Error ? e.message : '猜答案失败')
      throw e
    }
  }, [])

  // 刷新房间列表
  const refreshRoomList = useCallback(async () => {
    try {
      const result = await socketService.getRoomList()
      setRoomList(result.rooms || [])
    } catch (e) {
      console.error('Failed to get room list:', e)
    }
  }, [])

  // 设置 Socket 事件监听
  useEffect(() => {
    const handlers = {
      'player-joined': (data: any) => {
        setRoom(prev => prev ? {
          ...prev,
          players: data.players
        } : null)
      },
      'player-left': (data: any) => {
        setRoom(prev => prev ? {
          ...prev,
          players: data.players,
          hostId: data.newHostId
        } : null)
      },
      'player-ready': (data: any) => {
        setRoom(prev => prev ? {
          ...prev,
          players: data.players
        } : null)
      },
      'game-started': (data: any) => {
        setGameStatus('playing')
        setCurrentPlayer(data.currentPlayer)
        setMessages([])
        setWinner(null)
      },
      'answer-question': (data: any) => {
        setMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          playerId: data.playerId,
          playerName: data.playerName,
          question: data.question,
          answer: data.answer,
          timestamp: Date.now()
        }])
        setCurrentPlayer(data.currentPlayer)
      },
      'game-over': (data: any) => {
        setGameStatus('finished')
        setWinner(data.winner)
      }
    }

    // 注册所有监听器
    Object.entries(handlers).forEach(([event, handler]) => {
      socketService.on(event, handler)
    })

    // 清理所有监听器
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socketService.off(event, handler)
      })
    }
  }, [])

  return {
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
    getSocketId: () => socketService.getSocketId()
  }
}
