import { useState, useCallback } from 'react'
import type { TMessage, TMessageType } from '../types'

interface UseChatReturn {
  messages: TMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string, role: TMessage['role'], type?: TMessageType) => Promise<void>
  clearMessages: () => void
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<TMessage[]>([])
  const [isLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (
    content: string,
    role: TMessage['role'],
    type: TMessageType = 'system'
  ) => {
    const newMessage: TMessage = {
      id: `msg-${Date.now()}`,
      role,
      content,
      timestamp: Date.now(),
      type,
      status: 'success'
    }

    setMessages(prev => [...prev, newMessage])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages
  }
}
