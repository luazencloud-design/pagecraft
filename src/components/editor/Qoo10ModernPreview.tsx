'use client'

import { forwardRef } from 'react'
import type { GeneratedContent } from '@/types/ai'

interface Qoo10ModernPreviewProps {
  content: GeneratedContent
  price: string
  images: string[]
  storeIntroImage?: string | null
  termsImage?: string | null
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
  ({ content, price, images, storeIntroImage, termsImage }, ref) => {
    const descLines = content.description ? content.description.split('\n').filter(Boolean) : []
    const yenPrice = price ? `¥${Number(price.replace(/[^\d]/g, '') || 0).toLocaleString()}` : ''

    // 색상 swatch용 임시 컬러 매핑 (실제 색상 미감지 시 fallback)
    const swatchColors = ['#e8c5c5', '#d4a373', '#c9a09a', '#b08a78', '#dba9a9', '#e6b8a2', '#c4938b', '#a87968']

    return (
      <div
        ref={ref}
        style={{
          width: 800,
          fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
          lineHeight: 1.5,
          overflow: 'hidden',
          background: '#ffffff',
          color: '#3d3d3d',
        }}
      >
        {storeIntroImage && (
          <img src={storeIntroImage} alt="" style={{ width: '100%', display: 'block' }} />
        )}

        {/* 헤더 — 피치 그라디언트 + 떠 있는 도트 패턴 */}
        <div
          style={{
            background: 'linear-gradient(135deg, #fce7d3 0%, #f8dac1 50%, #f5cfb4 100%)',
            padding: '64px 40px 56px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 장식 도트 */}
          <div style={{ position: 'absolute', top: 28, left: 60, width: 8, height: 8, borderRadius: '50%', background: '#fff', opacity: 0.7 }} />
          <div style={{ position: 'absolute', top: 80, left: 110, width: 4, height: 4, borderRadius: '50%', background: '#c08770', opacity: 0.4 }} />
          <div style={{ position: 'absolute', top: 50, right: 80, width: 12, height: 12, borderRadius: '50%', background: '#fff', opacity: 0.5 }} />
          <div style={{ position: 'absolute', bottom: 40, right: 130, width: 6, height: 6, borderRadius: '50%', background: '#c08770', opacity: 0.5 }} />
          <div style={{ position: 'absolute', bottom: 70, left: 90, width: 10, height: 10, borderRadius: '50%', background: '#fff', opacity: 0.6 }} />

          {/* 상단 라벨 */}
          <div style={{ display: 'inline-block', padding: '5px 14px', background: 'rgba(255,255,255,0.7)', borderRadius: 20, marginBottom: 18 }}>
            <span style={{ fontSize: 11, letterSpacing: 3, color: '#a06850', fontWeight: 600 }}>
              ◆ K-BEAUTY ◆
            </span>
          </div>

          {/* 영문 무드 (있으면) */}
          {content.mood_callout && (
            <p
              style={{
                fontFamily: "'Playfair Display', 'Noto Serif JP', serif",
                fontSize: 14, letterSpacing: 5, color: '#a06850',
                margin: '0 0 12px', fontWeight: 500,
                fontStyle: 'italic',
              }}
            >
              ❀ {content.mood_callout} ❀
            </p>
          )}

          {/* 일본어 타이틀 */}
          <h1
            style={{
              fontSize: 36, fontWeight: 700, color: '#3d3d3d',
              margin: '0 0 12px', letterSpacing: '-0.02em',
              textShadow: '0 1px 2px rgba(255,255,255,0.5)',
            }}
          >
            {content.product_name}
          </h1>

          {/* 부제 */}
          <p style={{ fontSize: 14, color: '#7a5a48', margin: '0 0 24px', lineHeight: 1.7, fontWeight: 500 }}>
            {content.subtitle}
          </p>

          {/* 해시태그 — 스티커 스타일 */}
          {content.hashtags && content.hashtags.length > 0 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {content.hashtags.slice(0, 5).map((tag, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11, color: '#fff',
                    background: i % 2 === 0 ? '#e0a890' : '#c08770',
                    padding: '5px 13px', borderRadius: 14, fontWeight: 600,
                    boxShadow: '0 2px 4px rgba(160,104,80,0.25)',
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

        {/* 메인 카피 — 베이지 박스 + 장식 코너 */}
        <div
          style={{
            background: '#fdf6ee',
            padding: '70px 40px',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* 좌상단/우하단 코너 장식 */}
          <div style={{ position: 'absolute', top: 22, left: 22, width: 32, height: 32, borderTop: '2px solid #c08770', borderLeft: '2px solid #c08770' }} />
          <div style={{ position: 'absolute', bottom: 22, right: 22, width: 32, height: 32, borderBottom: '2px solid #c08770', borderRight: '2px solid #c08770' }} />

          <p style={{ fontSize: 12, letterSpacing: 6, color: '#a06850', margin: '0 0 24px', fontWeight: 600 }}>
            ─── POINT ───
          </p>
          <p style={{ fontSize: 24, fontWeight: 600, color: '#3d3d3d', lineHeight: 1.7, margin: 0, wordBreak: 'keep-all', maxWidth: 620, marginInline: 'auto' }}>
            {content.main_copy}
          </p>
        </div>

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
                  padding: '32px 18px 26px',
                  textAlign: 'center',
                  position: 'relative',
                  boxShadow: '0 4px 14px rgba(160,104,80,0.08)',
                  border: '1px solid #f0e0d0',
                  overflow: 'hidden',
                }}
              >
                {/* 상단 컬러 스트라이프 */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                  background: i === 0
                    ? 'linear-gradient(90deg, #f5cfb4, #e8c5c5)'
                    : i === 1
                      ? 'linear-gradient(90deg, #e8c5c5, #d4a8b0)'
                      : 'linear-gradient(90deg, #d4a8b0, #c08770)',
                }} />

                {/* 큰 번호 */}
                <div
                  style={{
                    fontFamily: "'Playfair Display', 'Noto Serif JP', serif",
                    fontSize: 56, fontWeight: 700,
                    color: '#e0a890', lineHeight: 1, margin: '0 0 12px',
                    fontStyle: 'italic',
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
            ))}
          </div>
        </div>

        {/* 사용 전/후 비교 */}
        {content.before_after && images[1] && images[2] && (
          <div style={{ background: '#fff', padding: '60px 40px' }}>
            <p style={{ fontSize: 12, letterSpacing: 5, color: '#a06850', textAlign: 'center', margin: '0 0 32px', fontWeight: 600 }}>
              BEFORE & AFTER
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, position: 'relative' }}>
              {/* 가운데 화살표 */}
              <div
                style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 44, height: 44, borderRadius: '50%',
                  background: '#c08770', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, zIndex: 2,
                  boxShadow: '0 4px 12px rgba(160,104,80,0.4)',
                }}
              >
                →
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                <img src={images[1]} alt="" style={{ width: '100%', display: 'block' }} />
                <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 12px', background: 'rgba(255,255,255,0.9)', borderRadius: 12, fontSize: 11, color: '#888', fontWeight: 600 }}>
                  {content.before_after.before}
                </div>
              </div>
              <div style={{ borderRadius: 12, overflow: 'hidden', position: 'relative', boxShadow: '0 8px 24px rgba(192,135,112,0.25)' }}>
                <img src={images[2]} alt="" style={{ width: '100%', display: 'block' }} />
                <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 12px', background: '#c08770', borderRadius: 12, fontSize: 11, color: '#fff', fontWeight: 700 }}>
                  ✦ {content.before_after.after}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 색상 swatches — 컬러 도트 + 영문 라벨 */}
        {content.color_swatches && content.color_swatches.length > 0 && (
          <div style={{ background: 'linear-gradient(180deg, #faf6f2 0%, #fdf6ee 100%)', padding: '60px 32px' }}>
            <p style={{ fontSize: 12, letterSpacing: 5, color: '#a06850', textAlign: 'center', margin: '0 0 8px', fontWeight: 600 }}>
              COLOR LINEUP
            </p>
            <p style={{ fontSize: 22, color: '#3d3d3d', textAlign: 'center', margin: '0 0 36px', fontWeight: 600 }}>
              全{content.color_swatches.length}カラー
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, content.color_swatches.length)}, 1fr)`, gap: 14 }}>
              {content.color_swatches.slice(0, 8).map((sw, i) => (
                <div
                  key={i}
                  style={{
                    background: '#fff', borderRadius: 14,
                    padding: '22px 14px 20px', textAlign: 'center',
                    border: '1px solid #f0e0d0',
                    boxShadow: '0 3px 10px rgba(160,104,80,0.06)',
                    position: 'relative',
                  }}
                >
                  {/* 컬러 도트 */}
                  <div
                    style={{
                      width: 52, height: 52, borderRadius: '50%',
                      background: swatchColors[i % swatchColors.length],
                      margin: '0 auto 14px',
                      boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.08), 0 2px 6px rgba(160,104,80,0.2)',
                    }}
                  />

                  {sw.english_label && (
                    <p
                      style={{
                        fontFamily: "'Playfair Display', 'Noto Serif JP', serif",
                        fontSize: 14, fontWeight: 700, color: '#3d3d3d',
                        margin: '0 0 4px', letterSpacing: '0.04em',
                      }}
                    >
                      {sw.english_label}
                    </p>
                  )}
                  <p style={{ fontSize: 10, color: '#a06850', margin: '0 0 10px', fontWeight: 600 }}>
                    {sw.name}
                  </p>
                  <p style={{ fontSize: 10, color: '#7a6050', lineHeight: 1.6, margin: '0 0 10px', wordBreak: 'keep-all' }}>
                    {sw.description}
                  </p>
                  {sw.personal_color && (
                    <span
                      style={{
                        display: 'inline-block', fontSize: 9, fontWeight: 700,
                        color: '#fff', background: '#c08770',
                        padding: '3px 9px', borderRadius: 10,
                      }}
                    >
                      ✓ {sw.personal_color}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 첫 설명 문단 — 인용구 스타일 */}
        {descLines[0] && (
          <div style={{ background: '#fff', padding: '60px 40px', textAlign: 'center', position: 'relative' }}>
            <span
              style={{
                fontFamily: "'Playfair Display', 'Noto Serif JP', serif",
                fontSize: 80, color: '#f0d4ba', position: 'absolute',
                top: 20, left: 60, lineHeight: 1, fontStyle: 'italic',
              }}
            >
              "
            </span>
            <p style={{ fontSize: 14, color: '#3d3d3d', lineHeight: 2, margin: 0, maxWidth: 600, marginInline: 'auto', wordBreak: 'keep-all', position: 'relative', zIndex: 1 }}>
              {descLines[0]}
            </p>
          </div>
        )}

        {/* 추가 이미지 + 설명 */}
        {images.slice(content.before_after ? 3 : 1).map((imgSrc, i) => {
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
              <p style={{ fontFamily: "'Playfair Display', 'Noto Serif JP', serif", fontSize: 24, color: '#3d3d3d', margin: 0, fontWeight: 600, fontStyle: 'italic' }}>
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
            position: 'relative',
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
              <p style={{ fontFamily: "'Playfair Display', 'Noto Serif JP', serif", fontSize: 32, fontWeight: 700, color: '#3d3d3d', margin: 0, letterSpacing: '0.02em' }}>
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
