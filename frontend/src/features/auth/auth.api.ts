
import { apiRequest } from '../../lib/api'

export type AuthUser = {
  id: string
  name: string
  email: string
}

export type RegisterInput = {
  name: string
  email: string
  password: string
}

export type LoginInput = {
  email: string
  password: string
}

type ApiResponse<T> = {
  success: true
  message: string
  data: T
}

type RegisterResponse = ApiResponse<{
  user: AuthUser & {
    createdAt: string
  }
}>

type LoginResponse = ApiResponse<{
  user: AuthUser
}>

type CurrentUserResponse = ApiResponse<{
  user: AuthUser
}>

type LogoutResponse = {
  success: true
  message: string
}

export function registerUser(input: RegisterInput) {
  return apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: input,
  })
}

export function loginUser(input: LoginInput) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: input,
  })
}

export function getCurrentUser() {
  return apiRequest<CurrentUserResponse>('/auth/me', {
    method: 'GET',
  })
}

export function logoutUser() {
  return apiRequest<LogoutResponse>('/auth/logout', {
    method: 'POST',
  })
}


type ForgotPasswordResponse = {
  success: true
  message: string
}

type ResetPasswordResponse = {
  success: true
  message: string
}

export function forgotPasswordUser(email: string) {
  return apiRequest<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  })
}

export function resetPasswordUser(input: {
  token: string
  password: string
}) {
  return apiRequest<ResetPasswordResponse>('/auth/reset-password', {
    method: 'POST',
    body: input,
  })
}
