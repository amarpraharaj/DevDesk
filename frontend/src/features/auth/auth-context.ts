import { createContext } from 'react'

import type {
  AuthUser,
  DeleteAccountInput,
  LoginInput,
  RegisterInput,
} from './auth.api'

export type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
  login: (input: LoginInput) => Promise<AuthUser>
  register: (input: RegisterInput) => Promise<AuthUser>
  logout: () => Promise<void>
  deleteAccount: (input: DeleteAccountInput) => Promise<void>
  refreshUser: () => Promise<AuthUser | null>
  clearError: () => void
}

export const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined)