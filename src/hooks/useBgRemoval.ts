'use client'

import { useState, useCallback } from 'react'
import { useImageStore } from '@/stores/imageStore'
import { useUsageStore } from '@/stores/usageStore'
import { api } from '@/lib/api'
import { compressForBgRemoval } from '@/lib/image'
import { showToast } from '@/components/ui/Toast'

export function useBgRemoval() {
  const { images, updateImage } = useImageStore()
  const [isModelLoading] = useState(false) // Recraft 사용 — 모델 로드 없음
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState('')

  const removeBackground = useCallback(async (dataUrl: string): Promise<string | null> => {
    setIsProcessing(true)
    setProgress('배경 제거 중...')
    try {
      // Recraft는 해상도 보존형 — 2048px/0.92로 고품질 입력
      const compressed = await compressForBgRemoval(dataUrl)
      const res = await api.post<{ image: string }>('/api/image/bg-remove', {
        image: compressed,
      })
      // Recraft는 진짜 픽셀 마스크 기반 투명 PNG 반환 → whitenNearWhite 불필요
      // (반투명 엣지 픽셀을 순수 흰색으로 바꾸면 헤일로 생김)
      useUsageStore.getState().fetchUsage()
      return res.image
    } catch (err) {
      console.error('배경 제거 실패:', err)
      return null
    } finally {
      setIsProcessing(false)
      setProgress('')
    }
  }, [])

  const processAllImages = useCallback(async () => {
    const unprocessed = images.filter((img) => !img.bgRemoved)
    if (unprocessed.length === 0) return

    setIsProcessing(true)

    let successCount = 0
    for (let i = 0; i < unprocessed.length; i++) {
      const img = unprocessed[i]
      setProgress(`배경 제거 중... (${i + 1}/${unprocessed.length})`)

      const result = await removeBackground(img.dataUrl)
      if (result) {
        updateImage(img.id, { dataUrl: result, bgRemoved: true })
        successCount++
      }
    }

    setIsProcessing(false)
    setProgress('')
    if (successCount === unprocessed.length) {
      showToast(`배경 제거 완료 (${successCount}장)`)
    } else {
      showToast(`${successCount}/${unprocessed.length}장 처리 · 일부 실패`, 'error')
    }
  }, [images, removeBackground, updateImage])

  const restoreAll = useCallback(() => {
    images.forEach((img) => {
      if (img.bgRemoved) {
        updateImage(img.id, { bgRemoved: false })
      }
    })
  }, [images, updateImage])

  return {
    isModelLoading,
    isProcessing,
    progress,
    processAllImages,
    restoreAll,
    removeBackground,
  }
}
