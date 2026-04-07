import type { TMessage } from '../types'

interface CluePanelProps {
  messages: TMessage[]
  isOpen: boolean
  onToggle: () => void
}

/**
 * 线索笔记面板 - 游戏化暗夜风格
 * 自动收集所有判定为"是"的关键提问
 */
function CluePanel({ messages, isOpen, onToggle }: CluePanelProps) {
  // 直接收集用户消息中紧跟在"是"之前的
  const directClues: string[] = []
  messages.forEach((msg, index) => {
    if (msg.type === 'is' && index > 0) {
      const prevMsg = messages[index - 1]
      if (prevMsg.role === 'user') {
        directClues.push(prevMsg.content)
      }
    }
  })

  return (
    <>
      {/* 切换按钮 - 游戏化悬浮球 */}
      <button
        onClick={onToggle}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-30 transition-all duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="relative">
          {/* 背景光晕 */}
          <div className="absolute inset-0 bg-game-500/30 rounded-l-full blur-md" />

          <div className="relative bg-gradient-to-b from-dark-800 to-dark-900 border border-game-500/40 border-r-0 rounded-l-full p-3 shadow-game-lg backdrop-blur-sm">
            {/* 装饰线 */}
            <div className="absolute top-2 left-0 w-px h-8 bg-gradient-to-b from-transparent via-game-500/50 to-transparent" />

            <div className="text-game-400 text-xs font-semibold writing-mode-vertical tracking-wider">
              线索
            </div>
            <div className="text-emerald-400 text-lg mt-1 text-center font-bold font-mono">
              {directClues.length}
            </div>

            {/* 状态指示灯 */}
            <div className="mt-2 mx-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </button>

      {/* 侧边面板 */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-gradient-to-b from-dark-900 to-dark-950 backdrop-blur-xl border-l border-game-500/30 z-40 transition-transform duration-300 shadow-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 面板头部 */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-game-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-game-500/20 to-purple-500/20 border border-game-500/30 flex items-center justify-center">
              <span className="text-xl">📋</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">已知事实</h3>
              <p className="text-game-400/70 text-xs">Key Facts</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-400 hover:text-white transition-colors flex items-center justify-center border border-dark-600"
          >
            ×
          </button>
        </div>

        {/* 线索列表 */}
        <div className="p-4 overflow-y-auto h-[calc(100%-80px)]">
          {directClues.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center">
                <span className="text-3xl opacity-30">🔍</span>
              </div>
              <p className="text-gray-400 text-sm font-medium">
                还没有关键突破
              </p>
              <p className="text-gray-500 text-xs mt-2 max-w-[200px] mx-auto">
                当AI回答"是"时，对应的提问会自动记录在这里
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-emerald-400 text-xs font-semibold tracking-wider uppercase">
                  已确认事实
                </span>
                <span className="text-emerald-400 text-lg font-bold font-mono">
                  {directClues.length}
                </span>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent mb-4" />

              {directClues.map((clue, index) => (
                <div
                  key={index}
                  className="relative bg-dark-800/80 rounded-xl p-4 border border-emerald-500/20 shadow-lg overflow-hidden group hover:border-emerald-500/40 transition-colors"
                >
                  {/* 背景装饰 */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full" />

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                      <span className="text-emerald-400 text-xs font-bold">✓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200 text-sm font-medium leading-relaxed">{clue}</p>
                    </div>
                  </div>

                  {/* 序号 */}
                  <div className="absolute -bottom-1 -right-1 text-emerald-500/20 text-4xl font-bold">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部装饰 */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-game-500/30 to-transparent" />
      </div>

      {/* 遮罩层 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
          onClick={onToggle}
        />
      )}
    </>
  )
}

export default CluePanel
