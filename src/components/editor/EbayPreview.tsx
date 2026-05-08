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
 * eBay (US) — 텍스트 문서 스타일 미리보기
 *
 * 설계 원칙:
 * - 셀러가 페이지 내용을 그대로 복사 → eBay 설명 에디터에 붙여넣기
 * - eBay는 마크다운 X, 인라인 HTML 스타일(글자 크기/색/굵기/밑줄)은 지원
 * - 미리보기 = 복사될 결과 (WYSIWYG)
 * - 시각적 장식(배너/그라디언트/테이블 zebra) 최소 — 인쇄 가능한 문서 톤
 *
 * 800px 고정 폭. 폰트는 Arial 등 어디에든 안전한 sans-serif.
 */
const EbayPreview = forwardRef<HTMLDivElement, EbayPreviewProps>(
  ({ content, price, images, storeIntroImage, termsImage }, ref) => {
    const descLines = content.description ? content.description.split('\n').filter(Boolean) : []
    const usdPrice = price ? `$${Number(price.replace(/[^\d.]/g, '') || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''

    // 폰트는 Arial — eBay 에디터 기본 폰트와 호환
    const FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif"

    const COLOR_TEXT = '#191919'
    const COLOR_GRAY = '#707070'
    const COLOR_ACCENT = '#0654BA'   // eBay 블루
    const COLOR_PRICE = '#E53238'    // eBay 빨강

    const sectionHeaderStyle: React.CSSProperties = {
      fontSize: 18,
      fontWeight: 700,
      color: COLOR_ACCENT,
      borderBottom: `2px solid ${COLOR_ACCENT}`,
      paddingBottom: 6,
      margin: '28px 0 14px',
    }

    return (
      <div
        ref={ref}
        style={{
          width: 800,
          fontFamily: FONT,
          lineHeight: 1.6,
          background: '#ffffff',
          color: COLOR_TEXT,
          padding: '40px 44px',
          fontSize: 14,
        }}
      >
        {storeIntroImage && (
          <img src={storeIntroImage} alt="" style={{ width: '100%', display: 'block', marginBottom: 24 }} />
        )}

        {/* SEO 타이틀 */}
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLOR_TEXT,
            margin: '0 0 10px',
            lineHeight: 1.35,
            wordBreak: 'keep-all',
          }}
        >
          {content.product_name}
        </h1>

        {/* 부제 */}
        {content.subtitle && (
          <p style={{ fontSize: 14, color: COLOR_GRAY, margin: '0 0 16px', fontStyle: 'italic' }}>
            {content.subtitle}
          </p>
        )}

        {/* Condition + Price 라인 */}
        <div style={{ margin: '0 0 24px', display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          {content.condition && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#3B7A14',
                background: '#E8F4D8',
                border: '1px solid #A4D265',
                padding: '3px 12px',
                borderRadius: 3,
              }}
            >
              ✓ {content.condition}
            </span>
          )}
          {usdPrice && (
            <span style={{ fontSize: 26, fontWeight: 700, color: COLOR_PRICE }}>
              {usdPrice} <span style={{ fontSize: 13, color: COLOR_GRAY, fontWeight: 600 }}>USD</span>
            </span>
          )}
        </div>

        {/* 메인 이미지 */}
        {images[0] && (
          <img
            src={images[0]}
            alt="Main product"
            style={{ width: '100%', height: 'auto', display: 'block', margin: '0 0 24px' }}
          />
        )}

        {/* Key Features */}
        {content.bullet_points && content.bullet_points.length > 0 && (
          <>
            <h2 style={sectionHeaderStyle}>★ Key Features</h2>
            <ul style={{ margin: 0, paddingLeft: 22 }}>
              {content.bullet_points.slice(0, 7).map((bp, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 14,
                    color: COLOR_TEXT,
                    lineHeight: 1.7,
                    margin: '0 0 8px',
                    wordBreak: 'keep-all',
                  }}
                >
                  {bp}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Description */}
        {descLines.length > 0 && (
          <>
            <h2 style={sectionHeaderStyle}>Description</h2>
            {descLines.map((line, i) => (
              <p
                key={i}
                style={{
                  fontSize: 14,
                  color: COLOR_TEXT,
                  lineHeight: 1.8,
                  margin: i === descLines.length - 1 ? 0 : '0 0 14px',
                  wordBreak: 'keep-all',
                }}
              >
                {line}
              </p>
            ))}
          </>
        )}

        {/* Item Specifics */}
        {content.item_specifics && content.item_specifics.length > 0 && (
          <>
            <h2 style={sectionHeaderStyle}>Item Specifics</h2>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 14,
                margin: 0,
              }}
            >
              <tbody>
                {content.item_specifics.map((sp, i) => (
                  <tr key={i}>
                    <td
                      style={{
                        padding: '8px 12px',
                        color: COLOR_GRAY,
                        fontWeight: 700,
                        width: '34%',
                        verticalAlign: 'top',
                        borderBottom: '1px solid #E5E5E5',
                      }}
                    >
                      {sp.key}
                    </td>
                    <td
                      style={{
                        padding: '8px 12px',
                        color: COLOR_TEXT,
                        wordBreak: 'keep-all',
                        borderBottom: '1px solid #E5E5E5',
                      }}
                    >
                      {sp.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* 추가 이미지 */}
        {images.slice(1).length > 0 && (
          <div style={{ margin: '28px 0 0' }}>
            {images.slice(1).map((imgSrc, i) => (
              <img
                key={i}
                src={imgSrc}
                alt={`Product ${i + 2}`}
                style={{ width: '100%', display: 'block', margin: '0 0 16px' }}
              />
            ))}
          </div>
        )}

        {/* Shipping */}
        {content.shipping_policy && (
          <>
            <h2 style={sectionHeaderStyle}>Shipping</h2>
            <p style={{ fontSize: 14, color: COLOR_TEXT, lineHeight: 1.8, margin: 0, wordBreak: 'keep-all' }}>
              {content.shipping_policy}
            </p>
          </>
        )}

        {/* Returns */}
        {content.return_policy && (
          <>
            <h2 style={sectionHeaderStyle}>Returns</h2>
            <p style={{ fontSize: 14, color: COLOR_TEXT, lineHeight: 1.8, margin: 0, wordBreak: 'keep-all' }}>
              {content.return_policy}
            </p>
          </>
        )}

        {/* Payment */}
        {content.payment_policy && (
          <>
            <h2 style={sectionHeaderStyle}>Payment</h2>
            <p style={{ fontSize: 14, color: COLOR_TEXT, lineHeight: 1.8, margin: 0, wordBreak: 'keep-all' }}>
              {content.payment_policy}
            </p>
          </>
        )}

        {/* Caution */}
        {content.caution && (
          <p
            style={{
              fontSize: 13,
              color: '#7A5D00',
              background: '#FFF8E1',
              padding: '10px 14px',
              borderLeft: '3px solid #FFC107',
              margin: '24px 0 0',
              lineHeight: 1.7,
              wordBreak: 'keep-all',
            }}
          >
            <strong>Note:</strong> {content.caution}
          </p>
        )}

        {/* Additional Information (legal specs) */}
        {content.specs && content.specs.length > 0 && (
          <div style={{ margin: '28px 0 0', paddingTop: 18, borderTop: `1px solid #E5E5E5` }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: COLOR_GRAY, letterSpacing: 1, margin: '0 0 10px' }}>
              ADDITIONAL INFORMATION
            </h3>
            {content.specs.map((sp, i) => (
              <div key={i} style={{ display: 'flex', fontSize: 12, padding: '4px 0' }}>
                <span style={{ color: COLOR_GRAY, width: 220, flexShrink: 0, fontWeight: 600 }}>
                  {sp.key}
                </span>
                <span style={{ color: COLOR_TEXT, flex: 1, wordBreak: 'keep-all' }}>
                  {sp.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {content.keywords.length > 0 && (
          <p style={{ fontSize: 12, color: COLOR_GRAY, margin: '24px 0 0', fontStyle: 'italic' }}>
            {content.keywords.map((k) => `#${k}`).join('  ')}
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
