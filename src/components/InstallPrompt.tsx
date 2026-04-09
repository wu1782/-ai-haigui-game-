/**
 * PWA 安装提示组件
 * 在可安装时显示安装横幅
 */
import { memo } from 'react'
import { usePWA } from '../hooks/usePWA'

const InstallPrompt = memo(function InstallPrompt() {
  const { canInstall, install, isInstalled } = usePWA()

  if (!canInstall || isInstalled) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-lg mx-auto bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
            🐢
          </div>
          <div>
            <p className="text-white font-bold">安装 AI 海龟汤</p>
            <p className="text-white/70 text-xs">添加到主屏幕，更方便游玩</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={install}
            className="px-4 py-2 bg-white text-indigo-600 font-bold rounded-xl hover:bg-white/90 transition-colors text-sm"
          >
            安装
          </button>
        </div>
      </div>
    </div>
  )
})

export default InstallPrompt
