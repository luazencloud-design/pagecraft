'use client'

import { forwardRef } from 'react'
import type { GeneratedContent } from '@/types/ai'

interface ThumbnailPreviewProps {
  content: GeneratedContent
  image: string | undefined
  /** 플랫폼 lang — 폰트 fallback 결정 (ja면 Noto Sans JP, en면 Helvetica 우선) */
  lang?: 'ko' | 'ja' | 'en'
}

/**
 * 600×600 정사각 썸네일 (대표 이미지) —
 * 쿠팡·스마트스토어·큐텐·이베이 검색 결과 노출용
 *
 * 디자인:
 * - 배경: 첫 상품 이미지 (object-fit cover)
 * - 하단 그라데이션 + 메인 카피 오버레이
 * - 상단 좌측: 브랜드명 (있을 때만)
 * - 골드 미세 마크 — 상세페이지와 톤 일치
 */
const ThumbnailPreview = forwardRef<HTMLDivElement, ThumbnailPreviewProps>(
  ({ content, image, lang = 'ko' }, ref) => {
    const fontFamily =
      lang === 'ja'
        ? "'Noto Sans JP', 'Pretendard Variable', sans-serif"
        : lang === 'en'
          ? "'Helvetica Neue', Helvetica, Arial, sans-serif"
          : "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif"

    // 메인 카피 — 첫 문장만, 너무 길면 잘라서
    const copy = (() => {
      const raw = content.main_copy || content.product_name || ''
      const firstLine = raw.split(/[.!?。！？\n]/)[0]?.trim() || raw.trim()
      return firstLine.length > 38 ? firstLine.slice(0, 38).trim() + '…' : firstLine
    })()

    return (
      <div
        ref={ref}
        style={{
          width: 600,
          height: 600,
          position: 'relative',
          overflow: 'hidden',
          background: '#1a1a1f',
          fontFamily,
        }}
      >
        {/* 배경 이미지 */}
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        )}

        {/* 상단 옅은 그라데이션 — 브랜드명 가독성 */}
        {content.product_name && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 130,
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* 상단 좌측: 브랜드/카테고리 라벨 */}
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div style={{ width: 24, height: 2, background: '#c8a050' }} />
          <p
            style={{
              margin: 0,
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }}
          >
            {content.product_name?.slice(0, 14) || 'PRODUCT'}
          </p>
        </div>

        {/* 하단 그라데이션 + 메인 카피 오버레이 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '120px 40px 38px',
            background:
              'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.15) 80%, transparent 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ width: 36, height: 3, background: '#c8a050' }} />
          <p
            style={{
              margin: 0,
              color: '#ffffff',
              fontSize: 34,
              fontWeight: 900,
              lineHeight: 1.22,
              letterSpacing: '-0.025em',
              wordBreak: 'keep-all',
              textShadow: '0 2px 12px rgba(0,0,0,0.45)',
            }}
          >
            {copy}
          </p>
        </div>
      </div>
    )
  },
)

ThumbnailPreview.displayName = 'ThumbnailPreview'
export default ThumbnailPreview
