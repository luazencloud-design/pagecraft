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

    const swatchColors = ['#e8c5c5', '#d4a373', '#c9a09a', '#b08a78', '#dba9a9', '#e6b8a2', '#c4938b', '#a87968']

    const ROMAN = ['I', 'II', 'III']

    return (
      <div
        ref={ref}
        style={{
          width: 800,
          fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
          lineHeight: 1.5,
          overflow: 'hidden',
          background: '#fff',
          color: '#5a4a3a',
        }}
      >
        {storeIntroImage && (
          <img src={storeIntroImage} alt="" style={{ width: '100%', display: 'block' }} />
        )}

        {/* 거대 헤더 — 빈티지 매거진 + 트렌디 스탬프/씰 */}
        <div
          style={{
            background: 'linear-gradient(160deg, #fbe9d8 0%, #f5c8a0 50%, #e8a878 100%)',
            padding: '70px 40px 60px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            minHeight: 460,
          }}
        >
          {/* 망점 패턴 오버레이 */}
          <div
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(160,80,60,0.15) 1.5px, transparent 1.5px)',
              backgroundSize: '14px 14px',
              opacity: 0.6,
              zIndex: 0,
            }}
          />
          {/* 비스듬 흰색 띠 */}
          <div
            style={{
              position: 'absolute', top: 30, right: -50,
              width: 200, height: 28,
              background: '#fff', opacity: 0.5,
              transform: 'rotate(45deg)',
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: 'absolute', top: 70, right: -30,
              width: 150, height: 14,
              background: '#fff', opacity: 0.3,
              transform: 'rotate(45deg)',
              zIndex: 0,
            }}
          />

          {/* 좌상단 매거진 ISSUE 라벨 */}
          <div
            style={{
              position: 'absolute', top: 26, left: 30, zIndex: 3,
              transform: 'rotate(-3deg)',
            }}
          >
            <div
              style={{
                fontFamily: "'Playfair Display', 'Noto Serif JP', serif",
                fontSize: 11, letterSpacing: 5, color: '#3d2820',
                fontStyle: 'italic', fontWeight: 700,
                background: '#fff',
                padding: '6px 14px',
                borderRadius: 2,
                boxShadow: '3px 3px 0 #a04030',
                border: '1px solid #3d2820',
              }}
            >
              ISSUE No. 01
            </div>
          </div>

          {/* 우상단 LIMITED 도장 */}
          <div
            style={{
              position: 'absolute', top: 30, right: 30, zIndex: 3,
              width: 80, height: 80, borderRadius: '50%',
              background: '#a04030',
              color: '#fde7d0',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Playfair Display', 'Noto Serif JP', serif",
              transform: 'rotate(8deg)',
              border: '3px double #fde7d0',
              boxShadow: '0 4px 12px rgba(160,64,48,0.4)',
            }}
          >
            <span style={{ fontSize: 8, letterSpacing: 2, fontWeight: 700 }}>★ LIMITED ★</span>
            <span style={{ fontSize: 16, fontWeight: 900, fontStyle: 'italic', marginTop: 2 }}>EDIT</span>
            <span style={{ fontSize: 8, letterSpacing: 1, fontWeight: 700, marginTop: 2 }}>2025</span>
          </div>

          {/* 컨텐츠 */}
          <div style={{ position: 'relative', zIndex: 2, paddingTop: 80 }}>
            {/* 메인 영문 타이틀 — 거대 Serif 이탤릭 */}
            {content.mood_callout && (
              <h1
                style={{
                  fontFamily: "'Playfair Display', 'Noto Serif JP', serif",
                  fontSize: 70, fontWeight: 900,
                  color: '#a04030',
                  margin: '0 0 4px',
                  letterSpacing: '0.02em',
                  lineHeight: 0.95,
                  fontStyle: 'italic',
                  textShadow: '4px 4px 0 rgba(255,255,255,0.5), 8px 8px 0 rgba(160,64,48,0.15)',
                  WebkitTextStroke: '1px #5a2a18',
                }}
              >
                {content.mood_callout}
              </h1>
            )}

            {/* 사이드 골드 라인 + 일본어/한국어 타이틀 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '20px 0 10px' }}>
              <span style={{ fontSize: 12, color: '#a04030' }}>✦</span>
              <div style={{ width: 40, height: 1, background: '#a04030' }} />
              <p style={{ fontSize: 26, fontWeight: 800, color: '#3d1810', margin: 0, letterSpacing: '0.03em', wordBreak: 'keep-all' }}>
                {content.product_name}
              </p>
              <div style={{ width: 40, height: 1, background: '#a04030' }} />
              <span style={{ fontSize: 12, color: '#a04030' }}>✦</span>
            </div>

            <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 14, color: '#5a2a18', margin: '0 0 28px', fontStyle: 'italic', wordBreak: 'keep-all' }}>
              ─── {content.subtitle} ───
            </p>

            {/* 해시태그 — 회전된 매거진 스티커 */}
            {content.hashtags && content.hashtags.length > 0 && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {content.hashtags.slice(0, 4).map((tag, i) => {
                  const palette = [
                    { bg: '#3d1810', fg: '#fde7d0' },
                    { bg: '#a04030', fg: '#fff' },
                    { bg: '#fff', fg: '#a04030' },
                    { bg: '#e08070', fg: '#fff' },
                  ]
                  const p = palette[i % palette.length]
                  return (
                    <span
                      key={i}
                      style={{
                        fontSize: 11, color: p.fg,
                        background: p.bg,
                        padding: '7px 16px',
                        borderRadius: 2,
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        transform: i % 2 === 0 ? 'rotate(-2.5deg)' : 'rotate(2.5deg)',
                        boxShadow: '3px 3px 0 rgba(61,24,16,0.3)',
                        border: p.bg === '#fff' ? '1px solid #a04030' : 'none',
                      }}
                    >
                      {tag}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 메인 이미지 풀블리드 */}
        {images[0] && (
          <img src={images[0]} alt="メイン" style={{ width: '100%', height: 'auto', display: 'block' }} />
        )}

        {/* 메인 카피 — 액자식 베이지 박스 */}
        <div style={{ background: '#fdf6ee', padding: '70px 40px', textAlign: 'center', position: 'relative' }}>
          {/* 사이드 장식 */}
          <div style={{ position: 'absolute', top: 24, left: 24, fontFamily: "'Playfair Display', serif", fontSize: 100, color: '#f0d4ba', lineHeight: 1, fontStyle: 'italic' }}>
            "
          </div>
          <div style={{ position: 'absolute', bottom: 24, right: 24, fontFamily: "'Playfair Display', serif", fontSize: 100, color: '#f0d4ba', lineHeight: 1, fontStyle: 'italic', transform: 'scaleX(-1)' }}>
            "
          </div>

          <p style={{ fontFamily: "'Playfair Display', 'Noto Serif JP', serif", fontSize: 14, letterSpacing: 6, color: '#a06850', margin: '0 0 18px', fontStyle: 'italic' }}>
            ─ THE POINT ─
          </p>
          <p
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontSize: 28, fontWeight: 500, color: '#3d2820',
              lineHeight: 1.7, margin: 0, wordBreak: 'keep-all',
              maxWidth: 620, marginInline: 'auto',
              position: 'relative', zIndex: 1,
            }}
          >
            {content.main_copy}
          </p>
        </div>

        {/* 셀링포인트 — 로마숫자 + 수직 라인 + 본문 */}
        <div style={{ background: '#fff', padding: '64px 50px' }}>
          <p
            style={{
              fontFamily: "'Playfair Display', 'Noto Serif JP', serif",
              fontSize: 20, color: '#a06850', textAlign: 'center',
              margin: '0 0 44px', fontStyle: 'italic', letterSpacing: '0.06em',
            }}
          >
            — Three Reasons To Love —
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
              {/* 거대 로마숫자 */}
              <div style={{ flexShrink: 0, minWidth: 90, textAlign: 'center' }}>
                <span
                  style={{
                    fontFamily: "'Playfair Display', 'Noto Serif JP', serif",
                    fontSize: 64, fontWeight: 700,
                    color: '#e0a890', lineHeight: 1,
                    fontStyle: 'italic',
                    display: 'block',
                  }}
                >
                  {ROMAN[i]}
                </span>
                <div style={{ width: 28, height: 2, background: '#c08770', margin: '8px auto 0', borderRadius: 1 }} />
              </div>

              {/* 본문 + 작은 라벨 */}
              <div style={{ flex: 1, paddingTop: 6 }}>
                <p style={{ fontSize: 11, letterSpacing: 4, color: '#a06850', margin: '0 0 8px', fontWeight: 600 }}>
                  POINT — {String(i + 1).padStart(2, '0')}
                </p>
                <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 16, color: '#3d2820', lineHeight: 1.85, margin: 0, wordBreak: 'keep-all' }}>
                  {sp}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 사용 전/후 비교 — 매거진 액자 */}
        {content.before_after && images[1] && images[2] && (
          <div style={{ background: 'linear-gradient(180deg, #fdf6ee 0%, #f8e0c8 100%)', padding: '60px 40px' }}>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: '#a06850', textAlign: 'center', margin: '0 0 32px', fontStyle: 'italic', letterSpacing: '0.04em' }}>
              ✦ Before & After ✦
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
              <div style={{ background: '#fff', padding: 8, borderRadius: 4, boxShadow: '0 4px 12px rgba(160,104,80,0.15)' }}>
                <img src={images[1]} alt="" style={{ width: '100%', display: 'block', borderRadius: 2 }} />
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: '#888', textAlign: 'center', padding: '14px 0 8px', margin: 0, fontStyle: 'italic', letterSpacing: '0.04em' }}>
                  {content.before_after.before}
                </p>
              </div>
              <div style={{ background: '#fff', padding: 8, borderRadius: 4, boxShadow: '0 8px 24px rgba(192,135,112,0.4)', border: '3px solid #c08770' }}>
                <img src={images[2]} alt="" style={{ width: '100%', display: 'block', borderRadius: 2 }} />
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: '#a04030', textAlign: 'center', padding: '14px 0 8px', margin: 0, fontWeight: 700, fontStyle: 'italic', letterSpacing: '0.04em' }}>
                  ★ {content.before_after.after} ★
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 색상 swatches — 매거진 행 스타일 + 컬러 도트 */}
        {content.color_swatches && content.color_swatches.length > 0 && (
          <div style={{ background: '#fff', padding: '60px 40px' }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <p style={{ fontSize: 11, letterSpacing: 5, color: '#a06850', margin: '0 0 4px', fontWeight: 600 }}>
                COLOR LINE-UP
              </p>
              <p style={{ fontFamily: "'Playfair Display', 'Noto Serif JP', serif", fontSize: 28, color: '#a04030', margin: 0, fontStyle: 'italic', letterSpacing: '0.04em' }}>
                {content.color_swatches.length} Shades
              </p>
            </div>

            {content.color_swatches.slice(0, 8).map((sw, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 24,
                  padding: '24px 14px',
                  borderTop: i === 0 ? '2px solid #c08770' : 'none',
                  borderBottom: i === Math.min(content.color_swatches!.length, 8) - 1 ? '2px solid #c08770' : '1px solid #f0e0d0',
                }}
              >
                {/* 컬러 도트 */}
                <div
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: swatchColors[i % swatchColors.length],
                    flexShrink: 0,
                    boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.1), 0 3px 8px rgba(160,104,80,0.25)',
                    border: '2px solid #fff',
                    outline: '1px solid #f0e0d0',
                  }}
                />

                {/* 텍스트 영역 */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                    {sw.personal_color && (
                      <span
                        style={{
                          fontSize: 10, color: '#fff',
                          background: '#c08770', borderRadius: 12,
                          padding: '3px 10px', fontWeight: 700,
                        }}
                      >
                        ✓ {sw.personal_color}におすすめ
                      </span>
                    )}
                    <p style={{ fontSize: 13, color: '#a06850', margin: 0, fontWeight: 600 }}>
                      {sw.name}
                    </p>
                  </div>
                  {sw.english_label && (
                    <p
                      style={{
                        fontFamily: "'Playfair Display', 'Noto Serif JP', serif",
                        fontSize: 30, fontWeight: 700, color: '#a04030',
                        margin: '0 0 6px', letterSpacing: '0.04em',
                        fontStyle: 'italic', lineHeight: 1.1,
                      }}
                    >
                      {sw.english_label}
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: '#7a5a48', lineHeight: 1.7, margin: 0, wordBreak: 'keep-all' }}>
                    {sw.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 첫 설명 문단 — 풀 와이드 인용 */}
        {descLines[0] && (
          <div style={{ background: 'linear-gradient(135deg, #fbe9d8 0%, #f8c9a8 100%)', padding: '70px 40px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 16, color: '#3d2820', lineHeight: 2.1, margin: 0, maxWidth: 600, marginInline: 'auto', wordBreak: 'keep-all', fontStyle: 'italic' }}>
              {descLines[0]}
            </p>
          </div>
        )}

        {/* 추가 이미지 + 설명 */}
        {images.slice(content.before_after ? 3 : 1).map((imgSrc, i) => {
          const lineIdx = i + 1
          const altBg = i % 2 === 0 ? '#fff' : '#fdf6ee'
          return (
            <div key={`img-${lineIdx}`}>
              <img src={imgSrc} alt={`商品 ${lineIdx + 1}`} style={{ width: '100%', display: 'block' }} />
              {descLines[lineIdx] && (
                <div style={{ background: altBg, padding: '46px 40px', textAlign: 'center' }}>
                  <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 14, color: '#3d2820', lineHeight: 1.95, margin: 0, wordBreak: 'keep-all', fontStyle: 'italic' }}>
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
              <p style={{ fontFamily: "'Playfair Display', 'Noto Serif JP', serif", fontSize: 30, color: '#a04030', margin: 0, fontStyle: 'italic', letterSpacing: '0.04em' }}>
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
                      fontFamily: "'Playfair Display', 'Noto Serif JP', serif",
                      fontSize: 11, color: '#c08770', width: 26, flexShrink: 0,
                      fontStyle: 'italic', fontWeight: 700,
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
            <p style={{ fontFamily: "'Playfair Display', 'Noto Serif JP', serif", fontSize: 11, letterSpacing: 4, color: '#a06850', margin: '0 0 12px', fontStyle: 'italic' }}>
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
          {/* 좌우 장식 */}
          <div style={{ position: 'absolute', top: '50%', left: 40, transform: 'translateY(-50%)', fontFamily: "'Playfair Display', serif", fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: 4, fontStyle: 'italic' }}>
            ─ ✦ ─
          </div>
          <div style={{ position: 'absolute', top: '50%', right: 40, transform: 'translateY(-50%)', fontFamily: "'Playfair Display', serif", fontSize: 14, color: 'rgba(255,255,255,0.4)', letterSpacing: 4, fontStyle: 'italic' }}>
            ─ ✦ ─
          </div>

          {yenPrice && (
            <>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, letterSpacing: 6, color: 'rgba(255,255,255,0.85)', margin: '0 0 8px', fontStyle: 'italic' }}>
                ─── PRICE ───
              </p>
              <p
                style={{
                  fontFamily: "'Playfair Display', 'Noto Serif JP', serif",
                  fontSize: 42, fontWeight: 700, color: '#fff',
                  margin: '0 0 10px', letterSpacing: '0.04em',
                  textShadow: '2px 2px 0 rgba(0,0,0,0.2)',
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
