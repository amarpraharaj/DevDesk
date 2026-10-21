
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? '/api'

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

type ErrorResponse = {
  message?: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { body, headers: initialHeaders, ...init } = options
  const headers = new Headers(initialHeaders)

  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  let data: unknown

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const errorData = data as ErrorResponse | null
    throw new ApiError(
      errorData?.message ?? 'Something went wrong. Please try again.',
      response.status,
    )
  }

  return data as T
}
