// 语音识别与合成 Hook - 使用 Web Speech API
import { useState, useCallback, useEffect, useRef } from 'react'

interface UseVoiceReturn {
  isListening: boolean
  isSpeaking: boolean
  transcript: string
  interimTranscript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  speak: (text: string) => void
  stopSpeaking: () => void
  isSupported: boolean
  voiceReady: boolean
}

// 检查浏览器支持
const checkSupport = (): { speechRecognition: boolean; speechSynthesis: boolean } => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  return {
    speechRecognition: !!SpeechRecognition,
    speechSynthesis: 'speechSynthesis' in window
  }
}

export function useVoice(): UseVoiceReturn {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [voiceReady, setVoiceReady] = useState(false)

  const recognitionRef = useRef<any>(null)
  const supportRef = useRef(checkSupport())

  // 初始化语音合成声音
  useEffect(() => {
    if (supportRef.current.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        const chineseVoice = voices.find(v => v.lang.includes('zh'))
        if (chineseVoice || voices.length > 0) {
          setVoiceReady(true)
        }
      }

      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices

      return () => {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  // 初始化语音识别
  useEffect(() => {
    if (!supportRef.current.speechRecognition) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'zh-CN'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      setTranscript(finalTranscript)
      setInterimTranscript(interimTranscript)
    }

    recognition.onerror = (event: any) => {
      console.error('[Voice] Recognition error:', event.error)

      switch (event.error) {
        case 'no-speech':
          setError('没有检测到语音，请重试')
          break
        case 'audio-capture':
          setError('无法访问麦克风')
          break
        case 'not-allowed':
          setError('麦克风权限被拒绝，请在浏览器设置中允许')
          break
        case 'network':
          setError('网络错误，请检查网络连接')
          break
        default:
          setError(`语音识别错误: ${event.error}`)
      }

      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  // 开始监听
  const startListening = useCallback(() => {
    if (!supportRef.current.speechRecognition) {
      setError('您的浏览器不支持语音识别')
      return
    }

    if (isListening) return

    setTranscript('')
    setInterimTranscript('')
    setError(null)

    try {
      recognitionRef.current?.start()
    } catch (e) {
      // 如果已经在运行，先停止
      recognitionRef.current?.abort()
      try {
        recognitionRef.current?.start()
      } catch (e2) {
        setError('启动语音识别失败')
      }
    }
  }, [isListening])

  // 停止监听
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }, [isListening])

  // 文字转语音
  const speak = useCallback((text: string) => {
    if (!supportRef.current.speechSynthesis) {
      setError('您的浏览器不支持语音合成')
      return
    }

    // 停止当前正在播放的
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 1.0
    utterance.pitch = 1.0

    // 尝试选择中文语音
    const voices = window.speechSynthesis.getVoices()
    const chineseVoice = voices.find(v => v.lang.includes('zh'))
    if (chineseVoice) {
      utterance.voice = chineseVoice
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
      setError(null)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
    }

    utterance.onerror = (event: any) => {
      console.error('[Voice] Synthesis error:', event.error)
      setIsSpeaking(false)
      if (event.error !== 'canceled') {
        setError('语音播放失败')
      }
    }

    window.speechSynthesis.speak(utterance)
  }, [])

  // 停止说话
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  return {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isSupported: supportRef.current.speechRecognition && supportRef.current.speechSynthesis,
    voiceReady
  }
}
