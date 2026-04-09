/**
 * 提示面板组件 - 显示提示类型选择和历史
 */
import { memo, useState, useCallback } from 'react'

interface HintPanelProps {
  isOpen: boolean
  onClose: () => void
  hints: Array<{
    type: string
    hint: string
    cost?: number
    timestamp: number
  }>
  onRequestHint: (type: string) => void
  currentCost: number
  remainingScore: number
}

export const HintPanel = memo(function HintPanel({
  isOpen,
  onClose,
  hints,
  onRequestHint,
  currentCost: _currentCost,
  remainingScore
}: HintPanelProps) {
  const [, setSelectedType] = useState<string | null>(null)

  const hintTypes = [
    {
      id: 'dimension',
      label: '维度提示',
      description: '引导思考方向',
      cost: 0,
      icon: '💡',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'direction',
      label: '方向提示',
      description: '判断答案方向',
      cost: 10,
      icon: '➡️',
      color: 'from-emerald-500 to-teal-500'
    },
    {
      id: 'partial',
      label: '线索提示',
      description: '透露部分答案',
      cost: 25,
      icon: '🔍',
      color: 'from-amber-500 to-orange-500'
    }
  ]

  const handleSelectType = useCallback((typeId: string) => {
    setSelectedType(typeId)
    onRequestHint(typeId)
  }, [onRequestHint])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="relative bg-white dark:bg-dark-800 rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-hidden">
        {/* 装饰 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full" />

        <div className="relative">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                💡
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI 提示</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">选择提示类型获取帮助</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <span className="text-gray-500">✕</span>
            </button>
          </div>

          {/* 成本显示 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-dark-700/50 dark:to-dark-700 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">当前得分</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{remainingScore}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${remainingScore}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              使用提示会扣除相应分数，累计最多扣除 75%
            </p>
          </div>

          {/* 提示类型选择 */}
          <div className="space-y-3 mb-6">
            {hintTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectType(type.id)}
                disabled={type.cost > remainingScore}
                className={`
                  w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                  ${type.cost > remainingScore
                    ? 'border-gray-200 dark:border-dark-700 opacity-50 cursor-not-allowed'
                    : 'border-gray-100 dark:border-dark-700 hover:border-amber-300 dark:hover:border-amber-500'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center text-2xl shadow-lg`}>
                    {type.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 dark:text-white">{type.label}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        type.cost === 0
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                      }`}>
                        {type.cost === 0 ? '免费' : `-${type.cost}%`}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{type.description}</p>
                  </div>
                  <div className="text-gray-400">
                    →
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* 提示历史 */}
          {hints.length > 0 && (
            <div className="border-t border-gray-100 dark:border-dark-700 pt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">提示历史</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {hints.map((hint, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 dark:bg-dark-700/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {hint.type === 'dimension' ? '维度' : hint.type === 'direction' ? '方向' : '线索'}
                      </span>
                      {hint.cost !== undefined && hint.cost > 0 && (
                        <span className="text-xs text-red-500">-{hint.cost}%</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{hint.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 关闭按钮 */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-dark-700">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300
                         rounded-xl hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors font-medium text-sm"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default HintPanel
