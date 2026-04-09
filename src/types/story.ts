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

// 故事状态
export type StoryStatus = 'pending' | 'approved' | 'rejected'

// 审核信息
export interface ReviewInfo {
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
}

// 投稿故事（扩展 TStory）
export interface ContributionStory extends Partial<TStory> {
  id: string
  title: string
  surface: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  starLevel?: number
  keywords?: string[]
  tags?: string[]
  hint?: string
  status: StoryStatus
  contributorId?: string
  contributor?: {
    id: string
    username: string
    avatar?: string
  }
  reviewInfo?: ReviewInfo
  createdAt: string
}

// 投稿表单数据
export interface ContributePayload {
  title: string
  surface: string
  bottom: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  starLevel?: number
  keywords?: string[]
  tags?: string[]
  hint?: string
}

// 单个投稿记录
export interface Contribution {
  id: string
  title: string
  surface: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  starLevel: number
  status: StoryStatus
  rejectionReason?: string
  createdAt: string
  contributorName?: string
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
