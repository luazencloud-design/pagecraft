'use client'

import { useApiKeyStore } from '@/stores/apiKeyStore'
import { useAuthStore } from '@/stores/authStore'
import { CREDIT_COST, type CreditType } from '@/lib/credits'

/**
 * 크레딧이 적용되는(무료 체험) 모드인지.
 * - BYOK(본인 키 입력) → false (무제한, 크레딧 개념 없음)
 * - 무제한(직원용) → false
 * - 비로그인 → false
 * - 체험 로그인 → true (버튼에 소모 크레딧 표시)
 */
export function useShowCredits(): boolean {
  const hasApiKey = useApiKeyStore((s) => s.apiKey.trim().length > 0)
  const loggedIn = useAuthStore((s) => s.loggedIn)
  const unlimited = useAuthStore((s) => s.unlimited)
  const hasTrial = useAuthStore((s) => !!s.trial)
  return !hasApiKey && loggedIn && !unlimited && hasTrial
}

/**
 * 버튼 텍스트 뒤에 붙이는 크레딧 라벨러.
 * 체험 모드면 ' (크레딧 N개)', 아니면 '' (BYOK/무제한에선 안 보임).
 * 사용: `✦ 생성${creditLabel('generate')}`
 */
export function useCreditLabel(): (type: CreditType, multiplier?: number) => string {
  const show = useShowCredits()
  return (type, multiplier = 1) =>
    show ? ` (크레딧 ${CREDIT_COST[type] * Math.max(1, Math.floor(multiplier))}개)` : ''
}
