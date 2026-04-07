// Story - 海龟汤故事
export interface TStory {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  starLevel: number        // 星级难度 1-5
  surface: string           // 汤面
  bottom: string           // 汤底
  keywords: string[]        // 关键词
  tags?: string[]          // 标签
  hint?: string            // 提示
  hotScore: number         // 热度值
  playCount: number        // 游玩次数
  createdAt?: string       // 创建时间
}

// 故事排序类型
export type StorySortType = 'latest' | 'hottest' | 'unplayed'

// 游戏记录（用于存储本地游玩状态）
export interface GameRecord {
  storyId: string
  playedAt: string
  questionCount: number
  isWin: boolean
  endType: 'guess' | 'giveup' | 'timeout'
}
