/**
 * 新手引导组件
 * 引导新用户了解游戏玩法
 */
import { useEffect, useRef } from 'react'
import { useOnboarding } from '../hooks/useOnboarding'

interface OnboardingGuideProps {
  onComplete?: () => void
}

export function OnboardingGuide({ onComplete }: OnboardingGuideProps) {
  const {
    currentStep,
    currentStepIndex,
    isVisible,
    totalSteps,
    nextStep,
    prevStep,
    skipOnboarding
  } = useOnboarding()

  const bubbleRef = useRef<HTMLDivElement>(null)

  // 当引导完成时调用回调
  useEffect(() => {
    if (!isVisible && onComplete) {
      onComplete()
    }
  }, [isVisible, onComplete])

  // ESC 键关闭引导
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipOnboarding()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, skipOnboarding])

  if (!isVisible) return null

  const getPositionClasses = () => {
    switch (currentStep.position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-4'
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-4'
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-4'
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-4'
      case 'center':
      default:
        return 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
    }
  }

  const getArrowClasses = () => {
    switch (currentStep.position) {
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2 border-t-game-500 border-x-transparent border-b-transparent border-8'
      case 'bottom':
        return 'bottom-full left-1/2 -translate-x-1/2 border-b-game-500 border-x-transparent border-t-transparent border-8'
      case 'left':
        return 'left-full top-1/2 -translate-y-1/2 border-l-game-500 border-y-transparent border-r-transparent border-8'
      case 'right':
        return 'right-full top-1/2 -translate-y-1/2 border-r-game-500 border-y-transparent border-l-transparent border-8'
      case 'center':
      default:
        return '' // No arrow for center position
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" />

      {/* 高亮动画效果 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full animate-pulse bg-game-500/10" />
      </div>

      {/* 引导气泡 */}
      <div
        ref={bubbleRef}
        className={`absolute ${getPositionClasses()} pointer-events-auto`}
      >
        {/* 箭头 */}
        {currentStep.position !== 'center' && (
          <div
            className={`absolute ${getArrowClasses()}`}
            style={{ borderWidth: '12px' }}
          />
        )}

        {/* 气泡内容 */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full animate-fade-in border border-game-500/20">
          {/* 装饰 */}
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-game-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">{currentStepIndex + 1}</span>
          </div>

          {/* 标题 */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 pr-6">
            {currentStep.title}
          </h3>

          {/* 内容 */}
          <p className="text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
            {currentStep.content}
          </p>

          {/* 进度指示器 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === currentStepIndex
                      ? 'w-4 bg-game-500'
                      : i < currentStepIndex
                      ? 'bg-game-500/50'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* 上一步 */}
              {currentStepIndex > 0 && (
                <button
                  onClick={prevStep}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  上一步
                </button>
              )}

              {/* 跳过 */}
              <button
                onClick={skipOnboarding}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                跳过
              </button>

              {/* 下一步/完成 */}
              <button
                onClick={nextStep}
                className="px-4 py-1.5 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
              >
                {currentStepIndex === totalSteps - 1 ? '开始游戏' : '下一步'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 键盘提示 */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-400 pointer-events-none">
        按 <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300 mx-1">ESC</kbd> 跳过引导
      </div>
    </div>
  )
}

export default OnboardingGuide
