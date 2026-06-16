'use client'

import { useCallback } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useProductStore } from '@/stores/productStore'
import { useDraftsStore } from '@/stores/draftsStore'
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
    currentLang, langCache, dirtyLang,
    generatedContent, generatedTitles, generatedTags,
    setGeneratedAllForLang, switchLang, setIsTranslating, setTranslatingDraftId,
    cacheLang, setDirty,
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
    const startDraftId = useDraftsStore.getState().currentId
    setIsTranslating(true)
    setTranslatingDraftId(startDraftId)
    try {
      const fromAll: GeneratedAll = {
        content: generatedContent,
        titles: generatedTitles,
        tags: generatedTags.map((t) => t.text),
      }

      // 타겟 플랫폼: 현재 product.platform 그대로 — translate.service가 toLang 우선 분기
      const payload: TranslateRequest = {
        current: fromAll,
        fromLang: currentLang,
        toLang,
        targetPlatform: product.platform,
      }

      const result = await api.post<GeneratedAll>('/api/translate', payload)

      // 결과 도착 — 드래프트 변경 시 백그라운드로 해당 드래프트에 적용
      if (useDraftsStore.getState().currentId !== startDraftId) {
        useDraftsStore.getState().applyTranslationToDraft(startDraftId, toLang, result)
        const draftName = useDraftsStore.getState().drafts.find((d) => d.id === startDraftId)?.name
        const langLabel = toLang === 'ja' ? '일본어' : toLang === 'en' ? '영어' : '한국어'
        showToast(`'${draftName?.trim() || '드래프트'}' ${langLabel} 생성 완료`)
        return false
      }

      setGeneratedAllForLang(toLang, result)

      const langLabel = toLang === 'ja' ? '일본어' : toLang === 'en' ? '영어' : '한국어'
      showToast(`${langLabel} 버전이 생성되었습니다`)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : '번역에 실패했습니다.'
      showToast(msg, 'error')
      console.error('번역 실패:', err)
      return false
    } finally {
      setIsTranslating(false)
      setTranslatingDraftId(null)
    }
  }, [
    currentLang, generatedContent, generatedTitles, generatedTags,
    switchLang, setGeneratedAllForLang, setIsTranslating, setTranslatingDraftId,
    product.platform,
  ])

  /** 플랫폼 메타 + 페어 도출 */
  const meta = PLATFORM_META[product.platform]
  const langPair: [Lang, Lang] | undefined = meta?.langPair

  /** 페어에서 currentLang의 반대편 언어 */
  const altLang: Lang = (() => {
    if (!langPair) return currentLang === 'ja' ? 'ko' : 'ja'  // fallback (단일 마켓)
    return langPair[0] === currentLang ? langPair[1] : langPair[0]
  })()

  /**
   * 동기화 — dirty 언어 → 페어의 다른 언어로 재작성/번역
   * 활성 언어는 바뀌지 않음. dirty와 활성이 같으면 캐시만 업데이트, 다르면 화면도 갱신.
   */
  const syncFromDirty = useCallback(async (): Promise<boolean> => {
    if (!dirtyLang) return true
    if (!langPair) {
      showToast('이 플랫폼은 언어 동기화를 지원하지 않습니다', 'error')
      return false
    }
    const source = langCache[dirtyLang]
    if (!source) {
      showToast('동기화할 원본을 찾을 수 없습니다', 'error')
      return false
    }
    const targetLang: Lang = langPair[0] === dirtyLang ? langPair[1] : langPair[0]

    const startDraftId = useDraftsStore.getState().currentId
    setIsTranslating(true)
    setTranslatingDraftId(startDraftId)
    try {
      const result = await api.post<GeneratedAll>('/api/translate', {
        current: source,
        fromLang: dirtyLang,
        toLang: targetLang,
        targetPlatform: product.platform,
      })

      // 드래프트 변경 시 백그라운드로 해당 드래프트에 적용
      if (useDraftsStore.getState().currentId !== startDraftId) {
        useDraftsStore.getState().applyTranslationToDraft(startDraftId, targetLang, result)
        const draftName = useDraftsStore.getState().drafts.find((d) => d.id === startDraftId)?.name
        const targetLabel = targetLang === 'ja' ? '일본어' : targetLang === 'en' ? '영어' : '한국어'
        showToast(`'${draftName?.trim() || '드래프트'}' ${targetLabel} 동기화 완료`)
        return false
      }

      cacheLang(targetLang, result)
      setDirty(null)
      const targetLabel = targetLang === 'ja' ? '일본어' : targetLang === 'en' ? '영어' : '한국어'
      showToast(`${targetLabel} 동기화 완료`)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : '동기화에 실패했습니다.'
      showToast(msg, 'error')
      console.error('동기화 실패:', err)
      return false
    } finally {
      setIsTranslating(false)
      setTranslatingDraftId(null)
    }
  }, [dirtyLang, langCache, cacheLang, setDirty, setIsTranslating, setTranslatingDraftId, langPair, product.platform])

  /** "다른 언어 만들기" 가능 여부 — 페어가 있는 플랫폼만 */
  const canTranslate = !!generatedContent && !!langPair

  return {
    translateTo,
    syncFromDirty,
    canTranslate,
    altLang,
    isCached: !!langCache[altLang],
    dirtyLang,
  }
}
