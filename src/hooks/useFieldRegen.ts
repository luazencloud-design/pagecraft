'use client'

import { useCallback, useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useProductStore } from '@/stores/productStore'
import { api, ApiError } from '@/lib/api'
import { showToast } from '@/components/ui/Toast'
import type { GeneratedContent, RegenField } from '@/types/ai'

/**
 * 단일 필드 AI 재생성 훅
 *
 * 사용:
 *   const { regen, regeneratingField } = useFieldRegen()
 *   <button onClick={() => regen('main_copy')} disabled={!!regeneratingField}>↻</button>
 */
export function useFieldRegen() {
  const { generatedContent, setGeneratedContent } = useEditorStore()
  const { product } = useProductStore()
  const [regeneratingField, setRegeneratingField] = useState<RegenField | null>(null)

  const regen = useCallback(
    async (field: RegenField) => {
      if (!generatedContent) {
        showToast('재생성할 콘텐츠가 없습니다', 'error')
        return
      }
      if (regeneratingField) return // 동시 호출 차단

      setRegeneratingField(field)
      try {
        const result = await api.post<Partial<GeneratedContent>>('/api/ai/regen', {
          field,
          brand: product.brand,
          productName: product.name,
          price: product.price,
          category: product.category,
          platform: product.platform,
          currentContent: generatedContent,
        })
        if (result[field] === undefined) {
          showToast(`${field} 재생성 실패 — 응답에 필드가 없음`, 'error')
          return
        }
        // 해당 필드만 교체
        setGeneratedContent({
          ...generatedContent,
          [field]: result[field],
        })
        showToast(`${labelOf(field)} 재생성 완료`)
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? parseApiError(err.message)
            : err instanceof Error
              ? err.message
              : '재생성 실패'
        showToast(msg, 'error')
      } finally {
        setRegeneratingField(null)
      }
    },
    [generatedContent, product, regeneratingField, setGeneratedContent],
  )

  return { regen, regeneratingField }
}

function labelOf(field: RegenField): string {
  switch (field) {
    case 'product_name': return '상품명'
    case 'subtitle': return '부제'
    case 'main_copy': return '메인 카피'
    case 'selling_points': return '셀링포인트'
    case 'description': return '상품 설명'
    case 'keywords': return '키워드'
    case 'caution': return '주의사항'
    default: return field
  }
}

function parseApiError(msg: string): string {
  try {
    const body = JSON.parse(msg)
    return body.error || msg
  } catch {
    return msg
  }
}
