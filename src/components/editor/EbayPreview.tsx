'use client'

import { forwardRef } from 'react'
import type { GeneratedContent } from '@/types/ai'

interface EbayPreviewProps {
  content: GeneratedContent
  price: string
  images: string[]
  storeIntroImage?: string | null
  termsImage?: string | null
}

/**
 * eBay (US) — 모바일 친화 텍스트 문서
 *
 * 미리보기 = 클립보드 HTML과 동일 구조 (WYSIWYG):
 * - 굵기 + 불릿 + <hr> 구분선 + 이모지만 사용
 * - 색상/폰트 변경 / <table> 사용 X — 모바일 80% 트래픽 대응
 * - 이미지는 미리보기에서만 보여주고 복사 HTML엔 미포함 (eBay 이미지는 별도 업로드)
 */
const EbayPreview = forwardRef<HTMLDivElement, EbayPreviewProps>(
  ({ content, price, images, storeIntroImage, termsImage }, ref) => {
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
        {storeIntroImage && (
          <img src={storeIntroImage} alt="" style={{ width: '100%', display: 'block', marginBottom: 24 }} />
        )}

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

        {/* 메인 이미지 — 미리보기 시각용. 클립보드 HTML엔 미포함 */}
        {images[0] && (
          <img
            src={images[0]}
            alt="Main product"
            style={{ width: '100%', height: 'auto', display: 'block', margin: '0 0 20px' }}
          />
        )}

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

        {/* 추가 이미지 (시각용, 클립보드엔 미포함) */}
        {images.slice(1).length > 0 && (
          <>
            {images.slice(1).map((imgSrc, i) => (
              <img
                key={i}
                src={imgSrc}
                alt={`Product ${i + 2}`}
                style={{ width: '100%', display: 'block', margin: '0 0 16px' }}
              />
            ))}
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

        {termsImage && (
          <img src={termsImage} alt="" style={{ width: '100%', display: 'block', marginTop: 24 }} />
        )}
      </div>
    )
  }
)

EbayPreview.displayName = 'EbayPreview'
export default EbayPreview
