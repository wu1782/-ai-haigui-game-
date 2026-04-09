/**
 * 好友相关类型定义
 */

export interface Friend {
  id: string
  username: string
  avatar?: string
  status: 'online' | 'offline'
  addedAt: string
}

export interface FriendRequest {
  id: string
  fromUser: {
    id: string
    username: string
    avatar?: string
  }
  toUser: {
    id: string
    username: string
    avatar?: string
  }
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export interface UserSearchResult {
  id: string
  username: string
  avatar?: string
  isFriend: boolean
  hasSentRequest: boolean
  hasReceivedRequest: boolean
}

export interface Pagination {
  page: number
  pages: number
  total: number
  hasMore: boolean
}

export interface PaginatedSearchResult {
  users: UserSearchResult[]
  pagination: Pagination
}

export type FriendTab = 'list' | 'requests' | 'search'
