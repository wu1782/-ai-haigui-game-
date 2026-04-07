/**
 * 用户统计面板组件 - 霓虹风格
 */
import { getUserStats, getCurrentRank, getNextRankWins, getAllAchievements } from '../data/userData'

function UserStatsPanel() {
  const stats = getUserStats()
  const currentRank = getCurrentRank(stats)
  const allAchievements = getAllAchievements()
  const nextRankWins = getNextRankWins(stats.rank)

  return (
    <div className="bg-dark-800/95 rounded-2xl p-5 border border-neon-500/20 max-w-sm mx-auto card-glow">
      {/* 段位展示 */}
      <div className="flex items-center gap-4 mb-5 pb-4 border-b border-neon-500/10">
        <div className="w-14 h-14 rounded-full bg-neon-500/20 border-2 border-neon-500/40
                      flex items-center justify-center text-2xl neon-glow-purple">
          {currentRank.icon}
        </div>
        <div>
          <div className="text-neon-400 text-sm font-medium">Lv.{stats.rank}</div>
          <div className="text-white text-lg font-bold">{currentRank.title}</div>
          {nextRankWins > 0 && (
            <div className="text-ink-400 text-xs">
              还需 {nextRankWins} 胜场升级
            </div>
          )}
        </div>
      </div>

      {/* 统计数据 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-3 bg-dark-700/50 rounded-xl border border-neon-500/10">
          <div className="text-xl font-bold text-neon-400">{stats.totalGames}</div>
          <div className="text-ink-400 text-xs">总场次</div>
        </div>
        <div className="text-center p-3 bg-dark-700/50 rounded-xl border border-emerald-500/10">
          <div className="text-xl font-bold text-emerald-400">{stats.totalWins}</div>
          <div className="text-ink-400 text-xs">胜利</div>
        </div>
        <div className="text-center p-3 bg-dark-700/50 rounded-xl border border-neon-500/10">
          <div className="text-xl font-bold text-white">{stats.winRate}%</div>
          <div className="text-ink-400 text-xs">胜率</div>
        </div>
      </div>

      {/* 连胜记录 */}
      <div className="flex justify-around mb-4 py-3 bg-dark-700/50 rounded-xl border border-neon-500/10">
        <div className="text-center">
          <div className="text-lg font-bold text-rose-400">{stats.currentStreak}</div>
          <div className="text-ink-400 text-xs">当前连胜</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-neon-400">{stats.bestStreak}</div>
          <div className="text-ink-400 text-xs">最高连胜</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-400">{stats.perfectGames}</div>
          <div className="text-ink-400 text-xs">完美破案</div>
        </div>
      </div>

      {/* 成就列表 */}
      <div>
        <h4 className="text-white text-sm font-medium mb-3">
          成就 ({stats.achievements.length}/{allAchievements.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {allAchievements.map(achievement => (
            <div
              key={achievement.id}
              className={`w-10 h-10 rounded-full bg-dark-700 border border-neon-500/20
                       flex items-center justify-center text-lg cursor-pointer
                       transition-all hover:scale-110 hover:neon-glow-purple
                       ${stats.achievements.includes(achievement.id) ? '' : 'opacity-30 grayscale'}`}
              title={`${achievement.title}: ${achievement.description}`}
            >
              {achievement.icon}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default UserStatsPanel
