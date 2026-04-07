// 玩家列表组件 - 霓虹风格
import type { Player } from '../hooks/useMultiplayer'

interface PlayerListProps {
  players: Player[]
  currentPlayerId?: string
  hostId: string
  isGameStarted: boolean
}

function PlayerList({ players, currentPlayerId, hostId, isGameStarted }: PlayerListProps) {
  const getPlayerStatus = (player: Player) => {
    if (player.isWinner) {
      return { icon: '👑', label: '胜利', className: 'text-yellow-400 bg-yellow-400/10' }
    }
    if (!isGameStarted) {
      if (player.id === hostId) {
        return { icon: '👤', label: '房主', className: 'text-neon-400 bg-neon-400/10' }
      }
      return { icon: '🎮', label: player.isReady ? '已准备' : '等待中', className: player.isReady ? 'text-emerald-400 bg-emerald-400/10' : 'text-ink-400 bg-dark-600' }
    }
    return { icon: '🎮', label: `提问${player.questionCount}次`, className: 'text-ink-300 bg-dark-600' }
  }

  return (
    <div className="bg-dark-800/80 rounded-xl p-4 border border-neon-500/10">
      <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
        <span className="text-neon-400">👥</span>
        玩家列表 ({players.length})
      </h3>

      <div className="space-y-2">
        {players.map((player, index) => {
          const status = getPlayerStatus(player)
          const isSelf = player.id === currentPlayerId

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2 rounded-lg transition-all
                ${isSelf ? 'bg-neon-500/10 border border-neon-500/20' : 'bg-dark-700/50'}
              `}
            >
              <div className="flex items-center gap-3">
                {/* 玩家序号 */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${isSelf ? 'bg-neon-500/30 text-neon-300' : 'bg-dark-600 text-ink-300'}
                `}>
                  {index + 1}
                </div>

                {/* 玩家名称 */}
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${isSelf ? 'text-white font-medium' : 'text-ink-100'}`}>
                    {player.name}
                  </span>
                  {isSelf && <span className="text-xs text-neon-400">(你)</span>}
                </div>
              </div>

              {/* 状态 */}
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${status.className}`}>
                <span>{status.icon}</span>
                <span>{status.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 当前回合指示 */}
      {isGameStarted && (
        <div className="mt-3 pt-3 border-t border-neon-500/10">
          <div className="text-xs text-ink-400 text-center">
            等待 <span className="text-neon-400 font-medium">
              {players.find(p => p.id === currentPlayerId)?.name || '...'}
            </span> 提问
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerList
