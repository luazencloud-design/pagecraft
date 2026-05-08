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
 * eBay (US) 템플릿 — 텍스트 위주 정보 박스 스택
 *
 * 특징:
 * - SEO 80자 타이틀 (h1)
 * - Condition / Shipping / Returns 뱃지
 * - 5-7 bullet points (Key Features)
 * - 긴 description (plain text 문단)
 * - Item Specifics 표 (Brand / MPN / Type / Color / Size / Material...)
 * - Shipping & Returns 3-박스 그리드
 * - eBay 시그니처 블루 (#0654BA) 액센트
 *
 * 800px 고정 폭 — html-to-image 호환
 */
const EbayPreview = forwardRef<HTMLDivElement, EbayPreviewProps>(
  ({ content, price, images, storeIntroImage, termsImage }, ref) => {
    const descLines = content.description ? content.description.split('\n').filter(Boolean) : []
    const usdPrice = price ? `$${Number(price.replace(/[^\d.]/g, '') || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''

    const FONT_BODY = "'Pretendard Variable', 'Pretendard', 'Inter', 'Noto Sans KR', sans-serif"

    const EBAY_BLUE = '#0654BA'
    const EBAY_RED = '#E53238'
    const EBAY_TEXT = '#191919'
    const EBAY_GRAY = '#707070'
    const EBAY_BORDER = '#E5E5E5'
    const EBAY_BG_ALT = '#F7F7F7'

    return (
      <div
        ref={ref}
        style={{
          width: 800,
          fontFamily: FONT_BODY,
          lineHeight: 1.5,
          overflow: 'hidden',
          background: '#ffffff',
          color: EBAY_TEXT,
        }}
      >
        {storeIntroImage && (
          <img src={storeIntroImage} alt="" style={{ width: '100%', display: 'block' }} />
        )}

        {/* 상단 셀러 띠 */}
        <div
          style={{
            background: EBAY_BLUE,
            color: '#fff',
            padding: '10px 32px',
            fontSize: 11,
            letterSpacing: 2,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>★ TRUSTED SELLER · SHIPS FROM SOUTH KOREA ★</span>
          <span>FAST SHIPPING · 30-DAY RETURNS</span>
        </div>

        {/* 헤더 — SEO 타이틀 */}
        <div
          style={{
            padding: '36px 32px 24px',
            borderBottom: `1px solid ${EBAY_BORDER}`,
          }}
        >
          {/* Condition + Brand line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            {content.condition && (
              <span
                style={{
                  background: '#E8F4D8',
                  color: '#3B7A14',
                  border: '1px solid #A4D265',
                  borderRadius: 4,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                }}
              >
                ✓ {content.condition.toUpperCase()}
              </span>
            )}
            <span style={{ fontSize: 12, color: EBAY_GRAY, fontWeight: 600 }}>
              {/* item_specifics에 Brand 있으면 표시 */}
              {content.item_specifics?.find((s) => /brand|브랜드/i.test(s.key))?.value ?? ''}
            </span>
          </div>

          {/* SEO Title (80자) */}
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: EBAY_TEXT,
              margin: '0 0 10px',
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              wordBreak: 'keep-all',
            }}
          >
            {content.product_name}
          </h1>

          {/* 부제 */}
          {content.subtitle && (
            <p style={{ fontSize: 14, color: EBAY_GRAY, margin: 0, lineHeight: 1.6 }}>
              {content.subtitle}
            </p>
          )}

          {/* 가격 */}
          {usdPrice && (
            <div style={{ marginTop: 22, display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: EBAY_RED, letterSpacing: '-0.02em' }}>
                {usdPrice}
              </span>
              <span style={{ fontSize: 12, color: EBAY_GRAY, fontWeight: 600 }}>USD</span>
              <span style={{ fontSize: 11, color: '#3B7A14', fontWeight: 700, marginLeft: 'auto' }}>
                ✓ Free Shipping
              </span>
            </div>
          )}
        </div>

        {/* 메인 이미지 */}
        {images[0] && (
          <div style={{ background: EBAY_BG_ALT, padding: '24px 32px' }}>
            <img
              src={images[0]}
              alt="Main product"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: 4,
                border: `1px solid ${EBAY_BORDER}`,
              }}
            />
          </div>
        )}

        {/* Key Features (Bullet Points) */}
        {content.bullet_points && content.bullet_points.length > 0 && (
          <div style={{ padding: '32px 32px 28px', borderBottom: `1px solid ${EBAY_BORDER}` }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div style={{ width: 4, height: 22, background: EBAY_BLUE, borderRadius: 2 }} />
              <h2 style={{ fontSize: 17, fontWeight: 800, color: EBAY_TEXT, margin: 0 }}>
                Key Features
              </h2>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'none' }}>
              {content.bullet_points.slice(0, 7).map((bp, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 14,
                    color: EBAY_TEXT,
                    lineHeight: 1.7,
                    margin: '0 0 8px',
                    position: 'relative',
                    paddingLeft: 14,
                    wordBreak: 'keep-all',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: -2,
                      top: 0,
                      color: EBAY_BLUE,
                      fontWeight: 800,
                    }}
                  >
                    ▸
                  </span>
                  {bp}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Description */}
        {descLines.length > 0 && (
          <div style={{ padding: '32px 32px 28px', borderBottom: `1px solid ${EBAY_BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 4, height: 22, background: EBAY_BLUE, borderRadius: 2 }} />
              <h2 style={{ fontSize: 17, fontWeight: 800, color: EBAY_TEXT, margin: 0 }}>
                Description
              </h2>
            </div>
            {descLines.map((line, i) => (
              <p
                key={i}
                style={{
                  fontSize: 14,
                  color: EBAY_TEXT,
                  lineHeight: 1.8,
                  margin: i === descLines.length - 1 ? 0 : '0 0 14px',
                  wordBreak: 'keep-all',
                }}
              >
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Item Specifics 표 */}
        {content.item_specifics && content.item_specifics.length > 0 && (
          <div style={{ padding: '32px 32px 28px', borderBottom: `1px solid ${EBAY_BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 4, height: 22, background: EBAY_BLUE, borderRadius: 2 }} />
              <h2 style={{ fontSize: 17, fontWeight: 800, color: EBAY_TEXT, margin: 0 }}>
                Item Specifics
              </h2>
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <tbody>
                {content.item_specifics.map((sp, i) => (
                  <tr
                    key={i}
                    style={{
                      background: i % 2 === 0 ? EBAY_BG_ALT : '#fff',
                    }}
                  >
                    <td
                      style={{
                        padding: '10px 14px',
                        color: EBAY_GRAY,
                        fontWeight: 700,
                        width: '34%',
                        borderLeft: `3px solid ${EBAY_BLUE}`,
                        verticalAlign: 'top',
                      }}
                    >
                      {sp.key}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        color: EBAY_TEXT,
                        fontWeight: 500,
                        wordBreak: 'keep-all',
                      }}
                    >
                      {sp.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 추가 이미지 + 캡션 */}
        {images.slice(1).map((imgSrc, i) => {
          const lineIdx = i + 1
          return (
            <div key={`img-${lineIdx}`} style={{ background: EBAY_BG_ALT, padding: '20px 32px' }}>
              <img
                src={imgSrc}
                alt={`Product ${lineIdx + 1}`}
                style={{
                  width: '100%',
                  display: 'block',
                  borderRadius: 4,
                  border: `1px solid ${EBAY_BORDER}`,
                }}
              />
            </div>
          )
        })}

        {/* Shipping / Returns / Payment 3-박스 */}
        {(content.shipping_policy || content.return_policy || content.payment_policy) && (
          <div style={{ padding: '32px', borderBottom: `1px solid ${EBAY_BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 4, height: 22, background: EBAY_BLUE, borderRadius: 2 }} />
              <h2 style={{ fontSize: 17, fontWeight: 800, color: EBAY_TEXT, margin: 0 }}>
                Shipping, Returns & Payment
              </h2>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
              }}
            >
              {content.shipping_policy && (
                <div
                  style={{
                    background: EBAY_BG_ALT,
                    border: `1px solid ${EBAY_BORDER}`,
                    borderRadius: 4,
                    padding: '16px 14px',
                  }}
                >
                  <p style={{ fontSize: 11, color: EBAY_BLUE, margin: '0 0 8px', fontWeight: 800, letterSpacing: 1 }}>
                    🚚 SHIPPING
                  </p>
                  <p style={{ fontSize: 12, color: EBAY_TEXT, margin: 0, lineHeight: 1.7, wordBreak: 'keep-all' }}>
                    {content.shipping_policy}
                  </p>
                </div>
              )}
              {content.return_policy && (
                <div
                  style={{
                    background: EBAY_BG_ALT,
                    border: `1px solid ${EBAY_BORDER}`,
                    borderRadius: 4,
                    padding: '16px 14px',
                  }}
                >
                  <p style={{ fontSize: 11, color: EBAY_BLUE, margin: '0 0 8px', fontWeight: 800, letterSpacing: 1 }}>
                    ↩ RETURNS
                  </p>
                  <p style={{ fontSize: 12, color: EBAY_TEXT, margin: 0, lineHeight: 1.7, wordBreak: 'keep-all' }}>
                    {content.return_policy}
                  </p>
                </div>
              )}
              {content.payment_policy && (
                <div
                  style={{
                    background: EBAY_BG_ALT,
                    border: `1px solid ${EBAY_BORDER}`,
                    borderRadius: 4,
                    padding: '16px 14px',
                  }}
                >
                  <p style={{ fontSize: 11, color: EBAY_BLUE, margin: '0 0 8px', fontWeight: 800, letterSpacing: 1 }}>
                    💳 PAYMENT
                  </p>
                  <p style={{ fontSize: 12, color: EBAY_TEXT, margin: 0, lineHeight: 1.7, wordBreak: 'keep-all' }}>
                    {content.payment_policy}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Specs (legal/standard 표) */}
        {content.specs && content.specs.length > 0 && (
          <div style={{ padding: '28px 32px', borderBottom: `1px solid ${EBAY_BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 4, height: 18, background: EBAY_GRAY, borderRadius: 2 }} />
              <h3 style={{ fontSize: 13, fontWeight: 800, color: EBAY_GRAY, margin: 0, letterSpacing: 1 }}>
                ADDITIONAL INFORMATION
              </h3>
            </div>
            {content.specs.map((sp, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  fontSize: 12,
                  padding: '7px 0',
                  borderBottom: i === content.specs.length - 1 ? 'none' : `1px dashed ${EBAY_BORDER}`,
                }}
              >
                <span style={{ color: EBAY_GRAY, width: 200, flexShrink: 0, fontWeight: 600 }}>
                  {sp.key}
                </span>
                <span style={{ color: EBAY_TEXT, flex: 1, wordBreak: 'keep-all' }}>
                  {sp.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 키워드 */}
        {content.keywords.length > 0 && (
          <div style={{ padding: '24px 32px', textAlign: 'center', background: EBAY_BG_ALT }}>
            <p style={{ fontSize: 11, color: EBAY_GRAY, lineHeight: 1.9, margin: 0, fontWeight: 500 }}>
              {content.keywords.map((k) => `#${k}`).join('  ·  ')}
            </p>
          </div>
        )}

        {/* 하단 caution */}
        {content.caution && (
          <div style={{ padding: '20px 32px', background: '#FFF8E1', borderTop: `2px solid #FFC107` }}>
            <p style={{ fontSize: 12, color: '#7A5D00', margin: 0, lineHeight: 1.7, fontWeight: 500 }}>
              ⚠ {content.caution}
            </p>
          </div>
        )}

        {/* 푸터 */}
        <div
          style={{
            padding: '20px 32px',
            background: EBAY_TEXT,
            color: '#fff',
            textAlign: 'center',
            fontSize: 11,
            letterSpacing: 2,
            fontWeight: 700,
          }}
        >
          THANK YOU FOR SHOPPING WITH US ★
        </div>

        {termsImage && (
          <img src={termsImage} alt="" style={{ width: '100%', display: 'block' }} />
        )}
      </div>
    )
  }
)

EbayPreview.displayName = 'EbayPreview'
export default EbayPreview
