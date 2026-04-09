/**
 * 排行榜数据管理
 * 从后端 API 获取排行榜数据
 */
import type { LeaderboardEntry, LeaderboardType } from '../types/leaderboard'

const API_BASE = '/api/v1/leaderboard'

// 获取排行榜数据
export async function getLeaderboard(type: LeaderboardType): Promise<LeaderboardEntry[]> {
  try {
    const response = await fetch(`${API_BASE}?type=${type}&limit=50`, {
      credentials: 'include'
    })

    if (!response.ok) {
      console.error('获取排行榜失败:', response.status)
      return []
    }

    const data = await response.json()
    return data.entries.map((entry: any, index: number) => ({
      rank: index + 1,
      playerName: entry.username,
      value: entry.value,
      date: entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '',
      createdAt: entry.createdAt || undefined,
      storyTitle: entry.storyId || undefined
    }))
  } catch (error) {
    console.error('获取排行榜错误:', error)
    return []
  }
}

// 保存排行榜条目（发送到后端）
export async function saveLeaderboardEntry(
  type: LeaderboardType,
  entry: { userId: string; username: string; value: number; storyId?: string }
): Promise<{ success: boolean; rank?: number }> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        userId: entry.userId,
        entryType: type,
        value: entry.value,
        storyId: entry.storyId
      })
    })

    if (!response.ok) {
      console.error('保存排行榜失败:', response.status)
      return { success: false }
    }

    // 获取用户排名
    const rankResponse = await fetch(`${API_BASE}/rank/${entry.userId}?type=${type}`, {
      credentials: 'include'
    })

    if (rankResponse.ok) {
      const rankData = await rankResponse.json()
      return { success: true, rank: rankData.rank }
    }

    return { success: true }
  } catch (error) {
    console.error('保存排行榜错误:', error)
    return { success: false }
  }
}

// 获取用户最佳记录
export async function getUserBestRecord(
  type: LeaderboardType,
  userId: string
): Promise<LeaderboardEntry | null> {
  try {
    const response = await fetch(`${API_BASE}/rank/${userId}?type=${type}`, {
      credentials: 'include'
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (data.rank) {
      return {
        rank: data.rank,
        playerName: '我',
        value: data.value,
        date: ''
      }
    }

    return null
  } catch (error) {
    console.error('获取用户最佳记录错误:', error)
    return null
  }
}
