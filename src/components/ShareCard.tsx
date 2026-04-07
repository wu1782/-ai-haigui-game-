import type { TStory } from '../types'

interface ShareCardProps {
  story: TStory
  questionCount: number
  isWin: boolean
  elapsedTimeFormatted?: string
  difficulty: string
}

/**
 * 分享卡片组件 - 用于生成分享图片
 */
export default function ShareCard({
  story,
  questionCount,
  isWin,
  elapsedTimeFormatted
}: ShareCardProps) {
  const difficultyLabels = {
    easy: '入门',
    medium: '中等',
    hard: '困难',
    extreme: '极难'
  }

  return (
    <div className="w-80 bg-gradient-to-br from-amber-900 to-red-950 rounded-2xl p-6 shadow-2xl">
      {/* 标题 */}
      <div className="text-center mb-4">
        <div className="text-4xl mb-2">{isWin ? '🎉' : '😢'}</div>
        <h2 className="text-xl font-bold text-amber-100">
          {isWin ? '恭喜破案！' : '下次再战'}
        </h2>
      </div>

      {/* 故事信息 */}
      <div className="bg-black/30 rounded-xl p-4 mb-4">
        <h3 className="text-lg font-bold text-amber-200 mb-2">{story.title}</h3>
        <div className="flex items-center gap-3 text-sm text-amber-300/70">
          <span>{difficultyLabels[story.difficulty as keyof typeof difficultyLabels]}</span>
          <span>·</span>
          <span>{story.starLevel}星</span>
        </div>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{questionCount}</div>
          <div className="text-xs text-amber-300/60">提问次数</div>
        </div>
        {elapsedTimeFormatted && (
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">{elapsedTimeFormatted}</div>
            <div className="text-xs text-amber-300/60">用时</div>
          </div>
        )}
      </div>

      {/* 底部 */}
      <div className="text-center">
        <div className="text-2xl mb-1">🐢</div>
        <div className="text-xs text-amber-300/50">AI海龟汤</div>
      </div>
    </div>
  )
}
