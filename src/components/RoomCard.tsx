// 房间卡片组件 - 霓虹风格
interface RoomCardProps {
  room: {
    id: string
    hostId: string
    hostName: string
    playerCount: number
    maxPlayers: number
    status: string
    storyTitle: string
  }
  onJoin: (roomId: string) => void
  isJoining?: boolean
}

function RoomCard({ room, onJoin, isJoining }: RoomCardProps) {
  const isFull = room.playerCount >= room.maxPlayers
  const isPlaying = room.status === 'playing'

  return (
    <div className="bg-dark-800/90 backdrop-blur-sm rounded-2xl p-4 border border-neon-500/10
                    hover:border-neon-400/30 hover:bg-dark-700/80 transition-all duration-200">
      {/* 房间号 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-mono text-neon-400 font-bold">{room.id}</span>
          {isPlaying && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
              游戏中
            </span>
          )}
          {!isPlaying && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              等待中
            </span>
          )}
        </div>
        <span className="text-xs text-ink-400">房主: {room.hostName}</span>
      </div>

      {/* 故事标题 */}
      <div className="mb-3">
        <h3 className="text-white font-medium text-sm truncate">{room.storyTitle}</h3>
      </div>

      {/* 玩家人数 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-ink-300 text-sm">
            {room.playerCount}/{room.maxPlayers}
          </span>
          <div className="flex gap-0.5">
            {[...Array(room.maxPlayers)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < room.playerCount ? 'bg-neon-400' : 'bg-dark-600'
                }`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => onJoin(room.id)}
          disabled={isFull || isPlaying || isJoining}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all
            ${isFull || isPlaying
              ? 'bg-dark-700 text-ink-400 cursor-not-allowed'
              : 'bg-neon-500/20 text-neon-400 hover:bg-neon-500/30 border border-neon-500/30'
            }
          `}
        >
          {isJoining ? '加入中...' : isFull ? '已满' : isPlaying ? '游戏中' : '加入'}
        </button>
      </div>
    </div>
  )
}

export default RoomCard
