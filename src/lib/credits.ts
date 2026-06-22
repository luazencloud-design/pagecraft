/**
 * AI 작업별 크레딧 단가 — 서버(trial.ts 차감)와 클라(버튼 표시) 공용.
 * 클라에서 import 해도 서버 의존성(ioredis 등) 안 끌려오도록 여기 분리.
 * ⚠️ 값 바꾸면 서버 차감/클라 표시 둘 다 같이 반영됨 (단일 출처).
 */
export const CREDIT_COST = {
  generate: 1,
  image: 5,
  'bg-remove': 5,
  regen: 1,
  gift: 1,
} as const

export type CreditType = keyof typeof CREDIT_COST
