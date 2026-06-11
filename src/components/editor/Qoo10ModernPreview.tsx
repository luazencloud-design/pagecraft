'use client'

import { forwardRef } from 'react'
import type { GeneratedContent } from '@/types/ai'
import GiftBlock from './GiftBlock'

interface Qoo10ModernPreviewProps {
  content: GeneratedContent
  price: string
  images: string[]
  storeIntroImage?: string | null
  termsImage?: string | null
  giftImage?: string | null
  giftDescription?: string | null
}

/**
 * Qoo10 재팬 — Modern 템플릿 v2 (화려한 K-뷰티 무드보드)
 *
 * 특징:
 * - 피치 그라디언트 헤더 + 떠다니는 도트 장식
 * - 큰 영문 무드 + 일본어 타이틀 + 일본어 부제 3단 구조
 * - 셀링포인트: 카드 + 컬러 스트라이프 + 큰 번호 + 그림자
 * - 색상 swatch: 컬러 도트 + 영문 라벨 + 퍼스널컬러 뱃지
 * - 사용 전/후: 라운드 카드 + 떠 있는 라벨 + AFTER 강조 프레임
 * - 푸터: 그라디언트 + 우표식 가격 카드
 *
 * 800px 고정 폭 — html2canvas 호환
 */
const Qoo10ModernPreview = forwardRef<HTMLDivElement, Qoo10ModernPreviewProps>(
  ({ content, price, images, storeIntroImage, termsImage, giftImage, giftDescription }, ref) => {
    const descLines = content.description ? content.description.split('\n').filter(Boolean) : []
    const yenPrice = price ? `¥${Number(price.replace(/[^\d]/g, '') || 0).toLocaleString()}` : ''

    // 폰트 스택 — 두툼한 sans-serif 통일 (Pretendard 우선, JP/KR 모두 자연스럽게)
    const FONT_BODY = "'Pretendard Variable', 'Pretendard', 'Noto Sans JP', 'Noto Sans KR', 'Hiragino Sans', sans-serif"

    return (
      <div
        ref={ref}
        style={{
          width: 820,
          fontFamily: FONT_BODY,
          lineHeight: 1.5,
          overflow: 'hidden',
          background: '#ffffff',
          color: '#3d3d3d',
        }}
      >
        {storeIntroImage && (
          <img src={storeIntroImage} alt="" style={{ width: '100%', display: 'block' }} />
        )}

        {/* 사은품 안내 (선택) */}
        <GiftBlock
          giftImage={giftImage}
          giftDescription={giftDescription}
          fontFamily={FONT_BODY}
        />

        {/* 헤더 — 가운데 정렬 stacked 타이틀 + 부제 + 해시태그 칩
            (카라그램·아누아 큐텐 페이지 레퍼런스) */}
        <div
          style={{
            background: '#fdf6ee',
            padding: '80px 40px 56px',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          {/* 거대 영문 무드 — 살구/코랄 액센트 */}
          {content.mood_callout && (
            <p
              style={{
                fontSize: 60, fontWeight: 900, color: '#e8a890',
                margin: '0 0 8px',
                letterSpacing: '-0.025em',
                lineHeight: 1.0,
              }}
            >
              {content.mood_callout}
            </p>
          )}

          {/* 일본어/한국어 타이틀 — mood_callout 없으면 hero 사이즈 */}
          <h1
            style={{
              fontSize: content.mood_callout ? 38 : 56,
              fontWeight: 900,
              color: '#3d3d3d',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              wordBreak: 'keep-all',
            }}
          >
            {content.product_name}
          </h1>

          {/* 부제 — N Colors | BRAND PRODUCT 식 */}
          <p
            style={{
              fontSize: 15, color: '#888',
              margin: '22px 0 0',
              lineHeight: 1.6,
              wordBreak: 'keep-all',
              fontWeight: 500,
            }}
          >
            {content.subtitle}
          </p>

          {/* 해시태그 칩 — 둥근 살구색 pill, 회전 X */}
          {content.hashtags && content.hashtags.length > 0 && (
            <div
              style={{
                display: 'flex', gap: 10, justifyContent: 'center',
                flexWrap: 'wrap', marginTop: 28,
              }}
            >
              {content.hashtags.slice(0, 5).map((tag, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 13,
                    color: '#a04030',
                    background: '#f5d0c0',
                    padding: '8px 18px',
                    borderRadius: 22,
                    fontWeight: 600,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 메인 이미지 */}
        {images[0] && (
          <img src={images[0]} alt="メイン商品画像" style={{ width: '100%', height: 'auto', display: 'block' }} />
        )}

        {/* 메인 카피 — 베이지 박스 + 좌상단/우하단 코너 장식
            큐텐 에디터가 position: absolute 제거 → 3×3 table 구조로 호환성 확보.
            좌상단 셀에 ┌ (borderTop+borderLeft), 우하단 셀에 ┘ (borderBottom+borderRight). */}
        <table
          cellPadding={0}
          cellSpacing={0}
          style={{ width: '100%', background: '#fdf6ee', borderCollapse: 'collapse' }}
        >
          <tbody>
            {/* 1행: 좌상단 코너 */}
            <tr>
              <td style={{ width: 54, padding: '22px 0 0 22px', verticalAlign: 'top' }}>
                <div style={{ width: 32, height: 32, borderTop: '2px solid #c08770', borderLeft: '2px solid #c08770' }} />
              </td>
              <td style={{ height: 54 }} />
              <td style={{ width: 54 }} />
            </tr>
            {/* 2행: 본문 (가운데 셀만 사용) */}
            <tr>
              <td />
              <td style={{ padding: '0 18px', textAlign: 'center' }}>
                <p style={{ fontSize: 12, letterSpacing: 6, color: '#a06850', margin: '0 0 24px', fontWeight: 600 }}>
                  ─── POINT ───
                </p>
                <p style={{ fontSize: 24, fontWeight: 600, color: '#3d3d3d', lineHeight: 1.7, margin: 0, wordBreak: 'keep-all', maxWidth: 620, marginInline: 'auto' }}>
                  {content.main_copy}
                </p>
              </td>
              <td />
            </tr>
            {/* 3행: 우하단 코너 */}
            <tr>
              <td style={{ width: 54 }} />
              <td style={{ height: 54 }} />
              <td style={{ width: 54, padding: '0 22px 22px 0', verticalAlign: 'bottom', textAlign: 'right' }}>
                <div style={{ width: 32, height: 32, borderBottom: '2px solid #c08770', borderRight: '2px solid #c08770', display: 'inline-block' }} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* 셀링포인트 — 카드 3개 */}
        <div style={{ background: 'linear-gradient(180deg, #fff 0%, #faf6f2 100%)', padding: '60px 32px' }}>
          <p style={{ fontSize: 12, letterSpacing: 5, color: '#a06850', textAlign: 'center', margin: '0 0 36px', fontWeight: 600 }}>
            FEATURES
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            {content.selling_points.slice(0, 3).map((sp, i) => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  textAlign: 'center',
                  boxShadow: '0 4px 14px rgba(160,104,80,0.08)',
                  border: '1px solid #f0e0d0',
                  overflow: 'hidden',
                }}
              >
                {/* 상단 컬러 스트라이프 — absolute 대신 자연 흐름의 첫 자식 */}
                <div style={{
                  height: 4,
                  background: i === 0
                    ? 'linear-gradient(90deg, #f5cfb4, #e8c5c5)'
                    : i === 1
                      ? 'linear-gradient(90deg, #e8c5c5, #d4a8b0)'
                      : 'linear-gradient(90deg, #d4a8b0, #c08770)',
                }} />

                <div style={{ padding: '32px 18px 26px' }}>
                  {/* 큰 번호 */}
                  <div
                    style={{
                      fontSize: 56, fontWeight: 900,
                      color: '#e0a890', lineHeight: 1, margin: '0 0 12px',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>

                  {/* 구분선 */}
                  <div style={{ width: 24, height: 2, background: '#c08770', margin: '0 auto 14px', borderRadius: 1 }} />

                  {/* 본문 */}
                  <p style={{ fontSize: 13, color: '#5a4a3a', lineHeight: 1.8, margin: 0, wordBreak: 'keep-all' }}>
                    {sp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 첫 설명 문단 */}
        {descLines[0] && (
          <div style={{ background: '#fff', padding: '60px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: '#3d3d3d', lineHeight: 2, margin: 0, maxWidth: 600, marginInline: 'auto', wordBreak: 'keep-all', fontWeight: 500 }}>
              {descLines[0]}
            </p>
          </div>
        )}

        {/* 추가 이미지 + 설명 — 어떤 개수든 안전하게 순차 렌더 (이미지가 없거나 1장만 있어도 OK) */}
        {images.slice(1).map((imgSrc, i) => {
          const lineIdx = i + 1
          const altBg = i % 2 === 0 ? '#fdf6ee' : '#fff'
          return (
            <div key={`img-${lineIdx}`}>
              <img src={imgSrc} alt={`商品画像 ${lineIdx + 1}`} style={{ width: '100%', display: 'block' }} />
              {descLines[lineIdx] && (
                <div style={{ background: altBg, padding: '44px 40px', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: '#3d3d3d', lineHeight: 1.9, margin: 0, wordBreak: 'keep-all' }}>
                    {descLines[lineIdx]}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {/* 스펙 테이블 — 장식 헤더 */}
        {content.specs.length > 0 && (
          <div style={{ background: '#faf6f2', padding: '52px 40px' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <p style={{ fontSize: 11, letterSpacing: 5, color: '#a06850', margin: '0 0 6px', fontWeight: 600 }}>
                ◆ INFORMATION ◆
              </p>
              <p style={{ fontSize: 26, color: '#1a1a1a', margin: 0, fontWeight: 900, letterSpacing: '-0.02em' }}>
                Product Details
              </p>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: '12px 20px', border: '1px solid #ead8c8' }}>
              {content.specs.map((spec, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', padding: '12px 8px',
                    borderBottom: i === content.specs.length - 1 ? 'none' : '1px dashed #f0e0d0',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ fontSize: 12, color: '#a06850', width: 110, flexShrink: 0, fontWeight: 600 }}>
                    {spec.key}
                  </span>
                  <span style={{ fontSize: 12, color: '#3d3d3d', flex: 1, lineHeight: 1.7, wordBreak: 'keep-all' }}>
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 키워드 */}
        {content.keywords.length > 0 && (
          <div style={{ background: '#fff', padding: '36px 40px' }}>
            <p style={{ fontSize: 11, color: '#c08770', textAlign: 'center', lineHeight: 2, margin: 0, fontWeight: 500 }}>
              {content.keywords.map((k) => `#${k}`).join('  ·  ')}
            </p>
          </div>
        )}

        {/* 가격 푸터 — 그라디언트 + 우표식 카드 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #5a4a3a 0%, #3d3d3d 100%)',
            padding: '48px 40px',
            textAlign: 'center',
          }}
        >
          {/* 가격 카드 */}
          {yenPrice && (
            <div
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #fce7d3 0%, #f5cfb4 100%)',
                padding: '18px 40px',
                borderRadius: 14,
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                marginBottom: content.caution ? 18 : 0,
              }}
            >
              <p style={{ fontSize: 10, letterSpacing: 3, color: '#a06850', margin: '0 0 4px', fontWeight: 600 }}>
                PRICE
              </p>
              <p style={{ fontSize: 34, fontWeight: 900, color: '#1a1a1a', margin: 0, letterSpacing: '-0.025em' }}>
                {yenPrice}
              </p>
            </div>
          )}
          {content.caution && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.8 }}>
              {content.caution}
            </p>
          )}
        </div>

        {termsImage && (
          <img src={termsImage} alt="" style={{ width: '100%', display: 'block' }} />
        )}
      </div>
    )
  }
)

Qoo10ModernPreview.displayName = 'Qoo10ModernPreview'
export default Qoo10ModernPreview
