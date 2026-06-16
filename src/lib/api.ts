import { getStoredApiKey } from '@/stores/apiKeyStore'

const API_BASE = ''

interface ApiOptions extends RequestInit {
  timeout?: number
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Gemini 키가 필요한 AI 라우트 (market 등 비-AI는 제외) */
function requiresApiKey(url: string): boolean {
  return url.startsWith('/api/ai/') || url.startsWith('/api/image/') || url.startsWith('/api/translate')
}

async function request<T>(url: string, options: ApiOptions = {}): Promise<T> {
  const { timeout = 60000, ...fetchOptions } = options

  // BYOK — 저장된 Gemini 키를 헤더로 첨부
  const userKey = getStoredApiKey()

  // 키 없이 AI 호출 시도 → 네트워크 전에 차단 + 일관된 안내
  if (requiresApiKey(url) && !userKey) {
    throw new ApiError(
      400,
      JSON.stringify({ error: 'Gemini API 키가 필요합니다. 우측 상단 ⚙️ 설정에서 본인 API 키를 입력해주세요.' }),
    )
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(userKey ? { 'x-gemini-key': userKey } : {}),
        ...fetchOptions.headers,
      },
    })

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '')
      throw new ApiError(res.status, errorBody || res.statusText)
    }

    const contentType = res.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return res.json()
    }

    return res.blob() as unknown as T
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  get<T>(url: string, options?: ApiOptions) {
    return request<T>(url, { ...options, method: 'GET' })
  },
  post<T>(url: string, body: unknown, options?: ApiOptions) {
    return request<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    })
  },
}

export { ApiError }
