'use client'

import { forwardRef } from 'react'
import type { GeneratedContent } from '@/types/ai'
import type { Template } from '@/types/product'
import KoreanDefaultPreview from './KoreanDefaultPreview'
import Qoo10ModernPreview from './Qoo10ModernPreview'
import Qoo10ClassicPreview from './Qoo10ClassicPreview'
import EbayPreview from './EbayPreview'

interface DetailPagePreviewProps {
  content: GeneratedContent
  price: string
  images: string[]
  template?: Template
  storeIntroImage?: string | null
  termsImage?: string | null
}

/**
 * 상세페이지 미리보기 — 템플릿 분기 래퍼
 *
 * 지원 템플릿:
 * - korean-default: 쿠팡·스마트스토어 표준 800px (검정/금색)
 * - qoo10-modern:   큐텐 재팬 미니멀 K-뷰티 (베이지/차콜)
 * - qoo10-classic:  큐텐 재팬 카라그램 스타일 (살구 베이지 + 거대 영문)
 *
 * forwardRef는 html2canvas 캡처 대상으로 사용 — 모든 하위 템플릿이 ref 위임
 */
const DetailPagePreview = forwardRef<HTMLDivElement, DetailPagePreviewProps>(
  ({ template = 'korean-default', ...rest }, ref) => {
    switch (template) {
      case 'qoo10-modern':
        return <Qoo10ModernPreview ref={ref} {...rest} />
      case 'qoo10-classic':
        return <Qoo10ClassicPreview ref={ref} {...rest} />
      case 'ebay-default':
        return <EbayPreview ref={ref} {...rest} />
      case 'korean-default':
      default:
        return <KoreanDefaultPreview ref={ref} {...rest} />
    }
  },
)

DetailPagePreview.displayName = 'DetailPagePreview'
export default DetailPagePreview
