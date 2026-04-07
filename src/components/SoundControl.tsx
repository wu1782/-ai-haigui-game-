/**
 * 音效控制组件 - 游戏化风格
 */
import { useState, useEffect } from 'react'
import { getUserSettings, saveUserSettings } from '../data/userData'

function SoundControl() {
  const [settings, setSettings] = useState(getUserSettings)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSettings(getUserSettings)
    }
  }, [isOpen])

  const toggleSound = () => {
    const newSettings = { ...settings, soundEnabled: !settings.soundEnabled }
    saveUserSettings(newSettings)
    setSettings(newSettings)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSettings = { ...settings, volume: Number(e.target.value) }
    saveUserSettings(newSettings)
    setSettings(newSettings)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-700 dark:to-dark-800
                   hover:from-pink-100 hover:to-rose-200 dark:hover:from-pink-900/50 dark:hover:to-rose-900/50
                   border border-gray-200 dark:border-dark-600 hover:border-pink-400 dark:hover:border-pink-500/50
                   transition-all duration-300 active:scale-95 group overflow-hidden"
        title="音效设置"
      >
        {/* 悬停光晕 */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-pink-400/20 to-rose-400/20" />

        <div className="relative">
          {settings.soundEnabled ? (
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white/95 dark:bg-dark-800/95 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-600/50 p-4 shadow-xl z-50 animate-scale-in">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <span className="text-white text-sm">🔊</span>
              </div>
              <span className="text-gray-900 dark:text-white text-sm font-bold">音效设置</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              ×
            </button>
          </div>

          {/* 音效开关 */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-dark-700/50 rounded-xl">
            <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">音效</span>
            <button
              onClick={toggleSound}
              className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                settings.soundEnabled
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500'
                  : 'bg-gray-300 dark:bg-dark-600'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                settings.soundEnabled ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>

          {/* 音量滑块 */}
          {settings.soundEnabled && (
            <div className="space-y-2">
              <label className="text-gray-600 dark:text-gray-400 text-xs font-medium flex items-center justify-between">
                <span>音量</span>
                <span className="text-pink-500 font-bold">{settings.volume}%</span>
              </label>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.volume}
                  onChange={handleVolumeChange}
                  className="w-full h-2 bg-gray-200 dark:bg-dark-600 rounded-full appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:w-4
                            [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:bg-gradient-to-r
                            [&::-webkit-slider-thumb]:from-pink-500
                            [&::-webkit-slider-thumb]:to-rose-500
                            [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:shadow-lg
                            [&::-webkit-slider-thumb]:cursor-pointer
                            [&::-webkit-slider-thumb]:transition-transform
                            [&::-webkit-slider-thumb]:hover:scale-110"
                />
                {/* 进度条背景 */}
                <div
                  className="absolute top-0 left-0 h-2 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full pointer-events-none"
                  style={{ width: `${settings.volume}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SoundControl
