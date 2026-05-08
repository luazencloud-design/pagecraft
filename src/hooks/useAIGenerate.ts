'use client'

import { useCallback } from 'react'
import { useProductStore } from '@/stores/productStore'
import { useImageStore } from '@/stores/imageStore'
import { useEditorStore } from '@/stores/editorStore'
import { useUsageStore } from '@/stores/usageStore'
import { useDraftsStore } from '@/stores/draftsStore'
import { api } from '@/lib/api'
import { compressForAI } from '@/lib/image'
import { PLATFORM_META } from '@/types/product'
import { showToast } from '@/components/ui/Toast'
import type { GeneratedByLang, GeneratedTag } from '@/types/ai'
import type { CoupangSuggestResponse } from '@/types/market'

const LOADING_MESSAGES = [
  'AI가 상품을 분석하고 있습니다...',
  '매력적인 카피를 작성하고 있습니다...',
  '셀링포인트를 정리하고 있습니다...',
  '최적화 상품명을 생성하고 있습니다...',
  '검색 태그를 선정하고 있습니다...',
  '거의 완성입니다...',
]

export function useAIGenerate() {
  const { product } = useProductStore()
  const { images } = useImageStore()
  const {
    setGeneratedContent,
    setGeneratedTitles,
    setGeneratedTags,
    setGeneratedByLang,
    clearLangCache,
    setIsGenerating,
    setGeneratingDraftId,
    setGeneratedForPlatform,
    setLoadingMessage,
    setGenerateError,
    setActiveTab,
  } = useEditorStore()

  // 통합 생성 — content + titles + tags 한번에
  const generateContent = useCallback(async () => {
    if (images.length === 0) return

    // 생성 시작 시점의 드래프트 ID 캡처 — 결과 도착 시 같은 드래프트인지 확인용
    const startDraftId = useDraftsStore.getState().currentId

    setIsGenerating(true)
    setGeneratingDraftId(startDraftId)
    setGenerateError('')
    setLoadingMessage(LOADING_MESSAGES[0])
    // 새 생성 시작 시 기존 언어 캐시 초기화 (이전 상품 결과 누수 방지)
    clearLangCache()

    let msgIdx = 0
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length
      setLoadingMessage(LOADING_MESSAGES[msgIdx])
    }, 3000)

    try {
      // 한국 마켓일 때만 쿠팡 인기 검색어 호출 (큐텐 등은 스킵)
      const platformMeta = PLATFORM_META[product.platform]
      const targetLang = platformMeta?.lang ?? 'ko'
      const useAutocomplete = platformMeta?.hasAutocomplete ?? false

      let coupangSuggestions: string[] = []
      if (useAutocomplete) {
        try {
          if (product.name) {
            const suggest = await api.get<CoupangSuggestResponse>(
              `/api/market/suggest?keyword=${encodeURIComponent(product.name)}`,
            )
            coupangSuggestions = suggest.suggestions || []
          }
        } catch {
          // 쿠팡 API 실패해도 계속 진행
        }
      }

      const aiImages = await Promise.all(
        images.slice(0, 5).map((img) => compressForAI(img.dataUrl))
      )

      // 한번의 API 호출로 — 큐텐이면 양 언어 동시 생성, 한국이면 ko 단일
      const byLang = await api.post<GeneratedByLang>('/api/ai/copy', {
        images: aiImages,
        brand: product.brand,
        productName: product.name,
        price: product.price,
        category: product.category,
        platform: product.platform,
        memo: product.memo,
        features: product.features,
        coupangSuggestions,
      })

      // 결과 도착 — 사용자가 다른 드래프트로 이동했으면 폐기 (다른 드래프트 데이터 오염 방지)
      const currentDraftAtCompletion = useDraftsStore.getState().currentId
      if (currentDraftAtCompletion !== startDraftId) {
        showToast('다른 드래프트로 이동해서 결과가 폐기됐습니다 (크레딧은 차감)', 'error')
        // 크레딧 사용량은 갱신 (이미 소비됨)
        useUsageStore.getState().fetchUsage()
        return
      }

      // 모든 받은 언어를 캐시에 저장 + 활성 언어로 플랫폼 기본 lang 사용
      setGeneratedByLang(byLang, targetLang)

      // 어느 플랫폼용으로 생성됐는지 기록 — 이후 플랫폼 변경 시 stale 배너 표시
      setGeneratedForPlatform(product.platform)

      // 트렌딩 태그 마킹은 활성 언어 결과에 한해 (한국어 + 자동완성 있을 때만)
      const activeAll = byLang[targetLang]
      if (useAutocomplete && activeAll?.tags && activeAll.tags.length > 0) {
        const trendingSet = new Set(
          coupangSuggestions.map((s) => s.replace(/\s/g, '').toLowerCase()),
        )
        const tags: GeneratedTag[] = activeAll.tags.map((text) => ({
          text,
          isTrending: trendingSet.has(text.replace(/\s/g, '').toLowerCase()),
        }))
        setGeneratedTags(tags)
      }

      // 크레딧 소비 후 UI 즉시 반영
      useUsageStore.getState().fetchUsage()

      setActiveTab('copy')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI 생성에 실패했습니다.'
      setGenerateError(msg)
      console.error('AI 생성 실패:', err)
    } finally {
      clearInterval(interval)
      setIsGenerating(false)
      setGeneratingDraftId(null)
      setLoadingMessage('')
    }
  }, [
    images,
    product,
    setGeneratedContent,
    setGeneratedTitles,
    setGeneratedTags,
    setGeneratedByLang,
    clearLangCache,
    setIsGenerating,
    setGeneratingDraftId,
    setGeneratedForPlatform,
    setLoadingMessage,
    setGenerateError,
    setActiveTab,
  ])

  return { generateContent }
}
