'use client'

import { forwardRef } from 'react'
import type { GeneratedContent } from '@/types/ai'

interface Qoo10ClassicPreviewProps {
  content: GeneratedContent
  price: string
  images: string[]
  storeIntroImage?: string | null
  termsImage?: string | null
}

/**
 * Qoo10 재팬 — Classic 템플릿 v2 (잡지 에디토리얼 스타일)
 *
 * 카라그램·아누아·이니스프리 큐텐 페이지 분석 기반, 보다 화려한 매거진 톤:
 * - 84px 거대 영문 타이틀 (Serif, 이탤릭) + 일본어 부제 + 사이드 골드 라인
 * - 핫핑크/코랄 그라디언트 + 흰 패널 콜라주 헤더
 * - 셀링포인트: 거대 로마숫자 (I, II, III) + 수직 골드 라인 + 본문
 * - 색상 swatch: 풀 와이드 행 + 거대 영문 라벨 + ブルベ/イエベ 뱃지 + 컬러 보더
 * - 스펙: 우표식 액자 헤더 + 알파벳 사이드 인덱스
 * - 푸터: 살구 그라디언트 + 황금 도장식 가격
 */
const Qoo10ClassicPreview = forwardRef<HTMLDivElement, Qoo10ClassicPreviewProps>(
  ({ content, price, images, storeIntroImage, termsImage }, ref) => {
    const descLines = content.description ? content.description.split('\n').filter(Boolean) : []
    const yenPrice = price ? `¥${Number(price.replace(/[^\d]/g, '') || 0).toLocaleString()}` : ''

    return (
      <div
        ref={ref}
        style={{
          width: 820,
          fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans JP', 'Noto Sans KR', 'Hiragino Sans', sans-serif",
          lineHeight: 1.5,
          overflow: 'hidden',
          background: '#fff',
          color: '#5a4a3a',
        }}
      >
        {storeIntroImage && (
          <img src={storeIntroImage} alt="" style={{ width: '100%', display: 'block' }} />
        )}

        {/* 헤더 — 가운데 정렬 stacked 타이틀 + 부제 + 해시태그 칩
            (카라그램·아누아 큐텐 페이지 레퍼런스, Modern과 동일 구조 + Classic 톤) */}
        <div
          style={{
            background: 'linear-gradient(180deg, #fdf3e7 0%, #fae5d2 100%)',
            padding: '80px 40px 60px',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* 거대 영문 무드 — 코랄 액센트 */}
          {content.mood_callout && (
            <p
              style={{
                fontSize: 64, fontWeight: 900,
                color: '#d4877d',
                margin: '0 0 8px',
                letterSpacing: '-0.025em',
                lineHeight: 1.0,
              }}
            >
              {content.mood_callout}
            </p>
          )}

          {/* 타이틀 — mood_callout 없으면 hero 사이즈 */}
          <h1
            style={{
              fontSize: content.mood_callout ? 36 : 54,
              fontWeight: 900,
              color: '#3d1810',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              wordBreak: 'keep-all',
            }}
          >
            {content.product_name}
          </h1>

          {/* 부제 */}
          <p
            style={{
              fontSize: 14, color: '#7a4a3a',
              margin: '22px 0 0',
              lineHeight: 1.6, fontWeight: 500,
              wordBreak: 'keep-all', maxWidth: 560, marginInline: 'auto',
            }}
          >
            {content.subtitle}
          </p>

          {/* 해시태그 칩 — 코랄 톤 pill */}
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
                    background: '#f5c5b5',
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

        {/* 메인 이미지 풀블리드 */}
        {images[0] && (
          <img src={images[0]} alt="メイン" style={{ width: '100%', height: 'auto', display: 'block' }} />
        )}

        {/* 메인 카피 — 베이지 박스 (장식 인용구 제거, 깔끔하게) */}
        <div style={{ background: '#fdf6ee', padding: '72px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: 12, letterSpacing: 6, color: '#a06850', margin: '0 0 24px', fontWeight: 700 }}>
            ─ THE POINT ─
          </p>
          <p
            style={{
              fontSize: 26, fontWeight: 800, color: '#3d2820',
              lineHeight: 1.6, margin: 0, wordBreak: 'keep-all',
              maxWidth: 620, marginInline: 'auto',
              letterSpacing: '-0.015em',
            }}
          >
            {content.main_copy}
          </p>
        </div>

        {/* 셀링포인트 — 거대 번호 + 본문 */}
        <div style={{ background: '#fff', padding: '64px 50px' }}>
          <p
            style={{
              fontSize: 12, letterSpacing: 6, color: '#a06850', textAlign: 'center',
              margin: '0 0 44px', fontWeight: 700,
            }}
          >
            ─ FEATURES ─
          </p>

          {content.selling_points.slice(0, 3).map((sp, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                marginBottom: i === 2 ? 0 : 32,
                gap: 28,
                paddingBottom: i === 2 ? 0 : 32,
                borderBottom: i === 2 ? 'none' : '1px solid #f0e0d0',
              }}
            >
              {/* 거대 번호 — 두툼한 sans */}
              <div style={{ flexShrink: 0, minWidth: 90, textAlign: 'center' }}>
                <span
                  style={{
                    fontSize: 64, fontWeight: 900,
                    color: '#e0a890', lineHeight: 1,
                    letterSpacing: '-0.04em',
                    display: 'block',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ width: 28, height: 2, background: '#c08770', margin: '8px auto 0', borderRadius: 1 }} />
              </div>

              {/* 본문 + 작은 라벨 */}
              <div style={{ flex: 1, paddingTop: 6 }}>
                <p style={{ fontSize: 11, letterSpacing: 4, color: '#a06850', margin: '0 0 8px', fontWeight: 700 }}>
                  POINT — {String(i + 1).padStart(2, '0')}
                </p>
                <p style={{ fontSize: 16, color: '#3d2820', lineHeight: 1.8, margin: 0, wordBreak: 'keep-all', fontWeight: 500 }}>
                  {sp}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 첫 설명 문단 — 풀 와이드 */}
        {descLines[0] && (
          <div style={{ background: 'linear-gradient(135deg, #fbe9d8 0%, #f8c9a8 100%)', padding: '70px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: 16, color: '#3d2820', lineHeight: 2, margin: 0, maxWidth: 600, marginInline: 'auto', wordBreak: 'keep-all', fontWeight: 500 }}>
              {descLines[0]}
            </p>
          </div>
        )}

        {/* 추가 이미지 + 설명 */}
        {/* 추가 이미지 — 어떤 개수든 안전하게 순차 렌더 */}
        {images.slice(1).map((imgSrc, i) => {
          const lineIdx = i + 1
          const altBg = i % 2 === 0 ? '#fff' : '#fdf6ee'
          return (
            <div key={`img-${lineIdx}`}>
              <img src={imgSrc} alt={`商品 ${lineIdx + 1}`} style={{ width: '100%', display: 'block' }} />
              {descLines[lineIdx] && (
                <div style={{ background: altBg, padding: '46px 40px', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: '#3d2820', lineHeight: 1.9, margin: 0, wordBreak: 'keep-all', fontWeight: 500 }}>
                    {descLines[lineIdx]}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {/* 스펙 — 매거진 액자 */}
        {content.specs.length > 0 && (
          <div style={{ background: '#fdf6ee', padding: '56px 40px' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <p style={{ fontSize: 11, letterSpacing: 5, color: '#a06850', margin: '0 0 4px', fontWeight: 600 }}>
                ─── INFORMATION ───
              </p>
              <p style={{ fontSize: 30, color: '#a04030', margin: 0, fontWeight: 900, letterSpacing: '-0.02em' }}>
                Product Spec
              </p>
            </div>
            <div style={{ background: '#fff', borderRadius: 6, padding: '14px 26px', border: '2px solid #c08770', boxShadow: '0 6px 18px rgba(160,104,80,0.15)' }}>
              {content.specs.map((spec, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', padding: '14px 0',
                    borderBottom: i === content.specs.length - 1 ? 'none' : '1px dashed #ead8c8',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontSize: 12, color: '#c08770', width: 26, flexShrink: 0,
                      fontWeight: 900,
                    }}
                  >
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span style={{ fontSize: 12, color: '#a06850', width: 110, flexShrink: 0, fontWeight: 600 }}>
                    {spec.key}
                  </span>
                  <span style={{ fontSize: 13, color: '#3d2820', flex: 1, lineHeight: 1.7, wordBreak: 'keep-all' }}>
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 키워드 */}
        {content.keywords.length > 0 && (
          <div style={{ background: '#fff', padding: '38px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, letterSpacing: 4, color: '#a06850', margin: '0 0 12px', fontWeight: 700 }}>
              ─── tags ───
            </p>
            <p style={{ fontSize: 12, color: '#a06850', lineHeight: 2, margin: 0, fontWeight: 500 }}>
              {content.keywords.map((k) => `#${k}`).join('  ·  ')}
            </p>
          </div>
        )}

        {/* 가격 푸터 — 도장식 가격 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #c08770 0%, #a04030 100%)',
            padding: '52px 40px',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {yenPrice && (
            <>
              <p style={{ fontSize: 12, letterSpacing: 6, color: 'rgba(255,255,255,0.85)', margin: '0 0 8px', fontWeight: 700 }}>
                ─── PRICE ───
              </p>
              <p
                style={{
                  fontSize: 44, fontWeight: 900, color: '#fff',
                  margin: '0 0 10px', letterSpacing: '-0.02em',
                }}
              >
                {yenPrice}
              </p>
            </>
          )}
          {content.caution && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.7 }}>
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

Qoo10ClassicPreview.displayName = 'Qoo10ClassicPreview'
export default Qoo10ClassicPreview
