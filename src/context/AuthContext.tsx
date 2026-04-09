import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AuthState, LoginCredentials, RegisterCredentials } from '../types/auth'
import * as authService from '../services/authService'

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
  updateProfile: (data: { username?: string; avatar?: string }) => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true
  })

  // 初始化 - 检查本地存储的 token
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      const token = authService.getToken()
      const savedUser = authService.getUser()

      if (token && savedUser) {
        // 验证 token 是否有效
        try {
          const { user } = await authService.getCurrentUser(token)
          if (!isMounted) return // 组件已卸载，不再更新状态
          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          })
          // 更新本地存储的用户信息
          authService.saveUser(user)
        } catch {
          if (!isMounted) return
          // token 无效，清除
          authService.removeToken()
          authService.removeUser()
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          })
        }
      } else {
        if (!isMounted) return
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { token, user } = await authService.login(credentials)

    authService.saveToken(token)
    authService.saveUser(user)

    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false
    })
  }, [])

  const register = useCallback(async (credentials: RegisterCredentials) => {
    const { token, user } = await authService.register(credentials)

    authService.saveToken(token)
    authService.saveUser(user)

    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false
    })
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (e) {
      console.warn('Logout API call failed:', e)
    }
    authService.removeToken()
    authService.removeUser()
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false
    })
  }, [])

  const updateProfile = useCallback(async (data: { username?: string; avatar?: string }) => {
    if (!state.token) {
      throw new Error('未登录')
    }
    const { user } = await authService.updateProfile(state.token, data)
    authService.saveUser(user)
    setState(prev => ({ ...prev, user }))
  }, [state.token])

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
