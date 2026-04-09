/**
 * 音效设置面板组件
 */
import { memo, useState, useCallback } from 'react'
import { useSound } from '../hooks/useSound'

interface SoundSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export const SoundSettings = memo(function SoundSettings({ isOpen, onClose }: SoundSettingsProps) {
  const { playSound } = useSound()

  const [masterVolume, setMasterVolume] = useState(() => {
    try {
      const settings = localStorage.getItem('turtle-soup-settings')
      if (settings) {
        const parsed = JSON.parse(settings)
        return parsed.volume || 50
      }
    } catch {
      // ignore
    }
    return 50
  })

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [ambientSound, setAmbientSound] = useState<string | null>(null)

  const soundTypes = [
    { id: 'send', label: '发送消息', icon: '📤' },
    { id: 'receive', label: '收到回复', icon: '📥' },
    { id: 'victory', label: '胜利', icon: '🏆' },
    { id: 'defeat', label: '失败', icon: '😢' },
    { id: 'click', label: '点击', icon: '👆' },
    { id: 'panel', label: '面板', icon: '📋' }
  ]

  const ambientSounds = [
    { id: 'rain', label: '雨声', icon: '🌧' },
    { id: 'night', label: '夜晚', icon: '🌙' },
    { id: 'forest', label: '森林', icon: '🌲' },
    { id: 'city', label: '城市', icon: '🏙' },
    { id: 'underwater', label: '水下', icon: '🌊' }
  ]

  // 播放测试音效
  const handleTestSound = useCallback((soundId: string) => {
    if (soundEnabled) {
      playSound(soundId as any)
    }
  }, [soundEnabled, playSound])

  // 保存设置
  const saveSettings = useCallback((updates: { volume?: number; enabled?: boolean; ambient?: string | null }) => {
    try {
      const settings = localStorage.getItem('turtle-soup-settings')
      const current = settings ? JSON.parse(settings) : {}
      const updated = { ...current, ...updates }
      localStorage.setItem('turtle-soup-settings', JSON.stringify(updated))
    } catch {
      // ignore
    }
  }, [])

  // 切换音效开关
  const handleToggleSound = useCallback(() => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    saveSettings({ enabled: newValue })
  }, [soundEnabled, saveSettings])

  // 调整音量
  const handleVolumeChange = useCallback((value: number) => {
    setMasterVolume(value)
    saveSettings({ volume: value })
  }, [saveSettings])

  // 选择环境音
  const handleSelectAmbient = useCallback((soundId: string | null) => {
    setAmbientSound(soundId)
    saveSettings({ ambient: soundId })
  }, [saveSettings])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="relative bg-white dark:bg-dark-800 rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* 装饰 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />

        <div className="relative">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-game-500/20 flex items-center justify-center">
                <span className="text-2xl">🔊</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">音效设置</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">自定义游戏音效体验</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <span className="text-gray-500">✕</span>
            </button>
          </div>

          {/* 音效总开关 */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">🔔</span>
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">游戏音效</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {soundEnabled ? '已开启' : '已关闭'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggleSound}
                className={`
                  relative w-14 h-7 rounded-full transition-colors duration-300
                  ${soundEnabled ? 'bg-gradient-to-r from-game-500 to-purple-500' : 'bg-gray-300 dark:bg-dark-600'}
                `}
              >
                <div
                  className={`
                    absolute top-1 w-5 h-5 rounded-full bg-white shadow-md
                    transition-transform duration-300
                    ${soundEnabled ? 'translate-x-8' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          </div>

          {/* 音量调节 */}
          <div className={`mb-6 ${!soundEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              主音量: {masterVolume}%
            </label>
            <div className="flex items-center gap-3">
              <span className="text-gray-400">🔈</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={masterVolume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-dark-600 rounded-lg appearance-none cursor-pointer accent-game-500"
              />
              <span className="text-gray-400">🔊</span>
            </div>
          </div>

          {/* 测试各音效 */}
          <div className={`mb-6 ${!soundEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              测试音效
            </label>
            <div className="grid grid-cols-3 gap-2">
              {soundTypes.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => handleTestSound(sound.id)}
                  className="p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors flex flex-col items-center gap-1"
                >
                  <span className="text-lg">{sound.icon}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{sound.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 环境音效 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              环境音效 <span className="text-xs text-gray-400">(可选)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSelectAmbient(null)}
                className={`
                  px-4 py-2 rounded-xl text-sm font-medium transition-colors
                  ${ambientSound === null
                    ? 'bg-gradient-to-r from-game-500 to-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600'
                  }
                `}
              >
                无
              </button>
              {ambientSounds.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => handleSelectAmbient(sound.id)}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1
                    ${ambientSound === sound.id
                      ? 'bg-gradient-to-r from-game-500 to-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600'
                    }
                  `}
                >
                  <span>{sound.icon}</span>
                  <span>{sound.label}</span>
                </button>
              ))}
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

export default SoundSettings
