import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface ApiKeyState {
  /** 사용자 Gemini API 키 — 브라우저 localStorage에만 저장, 서버에 영구 저장 X */
  apiKey: string
  setApiKey: (key: string) => void
  clearApiKey: () => void
  hasKey: () => boolean
}

/**
 * BYOK — 사용자가 입력한 Gemini API 키를 브라우저에 보관.
 * 매 API 요청 시 x-gemini-key 헤더로 전송 (api.ts).
 * 서버는 이 키를 받아 그 즉시 Gemini 호출에만 쓰고 저장하지 않음.
 */
export const useApiKeyStore = create<ApiKeyState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      setApiKey: (key) => set({ apiKey: key.trim() }),
      clearApiKey: () => set({ apiKey: '' }),
      hasKey: () => get().apiKey.trim().length > 0,
    }),
    {
      name: 'pagecraft-gemini-key',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

/** 비반응형 접근 — api.ts 등 컴포넌트 밖에서 현재 키 읽기 */
export function getStoredApiKey(): string {
  return useApiKeyStore.getState().apiKey.trim()
}
