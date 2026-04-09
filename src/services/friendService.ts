/**
 * 好友服务 - 调用后端 API
 */
import type { Friend, FriendRequest, PaginatedSearchResult } from '../types/friend'

const FRIENDS_KEY = 'turtle-soup-friends'
const REQUESTS_KEY = 'turtle-soup-friend-requests'

/**
 * 获取好友列表
 */
export async function getFriends(): Promise<Friend[]> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/friends`, {
      method: 'GET',
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('获取好友列表失败')
    }

    const data = await response.json()
    return data.friends || []
  } catch (error) {
    console.error('获取好友列表错误:', error)
    // 降级到本地存储
    try {
      const saved = localStorage.getItem(FRIENDS_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  }
}

/**
 * 获取好友请求列表
 */
export async function getFriendRequests(): Promise<{ received: FriendRequest[]; sent: FriendRequest[] }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/friends/requests`, {
      method: 'GET',
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('获取好友请求失败')
    }

    const data = await response.json()
    return {
      received: data.received || [],
      sent: data.sent || []
    }
  } catch (error) {
    console.error('获取好友请求错误:', error)
    // 降级到本地存储
    try {
      const saved = localStorage.getItem(REQUESTS_KEY)
      return saved ? JSON.parse(saved) : { received: [], sent: [] }
    } catch {
      return { received: [], sent: [] }
    }
  }
}

/**
 * 搜索用户（支持分页）
 */
export async function searchUsers(keyword: string, page = 1, limit = 20): Promise<PaginatedSearchResult> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const params = new URLSearchParams()
  if (keyword) params.set('keyword', keyword)
  params.set('page', String(page))
  params.set('limit', String(limit))
  const url = `${baseUrl}/api/v1/friends/search?${params.toString()}`
  console.log('[FriendService] Searching:', url)

  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include'
    })

    console.log('[FriendService] Response status:', response.status)

    const data = await response.json()
    console.log('[FriendService] Response data:', data)

    if (!response.ok) {
      console.error('搜索用户失败:', data.error || response.status, 'Full response:', data)
      throw new Error(data.error || `搜索用户失败 (${response.status})`)
    }

    return {
      users: data.users || [],
      pagination: data.pagination || { page: 1, pages: 1, total: 0, hasMore: false }
    }
  } catch (error) {
    console.error('搜索用户错误:', error)
    throw error // 让调用方处理错误
  }
}

/**
 * 发送好友请求
 */
export async function sendFriendRequest(toUserId: string): Promise<{ success: boolean; request?: FriendRequest; error?: string }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ toUserId })
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || '发送失败' }
    }

    return { success: true, request: data.request }
  } catch (error) {
    console.error('发送好友请求错误:', error)
    return { success: false, error: '网络错误' }
  }
}

/**
 * 接受好友请求
 */
export async function acceptFriendRequest(requestId: string): Promise<{ success: boolean; friend?: Friend; error?: string }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/friends/request/${requestId}/accept`, {
      method: 'POST',
      credentials: 'include'
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || '接受失败' }
    }

    return { success: true, friend: data.friend }
  } catch (error) {
    console.error('接受好友请求错误:', error)
    return { success: false, error: '网络错误' }
  }
}

/**
 * 拒绝好友请求
 */
export async function rejectFriendRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/friends/request/${requestId}/reject`, {
      method: 'POST',
      credentials: 'include'
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || '拒绝失败' }
    }

    return { success: true }
  } catch (error) {
    console.error('拒绝好友请求错误:', error)
    return { success: false, error: '网络错误' }
  }
}

/**
 * 删除好友
 */
export async function removeFriend(friendId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/friends/friend/${friendId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || '删除失败' }
    }

    return { success: true }
  } catch (error) {
    console.error('删除好友错误:', error)
    return { success: false, error: '网络错误' }
  }
}

/**
 * 取消发送的好友请求
 */
export async function cancelFriendRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/friends/request/${requestId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || '取消失败' }
    }

    return { success: true }
  } catch (error) {
    console.error('取消好友请求错误:', error)
    return { success: false, error: '网络错误' }
  }
}
