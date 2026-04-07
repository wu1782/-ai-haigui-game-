import { useState, useCallback } from 'react'
import type { TGameState, TStory, TMessage, TGameStatus } from '../types'

interface UseGameReturn {
  gameState: TGameState
  startGame: (story: TStory) => void
  endGame: (status: TGameStatus) => void
  addMessage: (message: TMessage) => void
  incrementQuestionCount: () => void
  resetGame: () => void
}

const initialState: TGameState = {
  story: null,
  messages: [],
  status: 'playing',
  questionCount: 0,
  startTime: undefined
}

export function useGame(): UseGameReturn {
  const [gameState, setGameState] = useState<TGameState>(initialState)

  const startGame = useCallback((story: TStory) => {
    setGameState({
      story,
      messages: [],
      status: 'playing',
      questionCount: 0,
      startTime: Date.now()
    })
  }, [])

  const endGame = useCallback((status: TGameStatus) => {
    setGameState(prev => ({
      ...prev,
      status
    }))
  }, [])

  const addMessage = useCallback((message: TMessage) => {
    setGameState(prev => ({
      ...prev,
      messages: [...prev.messages, message]
    }))
  }, [])

  const incrementQuestionCount = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      questionCount: prev.questionCount + 1
    }))
  }, [])

  const resetGame = useCallback(() => {
    setGameState(initialState)
  }, [])

  return {
    gameState,
    startGame,
    endGame,
    addMessage,
    incrementQuestionCount,
    resetGame
  }
}
