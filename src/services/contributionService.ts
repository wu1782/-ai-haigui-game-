/**
 * 投稿服务 - 故事投稿和审核 API
 */

import { STORAGE_KEYS } from '../constants'
import type { ContributePayload, Contribution, ContributionStory, StoryStatus } from '../types/story'

const API_BASE = '/api/v1/stories'

// 获取 token
function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
}

// 通用请求头
function getHeaders(): HeadersInit {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

// ============ 用户接口 ============

/**
 * 提交故事投稿
 */
export async function contribute(data: ContributePayload): Promise<{ id: string; title: string; status: StoryStatus; createdAt: string }> {
  const response = await fetch(`${API_BASE}/contribute`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '投稿失败')
  }

  return response.json().then(res => res.data)
}

/**
 * 获取我的投稿列表
 */
export async function getMyContributions(params?: {
  page?: number
  limit?: number
  status?: StoryStatus
}): Promise<{
  contributions: Contribution[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.status) searchParams.set('status', params.status)

  const queryString = searchParams.toString()
  const url = `${API_BASE}/my-contributions${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    headers: getHeaders()
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '获取投稿列表失败')
  }

  const result = await response.json()
  return result.data
}

// ============ 管理员接口 ============

/**
 * 获取待审核故事列表
 */
export async function getPendingStories(params?: {
  page?: number
  limit?: number
}): Promise<{
  stories: ContributionStory[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  const queryString = searchParams.toString()
  const url = `${API_BASE}/pending${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    headers: getHeaders()
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '获取待审核列表失败')
  }

  const result = await response.json()
  return result.data
}

/**
 * 获取审核列表（按状态）
 */
export async function getReviewStories(
  status: StoryStatus,
  params?: { page?: number; limit?: number }
): Promise<{
  stories: ContributionStory[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.limit) searchParams.set('limit', String(params.limit))

  const queryString = searchParams.toString()
  const url = `${API_BASE}/review/${status}${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    headers: getHeaders()
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '获取审核列表失败')
  }

  const result = await response.json()
  return result.data
}

/**
 * 获取故事详情（用于审核）
 */
export async function getStoryDetailForReview(storyId: string): Promise<ContributionStory & { bottom: string }> {
  const response = await fetch(`${API_BASE}/review/detail/${storyId}`, {
    headers: getHeaders()
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '获取故事详情失败')
  }

  const result = await response.json()
  return result.data
}

/**
 * 审核故事
 */
export async function reviewStory(
  storyId: string,
  action: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<{ id: string; status: StoryStatus; reviewedAt: string }> {
  const response = await fetch(`${API_BASE}/${storyId}/review`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ action, rejectionReason })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '审核操作失败')
  }

  const result = await response.json()
  return result.data
}

/**
 * 获取审核统计数据
 */
export async function getReviewStats(): Promise<{
  pending: number
  approved: number
  rejected: number
  total: number
}> {
  const response = await fetch(`${API_BASE}/stats`, {
    headers: getHeaders()
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '获取统计数据失败')
  }

  const result = await response.json()
  return result.data
}
