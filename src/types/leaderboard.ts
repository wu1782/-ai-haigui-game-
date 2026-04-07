/**
 * 排行榜类型定义
 */

// 排行榜条目
export interface LeaderboardEntry {
  rank: number          // 排名
  playerName: string    // 玩家名称
  avatar?: string       // 头像
  value: number         // 数值
  storyId?: string      // 相关故事ID
  storyTitle?: string   // 相关故事标题
  date: string          // 日期
}

// 排行榜类型
export type LeaderboardType = 'fastest' | 'fewest_questions' | 'contribution' | 'streak'

// 排行榜配置
export interface LeaderboardConfig {
  type: LeaderboardType
  title: string
  icon: string
  unit: string
  description: string
}

export const LEADERBOARD_CONFIGS: LeaderboardConfig[] = [
  {
    type: 'fastest',
    title: '推理最快',
    icon: '⚡',
    unit: '秒',
    description: '最短时间内破案'
  },
  {
    type: 'fewest_questions',
    title: '提问最少',
    icon: '🧠',
    unit: '次',
    description: '用最少的提问破案'
  },
  {
    type: 'contribution',
    title: '汤底贡献',
    icon: '📝',
    unit: '个',
    description: '贡献最多原创汤底'
  },
  {
    type: 'streak',
    title: '最高连胜',
    icon: '🔥',
    unit: '连',
    description: '达到最高连胜纪录'
  }
]
