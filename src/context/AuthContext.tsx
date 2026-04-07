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
    const initAuth = async () => {
      const token = authService.getToken()
      const savedUser = authService.getUser()

      if (token && savedUser) {
        // 验证 token 是否有效
        try {
          const { user } = await authService.getCurrentUser(token)
          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          })
          // 更新本地存储的用户信息
          authService.saveUser(user)
        } catch {
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
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    initAuth()
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials)
    const { token, user } = response

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
    const response = await authService.register(credentials)
    const { token, user } = response

    authService.saveToken(token)
    authService.saveUser(user)

    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false
    })
  }, [])

  const logout = useCallback(() => {
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
