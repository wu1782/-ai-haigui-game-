import type { TStory } from './story'
import type { TMessage } from './message'

// GameState - 游戏状态
export type TGameStatus = 'playing' | 'success' | 'failed'

export interface TGameState {
  story: TStory | null
  messages: TMessage[]
  status: TGameStatus
  questionCount: number
  startTime?: number
}

// 枚举定义
export enum EGameStatus {
  Playing = 'playing',
  Success = 'success',
  Failed = 'failed'
}
