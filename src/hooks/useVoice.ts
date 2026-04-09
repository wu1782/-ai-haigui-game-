// 语音识别与合成 Hook - 使用 Web Speech API (增强版)
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
  // 增强功能
  continuousMode: boolean
  setContinuousMode: (enabled: boolean) => void
  audioLevel: number
  retryCount: number
  maxRetries: number
  registerVoiceCommand: (command: string, callback: () => void) => void
  unregisterVoiceCommand: (command: string) => void
}

// 语音命令类型
type VoiceCommandCallback = () => void

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
  const [continuousMode, setContinuousMode] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  const recognitionRef = useRef<any>(null)
  const supportRef = useRef(checkSupport())
  const voiceCommandsRef = useRef<Map<string, VoiceCommandCallback>>(new Map())
  const audioContextRef = useRef<any>(null)
  const analyserRef = useRef<any>(null)
  const animationFrameRef = useRef<number | null>(null)

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

    recognition.continuous = continuousMode
    recognition.interimResults = true
    recognition.lang = 'zh-CN'
    recognition.maxAlternatives = 1

    // 声音级别监测
    const setupAudioAnalysis = () => {
      try {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
          const source = audioContextRef.current.createMediaStreamSource(stream)
          analyserRef.current = audioContextRef.current.createAnalyser()
          analyserRef.current.fftSize = 256
          source.connect(analyserRef.current)

          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

          const updateLevel = () => {
            if (!analyserRef.current) return
            analyserRef.current.getByteFrequencyData(dataArray)
            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
            setAudioLevel(Math.min(100, average * 1.5))
            if (isListening) {
              animationFrameRef.current = requestAnimationFrame(updateLevel)
            }
          }
          updateLevel()
        }).catch(() => {
          // 麦克风权限被拒绝，静默处理
        })
      } catch {
        // 浏览器不支持
      }
    }

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
      setRetryCount(0)
      setupAudioAnalysis()
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript

          // 检查语音命令
          const transcriptLower = finalTranscript.toLowerCase()
          voiceCommandsRef.current.forEach((callback, command) => {
            if (transcriptLower.includes(command.toLowerCase())) {
              callback()
            }
          })
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
        case 'aborted':
          // 用户主动停止，不显示错误
          break
        default:
          setError(`语音识别错误: ${event.error}`)
      }

      // 自动重试
      if (event.error === 'no-speech' && retryCount < maxRetries) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => {
          try {
            recognition.start()
          } catch {
            // 忽略
          }
        }, 1000)
      } else {
        setIsListening(false)
        setAudioLevel(0)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
      setAudioLevel(0)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [continuousMode, retryCount])

  // 更新连续模式
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.continuous = continuousMode
    }
  }, [continuousMode])

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
    setRetryCount(0)

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
    setAudioLevel(0)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isListening])

  // 注册语音命令
  const registerVoiceCommand = useCallback((command: string, callback: VoiceCommandCallback) => {
    voiceCommandsRef.current.set(command, callback)
  }, [])

  // 注销语音命令
  const unregisterVoiceCommand = useCallback((command: string) => {
    voiceCommandsRef.current.delete(command)
  }, [])

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
    voiceReady,
    continuousMode,
    setContinuousMode,
    audioLevel,
    retryCount,
    maxRetries,
    registerVoiceCommand,
    unregisterVoiceCommand
  }
}
