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
 * Qoo10 재팬 — Modern 템플릿
 * 미니멀 K-뷰티 무드 (베이지/차콜 베이스, 깔끔한 정보 레이아웃)
 *
 * 800px 고정 폭 — html2canvas로 PNG 추출 호환
 */
const Qoo10ModernPreview = forwardRef<HTMLDivElement, Qoo10ModernPreviewProps>(
  ({ content, price, images, storeIntroImage, termsImage }, ref) => {
    const descLines = content.description ? content.description.split('\n').filter(Boolean) : []
    const yenPrice = price ? `¥${Number(price.replace(/[^\d]/g, '') || 0).toLocaleString()}` : ''

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

        {/* 헤더 — 베이지 배경, 큰 영문 무드 + 일본어 부제 */}
        <div
          style={{
            background: '#faf6f2',
            padding: '52px 40px 44px',
            textAlign: 'center',
          }}
        >
          {content.mood_callout && (
            <p style={{ fontSize: 13, letterSpacing: 4, color: '#a89678', margin: '0 0 14px', fontWeight: 500 }}>
              {content.mood_callout}
            </p>
          )}
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#3d3d3d', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            {content.product_name}
          </h1>
          <p style={{ fontSize: 14, color: '#888', margin: 0, lineHeight: 1.6 }}>
            {content.subtitle}
          </p>
          {content.hashtags && content.hashtags.length > 0 && (
            <div style={{ marginTop: 22, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {content.hashtags.slice(0, 5).map((tag, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11, color: '#a89678',
                    background: '#fff', border: '1px solid #ead8c8',
                    padding: '4px 12px', borderRadius: 14,
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

        {/* 메인 카피 */}
        <div
          style={{
            background: '#ffffff',
            padding: '60px 40px',
            textAlign: 'center',
          }}
        >
          <div style={{ width: 30, height: 1, background: '#a89678', margin: '0 auto 24px' }} />
          <p style={{ fontSize: 22, fontWeight: 500, color: '#3d3d3d', lineHeight: 1.7, margin: 0 }}>
            {content.main_copy}
          </p>
        </div>

        {/* 셀링포인트 — 3컬럼 미니멀 */}
        <div
          style={{
            background: '#faf6f2',
            padding: '60px 40px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 36,
          }}
        >
          {content.selling_points.slice(0, 3).map((sp, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#fff', border: '1px solid #e8c5c5',
                  margin: '0 auto 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#a89678', fontSize: 14, fontWeight: 600,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <p style={{ fontSize: 13, color: '#3d3d3d', lineHeight: 1.7, margin: 0, wordBreak: 'keep-all' }}>
                {sp}
              </p>
            </div>
          ))}
        </div>

        {/* 사용 전/후 비교 (있을 때만) */}
        {content.before_after && images[1] && images[2] && (
          <div style={{ background: '#fff', padding: '56px 40px' }}>
            <p style={{ fontSize: 12, letterSpacing: 3, color: '#a89678', textAlign: 'center', margin: '0 0 28px' }}>
              BEFORE / AFTER
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <img src={images[1]} alt="" style={{ width: '100%', display: 'block', borderRadius: 4 }} />
                <p style={{ fontSize: 12, color: '#888', textAlign: 'center', margin: '12px 0 0' }}>
                  {content.before_after.before}
                </p>
              </div>
              <div>
                <img src={images[2]} alt="" style={{ width: '100%', display: 'block', borderRadius: 4 }} />
                <p style={{ fontSize: 12, color: '#888', textAlign: 'center', margin: '12px 0 0' }}>
                  {content.before_after.after}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 색상 swatches — 색조 화장품 전용 */}
        {content.color_swatches && content.color_swatches.length > 0 && (
          <div style={{ background: '#faf6f2', padding: '60px 40px' }}>
            <p style={{ fontSize: 12, letterSpacing: 3, color: '#a89678', textAlign: 'center', margin: '0 0 32px' }}>
              COLOR LINEUP
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(4, content.color_swatches.length)}, 1fr)`,
                gap: 16,
              }}
            >
              {content.color_swatches.slice(0, 8).map((sw, i) => (
                <div
                  key={i}
                  style={{
                    background: '#fff', borderRadius: 6,
                    padding: '20px 12px', textAlign: 'center',
                    border: '1px solid #ead8c8',
                  }}
                >
                  {sw.english_label && (
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#3d3d3d', margin: '0 0 6px', letterSpacing: '0.02em' }}>
                      {sw.english_label}
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: '#a89678', margin: '0 0 12px' }}>{sw.name}</p>
                  <p style={{ fontSize: 11, color: '#666', lineHeight: 1.6, margin: 0, wordBreak: 'keep-all' }}>
                    {sw.description}
                  </p>
                  {sw.personal_color && (
                    <p style={{ fontSize: 10, color: '#a89678', margin: '8px 0 0' }}>
                      ⚫ {sw.personal_color}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 추가 이미지 + 설명 반복 */}
        {images.slice(content.before_after ? 3 : 1).map((imgSrc, i) => {
          const lineIdx = i + 1
          return (
            <div key={`img-${lineIdx}`}>
              <img src={imgSrc} alt={`商品画像 ${lineIdx + 1}`} style={{ width: '100%', display: 'block' }} />
              {descLines[lineIdx] && (
                <div style={{ background: '#fff', padding: '40px', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: '#3d3d3d', lineHeight: 1.8, margin: 0, wordBreak: 'keep-all' }}>
                    {descLines[lineIdx]}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {/* 첫 설명 문단 */}
        {descLines[0] && (
          <div style={{ background: '#fff', padding: '50px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#3d3d3d', lineHeight: 1.9, margin: 0, maxWidth: 660, marginInline: 'auto', wordBreak: 'keep-all' }}>
              {descLines[0]}
            </p>
          </div>
        )}

        {/* 스펙 테이블 */}
        {content.specs.length > 0 && (
          <div style={{ background: '#faf6f2', padding: '52px 40px' }}>
            <p style={{ fontSize: 12, letterSpacing: 4, color: '#a89678', textAlign: 'center', margin: '0 0 28px' }}>
              PRODUCT INFO
            </p>
            {content.specs.map((spec, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', padding: '11px 24px',
                  borderBottom: '1px solid #ead8c8',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: 12, color: '#a89678', width: 120, flexShrink: 0 }}>{spec.key}</span>
                <span style={{ fontSize: 12, color: '#3d3d3d', flex: 1, lineHeight: 1.7, wordBreak: 'keep-all' }}>
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 키워드 */}
        {content.keywords.length > 0 && (
          <div style={{ background: '#fff', padding: '40px' }}>
            <p style={{ fontSize: 11, color: '#a89678', textAlign: 'center', lineHeight: 2, margin: 0 }}>
              {content.keywords.map((k) => `#${k}`).join('  ')}
            </p>
          </div>
        )}

        {/* 가격 푸터 */}
        <div style={{ background: '#3d3d3d', padding: '32px 40px', textAlign: 'center' }}>
          {yenPrice && (
            <p style={{ fontSize: 26, fontWeight: 700, color: '#e8c5c5', margin: '0 0 6px', letterSpacing: '0.02em' }}>
              {yenPrice}
            </p>
          )}
          {content.caution && (
            <p style={{ fontSize: 11, color: '#bbb', margin: 0 }}>{content.caution}</p>
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
