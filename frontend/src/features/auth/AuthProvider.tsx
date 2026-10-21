import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { ApiError } from '../../lib/api'

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from './auth.api'

import { AuthContext } from './auth-context'

type AuthProviderProps = {
  children: ReactNode
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const response = await getCurrentUser()

      setUser(response.data.user)
      setError(null)

      return response.data.user
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null)
        setError(null)
        return null
      }

      setError(getErrorMessage(err))
      throw err
    }
  }, [])

  useEffect(() => {
    let active = true

    async function checkSession() {
      try {
        const response = await getCurrentUser()

        if (active) {
          setUser(response.data.user)
          setError(null)
        }
      } catch (err) {
        if (!active) return

        if (err instanceof ApiError && err.status === 401) {
          setUser(null)
          setError(null)
        } else {
          setError(getErrorMessage(err))
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void checkSession()

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(
    async (input: LoginInput): Promise<AuthUser> => {
      const response = await loginUser(input)

      setUser(response.data.user)
      setError(null)

      return response.data.user
    },
    [],
  )

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthUser> => {
      const response = await registerUser(input)

      setError(null)

      return response.data.user
    },
    [],
  )

  const logout = useCallback(async (): Promise<void> => {
    await logoutUser()

    setUser(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        register,
        logout,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}