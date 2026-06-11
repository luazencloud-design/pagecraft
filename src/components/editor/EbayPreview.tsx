'use client'

import { forwardRef } from 'react'
import type { GeneratedContent } from '@/types/ai'

interface EbayPreviewProps {
  content: GeneratedContent
  price: string
  /** 다른 템플릿과 시그니처 통일을 위해 받지만 eBay에선 미사용 */
  images?: string[]
  storeIntroImage?: string | null
  termsImage?: string | null
  /** eBay는 설명창에 이미지 미사용 — 사은품 블록도 렌더 X (시그니처 통일용) */
  giftImage?: string | null
  giftDescription?: string | null
}

/**
 * eBay (US) — 모바일 친화 텍스트 문서
 *
 * 미리보기 = 클립보드 HTML과 동일 구조 (WYSIWYG):
 * - 굵기 + 불릿 + <hr> 구분선 + 이모지만 사용
 * - 색상/폰트 변경 / <table> 사용 X — 모바일 80% 트래픽 대응
 * - 이미지 일절 미사용 (eBay는 갤러리에 별도 업로드, 설명창에 텍스트만 들어감)
 *   storeIntro/terms도 동일하게 미렌더링
 */
const EbayPreview = forwardRef<HTMLDivElement, EbayPreviewProps>(
  ({ content, price }, ref) => {
    const descLines = content.description ? content.description.split('\n').filter(Boolean) : []
    const usdPrice = price ? `$${Number(price.replace(/[^\d.]/g, '') || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''

    const FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif"

    const sectionHeaderStyle: React.CSSProperties = {
      fontWeight: 700,
      fontSize: 15,
      margin: '0 0 10px',
    }

    const dividerStyle: React.CSSProperties = {
      border: 'none',
      borderTop: '1px solid #ddd',
      margin: '20px 0',
    }

    return (
      <div
        ref={ref}
        style={{
          width: 800,
          fontFamily: FONT,
          lineHeight: 1.6,
          background: '#ffffff',
          color: '#222',
          padding: '40px 44px',
          fontSize: 14,
        }}
      >
        {/* eBay는 이미지를 별도 갤러리에 업로드 — 설명창에는 텍스트만 들어감.
            상세페이지 미리보기에도 이미지 미포함 (storeIntro/terms/제품 이미지 모두). */}

        {/* 타이틀 — 가운데 굵게 */}
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, margin: '0 0 8px', lineHeight: 1.4, wordBreak: 'keep-all' }}>
          {content.product_name}
        </p>

        {/* 부제 */}
        {content.subtitle && (
          <p style={{ textAlign: 'center', fontSize: 14, margin: '0 0 12px', wordBreak: 'keep-all' }}>
            {content.subtitle}
          </p>
        )}

        {/* Condition + Price 라인 */}
        {(content.condition || usdPrice) && (
          <p style={{ textAlign: 'center', fontSize: 14, margin: '0 0 20px' }}>
            {content.condition && (
              <>
                <strong>Condition:</strong> {content.condition}
              </>
            )}
            {content.condition && usdPrice && <span>  &nbsp;|&nbsp;  </span>}
            {usdPrice && (
              <>
                <strong>Price:</strong> {usdPrice} USD
              </>
            )}
          </p>
        )}

        <hr style={dividerStyle} />

        {/* Key Features */}
        {content.bullet_points && content.bullet_points.length > 0 && (
          <>
            <p style={sectionHeaderStyle}>✨ Key Features</p>
            <ul style={{ margin: '0 0 4px', paddingLeft: 22 }}>
              {content.bullet_points.slice(0, 7).map((bp, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    margin: '0 0 6px',
                    wordBreak: 'keep-all',
                  }}
                >
                  {bp}
                </li>
              ))}
            </ul>
            <hr style={dividerStyle} />
          </>
        )}

        {/* Description */}
        {descLines.length > 0 && (
          <>
            <p style={sectionHeaderStyle}>📝 Description</p>
            {descLines.map((line, i) => (
              <p
                key={i}
                style={{
                  fontSize: 14,
                  lineHeight: 1.8,
                  margin: i === descLines.length - 1 ? '0' : '0 0 10px',
                  wordBreak: 'keep-all',
                }}
              >
                {line}
              </p>
            ))}
            <hr style={dividerStyle} />
          </>
        )}

        {/* Item Specifics — 표 X, 불릿 리스트로 (모바일 친화) */}
        {content.item_specifics && content.item_specifics.length > 0 && (
          <>
            <p style={sectionHeaderStyle}>📋 Item Specifics</p>
            <ul style={{ margin: '0 0 4px', paddingLeft: 22 }}>
              {content.item_specifics.map((sp, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    margin: '0 0 4px',
                    wordBreak: 'keep-all',
                  }}
                >
                  <strong>{sp.key}:</strong> {sp.value}
                </li>
              ))}
            </ul>
            <hr style={dividerStyle} />
          </>
        )}

        {/* Shipping */}
        {content.shipping_policy && (
          <>
            <p style={sectionHeaderStyle}>📦 Shipping</p>
            <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0, wordBreak: 'keep-all' }}>
              {content.shipping_policy}
            </p>
            <hr style={dividerStyle} />
          </>
        )}

        {/* Returns */}
        {content.return_policy && (
          <>
            <p style={sectionHeaderStyle}>↩️ Returns</p>
            <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0, wordBreak: 'keep-all' }}>
              {content.return_policy}
            </p>
            <hr style={dividerStyle} />
          </>
        )}

        {/* Payment */}
        {content.payment_policy && (
          <>
            <p style={sectionHeaderStyle}>💳 Payment</p>
            <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0, wordBreak: 'keep-all' }}>
              {content.payment_policy}
            </p>
            <hr style={dividerStyle} />
          </>
        )}

        {/* Caution */}
        {content.caution && (
          <p style={{ fontSize: 14, lineHeight: 1.7, margin: '0 0 12px', wordBreak: 'keep-all' }}>
            <strong>⚠️ Note:</strong> {content.caution}
          </p>
        )}

        {/* Tags */}
        {content.keywords.length > 0 && (
          <p style={{ fontSize: 13, fontStyle: 'italic', margin: 0, color: '#777' }}>
            {content.keywords.map((k) => `#${k}`).join(' ')}
          </p>
        )}
      </div>
    )
  }
)

EbayPreview.displayName = 'EbayPreview'
export default EbayPreview
