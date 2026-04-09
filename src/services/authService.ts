/**
 * 认证服务
 * 调用后端认证 API
 */

import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../types/auth'
import { STORAGE_KEYS } from '../constants'

const API_BASE = '/api/v1/auth'

/**
 * 注册
 */
export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // 发送cookies
    body: JSON.stringify({
      username: credentials.username,
      email: credentials.email,
      password: credentials.password,
      confirmPassword: credentials.confirmPassword || credentials.password
    })
  })

  let data
  try {
    data = await response.json()
  } catch {
    if (!response.ok) {
      throw new Error('注册失败，服务器响应异常')
    }
    throw new Error('服务器响应格式错误')
  }

  if (!response.ok) {
    throw new Error(data.error || '注册失败')
  }

  return data.data
}

/**
 * 登录
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // 发送cookies
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password
    })
  })

  let data
  try {
    data = await response.json()
  } catch {
    if (!response.ok) {
      throw new Error('登录失败，服务器响应异常')
    }
    throw new Error('服务器响应格式错误')
  }

  if (!response.ok) {
    throw new Error(data.error || '登录失败')
  }

  return data.data
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(token: string): Promise<{ user: User }> {
  const response = await fetch(`${API_BASE}/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    credentials: 'include' // 发送 cookies
  })

  let data
  try {
    data = await response.json()
  } catch {
    if (!response.ok) {
      throw new Error('获取用户信息失败，服务器响应异常')
    }
    throw new Error('服务器响应格式错误')
  }

  if (!response.ok) {
    throw new Error(data.error || '获取用户信息失败')
  }

  return data
}

/**
 * 更新用户统计
 */
export async function updateUserStats(token: string, stats: object): Promise<void> {
  const response = await fetch(`${API_BASE}/stats`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ stats })
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || '更新统计失败')
  }
}

/**
 * 更新用户资料（头像和用户名）
 */
export async function updateProfile(
  token: string,
  data: { username?: string; avatar?: string }
): Promise<{ user: User }> {
  const response = await fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || '更新资料失败')
  }

  return result
}

/**
 * 保存 token 到 localStorage
 */
export function saveToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
}

/**
 * 获取 token
 */
export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
}

/**
 * 删除 token
 */
export function removeToken(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
}

/**
 * 保存用户信息到 localStorage
 */
export function saveUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user))
}

/**
 * 获取用户信息
 */
export function getUser(): User | null {
  const userStr = localStorage.getItem(STORAGE_KEYS.AUTH_USER)
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * 删除用户信息
 */
export function removeUser(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_USER)
}

/**
 * 登出 - 调用服务器清除cookie
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include'
    })
  } catch (e) {
    console.warn('Logout API call failed:', e)
  }
  // 清除本地存储
  removeToken()
  removeUser()
}
