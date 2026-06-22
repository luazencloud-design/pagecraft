import { AsyncLocalStorage } from 'async_hooks'

/**
 * BYOK — 요청별 Gemini API 키를 비동기 컨텍스트에 주입
 *
 * 라우트 핸들러가 헤더(x-gemini-key)에서 키를 읽어 runWithKey()로 감싸면,
 * 그 안에서 호출되는 모든 ai.service 함수가 getApiKey()로 같은 키를 읽음.
 * 함수 시그니처를 바꾸지 않아도 되고, 동시 요청 간 키 격리도 보장됨.
 */
const keyStore = new AsyncLocalStorage<string>()

export function runWithKey<T>(key: string, fn: () => Promise<T>): Promise<T> {
  return keyStore.run(key, fn)
}

/** 현재 요청 컨텍스트의 사용자 키 (없으면 undefined) */
export function currentRequestKey(): string | undefined {
  return keyStore.getStore()
}
