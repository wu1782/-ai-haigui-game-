/**
 * 收藏故事数据层
 */
import { STORAGE_KEYS } from '../constants'

export interface FavoriteStory {
  storyId: string
  addedAt: string
  note?: string
}

const FAVORITES_KEY = STORAGE_KEYS.FAVORITES || 'turtle-soup-favorites'

/**
 * 获取收藏列表
 */
export function getFavorites(): FavoriteStory[] {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

/**
 * 添加收藏
 */
export function addFavorite(storyId: string, note?: string): void {
  const favorites = getFavorites()
  if (!favorites.find(f => f.storyId === storyId)) {
    favorites.push({ storyId, addedAt: new Date().toISOString(), note })
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  }
}

/**
 * 移除收藏
 */
export function removeFavorite(storyId: string): void {
  const favorites = getFavorites().filter(f => f.storyId !== storyId)
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
}

/**
 * 检查是否已收藏
 */
export function isFavorite(storyId: string): boolean {
  return getFavorites().some(f => f.storyId === storyId)
}

/**
 * 切换收藏状态
 */
export function toggleFavorite(storyId: string): boolean {
  if (isFavorite(storyId)) {
    removeFavorite(storyId)
    return false
  } else {
    addFavorite(storyId)
    return true
  }
}

/**
 * 获取收藏数量
 */
export function getFavoriteCount(): number {
  return getFavorites().length
}
