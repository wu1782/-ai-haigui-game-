/**
 * 游戏回放数据层
 */
import { STORAGE_KEYS } from '../constants'
import type { TMessage, TStory } from '../types'

export interface GameReplay {
  id: string
  storyId: string
  story: TStory
  messages: TMessage[]
  questionCount: number
  isWin: boolean
  endType: 'guess' | 'giveup' | 'timeout'
  elapsedTime: number
  playedAt: string
}

const REPLAYS_KEY = STORAGE_KEYS.REPLAYS || 'turtle-soup-replays'
const MAX_REPLAYS = 100

/**
 * 获取所有回放
 */
export function getReplays(): GameReplay[] {
  try {
    const saved = localStorage.getItem(REPLAYS_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

/**
 * 保存回放
 */
export function saveReplay(replay: Omit<GameReplay, 'id'>): string {
  const replays = getReplays()
  const id = `replay-${Date.now()}`
  const newReplay: GameReplay = { ...replay, id }

  replays.unshift(newReplay) // 最新在前

  // 限制数量
  if (replays.length > MAX_REPLAYS) {
    replays.pop()
  }

  localStorage.setItem(REPLAYS_KEY, JSON.stringify(replays))
  return id
}

/**
 * 获取回放
 */
export function getReplayById(id: string): GameReplay | undefined {
  return getReplays().find(r => r.id === id)
}

/**
 * 删除回放
 */
export function deleteReplay(id: string): void {
  const replays = getReplays().filter(r => r.id !== id)
  localStorage.setItem(REPLAYS_KEY, JSON.stringify(replays))
}

/**
 * 获取回放数量
 */
export function getReplayCount(): number {
  return getReplays().length
}

/**
 * 检查是否可以解锁回放成就
 */
export function checkReplayAchievement(): boolean {
  return getReplayCount() >= 5
}
