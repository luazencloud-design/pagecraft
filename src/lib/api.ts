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

async function request<T>(url: string, options: ApiOptions = {}): Promise<T> {
  const { timeout = 60000, ...fetchOptions } = options

  // BYOK — 저장된 Gemini 키를 헤더로 첨부 (있으면 BYOK, 없으면 서버가 로그인/체험으로 판단)
  const userKey = getStoredApiKey()

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

/**
 * 서버 응답 본문을 사용자에게 보일 문장으로 편다.
 *
 * `request`가 실패 시 응답 본문 **원문**을 `ApiError.message`로 던지기 때문에, 그대로 화면에
 * 넣으면 `{"error":"…","code":"…"}` 가 노출된다. 서버는 이미 친화적 문구를 만들어 보내므로
 * 여기서 껍데기만 벗기고, 원인 추적용 코드는 괄호로 붙여 남긴다.
 */
export function parseApiError(msg: string, fallback = '요청을 처리하지 못했습니다.'): string {
  try {
    const body = JSON.parse(msg)
    if (typeof body?.error === 'string') {
      return body.code ? `${body.error} (${body.code})` : body.error
    }
  } catch {
    // JSON이 아니면(네트워크 오류 등) 원문이 곧 메시지다
  }
  return msg || fallback
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
  patch<T>(url: string, body: unknown, options?: ApiOptions) {
    return request<T>(url, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },
  del<T>(url: string, options?: ApiOptions) {
    return request<T>(url, { ...options, method: 'DELETE' })
  },
}

export { ApiError }
