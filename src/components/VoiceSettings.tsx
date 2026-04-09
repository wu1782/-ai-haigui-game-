/**
 * 语音设置面板组件
 */
import { memo, useState, useEffect, useCallback } from 'react'
import { useVoice } from '../hooks/useVoice'

interface VoiceSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export const VoiceSettings = memo(function VoiceSettings({ isOpen, onClose }: VoiceSettingsProps) {
  const { stopSpeaking, isSpeaking, voiceReady, isSupported } = useVoice()

  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [speechRate, setSpeechRate] = useState(1.0)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [testText, setTestText] = useState('这是一段测试语音，你可以调节语速和选择不同的声音。')

  // 加载可用声音
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        const chineseVoices = voices.filter(v => v.lang.includes('zh'))
        setAvailableVoices(chineseVoices.length > 0 ? chineseVoices : voices)
        if (chineseVoices.length > 0) {
          setSelectedVoice(chineseVoices[0])
        }
      }

      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices

      return () => {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  // 测试语音
  const handleTest = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking()
      setIsTesting(false)
    } else {
      setIsTesting(true)
      const utterance = new SpeechSynthesisUtterance(testText)
      utterance.lang = 'zh-CN'
      utterance.rate = speechRate
      utterance.pitch = 1.0
      if (selectedVoice) {
        utterance.voice = selectedVoice
      }

      utterance.onend = () => {
        setIsTesting(false)
      }
      utterance.onerror = () => {
        setIsTesting(false)
      }

      window.speechSynthesis.speak(utterance)
    }
  }, [testText, speechRate, selectedVoice, isSpeaking, stopSpeaking])

  // 停止测试
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isSpeaking])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="relative bg-white dark:bg-dark-800 rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-hidden">
        {/* 装饰 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />

        <div className="relative">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-game-500/20 flex items-center justify-center">
                <span className="text-2xl">🎤</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">语音设置</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">自定义语音输入和播报</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <span className="text-gray-500">✕</span>
            </button>
          </div>

          {/* 语音识别状态 */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">语音识别</span>
              {isSupported ? (
                <span className="px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full">
                  支持
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full">
                  不支持
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isSupported
                ? '您的浏览器支持语音输入，可以对着麦克风说话来输入问题。'
                : '您的浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器。'}
            </p>
          </div>

          {/* 语音合成设置 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                选择声音
              </label>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const voice = availableVoices.find(v => v.name === e.target.value)
                  if (voice) setSelectedVoice(voice)
                }}
                className="w-full bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl px-4 py-2.5
                           text-sm text-gray-900 dark:text-white focus:outline-none focus:border-game-500"
                disabled={!voiceReady}
              >
                {availableVoices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                语速: {speechRate.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-dark-600 rounded-lg appearance-none cursor-pointer accent-game-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0.5x (慢)</span>
                <span>1.0x (正常)</span>
                <span>2.0x (快)</span>
              </div>
            </div>

            {/* 测试语音 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                测试语音
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="输入测试文本..."
                  className="flex-1 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl px-4 py-2
                             text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-game-500"
                />
                <button
                  onClick={handleTest}
                  disabled={!voiceReady || !testText.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-game-500 to-purple-600 text-white text-sm font-medium rounded-xl
                             hover:from-game-600 hover:to-purple-700 transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isTesting ? '停止' : '播放'}
                </button>
              </div>
            </div>
          </div>

          {/* 关闭按钮 */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-dark-700">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300
                         rounded-xl hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors font-medium text-sm"
            >
              完成设置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default VoiceSettings
