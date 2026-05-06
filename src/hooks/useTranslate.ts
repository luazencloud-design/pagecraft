'use client'

import { useCallback } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useProductStore } from '@/stores/productStore'
import { useUsageStore } from '@/stores/usageStore'
import { api } from '@/lib/api'
import { showToast } from '@/components/ui/Toast'
import type { GeneratedAll, TranslateRequest } from '@/types/ai'
import type { Lang } from '@/types/product'
import { PLATFORM_META } from '@/types/product'

/**
 * 다른 언어로 콘텐츠 재작성 — 큐텐(JP) ↔ 쿠팡(KR) 톤 변환
 *
 * 동작:
 * 1. 캐시 hit → 즉시 전환 (무비용)
 * 2. 캐시 miss → /api/translate 호출 + 결과 저장 + 전환
 */
export function useTranslate() {
  const { product } = useProductStore()
  const {
    currentLang, langCache,
    generatedContent, generatedTitles, generatedTags,
    setGeneratedAllForLang, switchLang, setIsTranslating,
  } = useEditorStore()

  const translateTo = useCallback(async (toLang: Lang): Promise<boolean> => {
    if (toLang === currentLang) return true

    // 1. 캐시 hit
    if (switchLang(toLang)) return true

    // 2. 원본이 없으면 종료
    if (!generatedContent) {
      showToast('먼저 AI 생성을 실행해주세요.', 'error')
      return false
    }

    // 3. 캐시 miss → API 호출
    setIsTranslating(true)
    try {
      const fromAll: GeneratedAll = {
        content: generatedContent,
        titles: generatedTitles,
        tags: generatedTags.map((t) => t.text),
      }

      // 타겟 플랫폼: toLang의 마켓에 맞는 기본 플랫폼 사용
      // (qoo10 ↔ coupang 양방향 재작성)
      const targetPlatform = toLang === 'ja' ? 'qoo10-jp' : 'coupang'

      const payload: TranslateRequest = {
        current: fromAll,
        fromLang: currentLang,
        toLang,
        targetPlatform,
      }

      const result = await api.post<GeneratedAll>('/api/translate', payload)
      setGeneratedAllForLang(toLang, result)
      useUsageStore.getState().fetchUsage()

      const langLabel = toLang === 'ja' ? '일본어' : '한국어'
      showToast(`${langLabel} 버전이 생성되었습니다`)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : '번역에 실패했습니다.'
      showToast(msg, 'error')
      console.error('번역 실패:', err)
      return false
    } finally {
      setIsTranslating(false)
    }
  }, [
    currentLang, generatedContent, generatedTitles, generatedTags,
    switchLang, setGeneratedAllForLang, setIsTranslating,
  ])

  /** 현재 플랫폼 기준 "다른 언어 만들기" 가능 여부 */
  const meta = PLATFORM_META[product.platform]
  const canTranslate = !!generatedContent && meta?.market === 'jp'

  /** 다음 토글 대상 언어 (단순 양방향 토글) */
  const altLang: Lang = currentLang === 'ja' ? 'ko' : 'ja'

  return {
    translateTo,
    canTranslate,
    altLang,
    isCached: !!langCache[altLang],
  }
}
