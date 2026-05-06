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
 * Qoo10 재팬 — Classic 템플릿
 * 카라그램·이니스프리 큐텐 페이지 분석 기반
 *
 * 특징:
 * - 살구 베이지 그라디언트 배경 + 거대 영문 타이틀(70px)
 * - 해시태그 박스 그룹
 * - 색상별 BALLET PINK 식 영문 라벨 + パーソナルカラー 추천
 * - Noto Serif JP (세리프) 헤더 + Noto Sans JP 본문
 *
 * 800px 고정 폭
 */
const Qoo10ClassicPreview = forwardRef<HTMLDivElement, Qoo10ClassicPreviewProps>(
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
          background: '#fff',
          color: '#5a4a3a',
        }}
      >
        {storeIntroImage && (
          <img src={storeIntroImage} alt="" style={{ width: '100%', display: 'block' }} />
        )}

        {/* 거대 헤더 — 살구 베이지 그라디언트 */}
        <div
          style={{
            background: 'linear-gradient(180deg, #fbe9d8 0%, #f0d4ba 100%)',
            padding: '60px 40px',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {content.mood_callout && (
            <h1
              style={{
                fontFamily: "'Noto Serif JP', 'Hiragino Mincho Pro', serif",
                fontSize: 56,
                fontWeight: 600,
                color: '#c08770',
                margin: '0 0 4px',
                letterSpacing: '0.05em',
                lineHeight: 1.1,
              }}
            >
              {content.mood_callout}
            </h1>
          )}
          <p style={{ fontSize: 32, fontWeight: 700, color: '#5a4a3a', margin: '4px 0 16px', letterSpacing: '0.04em' }}>
            {content.product_name}
          </p>
          <p style={{ fontSize: 14, color: '#8a7060', margin: '0 0 28px' }}>
            {content.subtitle}
          </p>
          {content.hashtags && content.hashtags.length > 0 && (
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {content.hashtags.slice(0, 4).map((tag, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 12, color: '#fff',
                    background: '#e0a890', borderRadius: 16,
                    padding: '6px 16px', fontWeight: 500,
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

        {/* 메인 카피 — 베이지 박스 */}
        <div style={{ background: '#fdf6ee', padding: '64px 40px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, letterSpacing: 4, color: '#c08770', margin: '0 0 18px' }}>POINT</p>
          <p
            style={{
              fontFamily: "'Noto Serif JP', serif",
              fontSize: 26, fontWeight: 500, color: '#5a4a3a',
              lineHeight: 1.7, margin: 0,
              wordBreak: 'keep-all',
            }}
          >
            {content.main_copy}
          </p>
        </div>

        {/* 셀링포인트 — 큰 번호 + 본문 */}
        <div style={{ background: '#fff', padding: '60px 40px' }}>
          {content.selling_points.slice(0, 3).map((sp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: i === 2 ? 0 : 32, gap: 24 }}>
              <span
                style={{
                  fontFamily: "'Noto Serif JP', serif",
                  fontSize: 48, fontWeight: 600, color: '#e0a890',
                  lineHeight: 1, flexShrink: 0, minWidth: 60,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <p style={{ fontSize: 14, color: '#5a4a3a', lineHeight: 1.9, margin: 0, paddingTop: 12, wordBreak: 'keep-all' }}>
                {sp}
              </p>
            </div>
          ))}
        </div>

        {/* 사용 전/후 비교 */}
        {content.before_after && images[1] && images[2] && (
          <div style={{ background: '#fdf6ee', padding: '60px 40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={{ border: '1px solid #ead8c8', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
                <img src={images[1]} alt="" style={{ width: '100%', display: 'block' }} />
                <p style={{ fontSize: 14, color: '#888', textAlign: 'center', padding: '14px 0', margin: 0, background: '#fff' }}>
                  {content.before_after.before}
                </p>
              </div>
              <div style={{ border: '2px solid #e0a890', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
                <img src={images[2]} alt="" style={{ width: '100%', display: 'block' }} />
                <p style={{ fontSize: 14, color: '#c08770', textAlign: 'center', padding: '14px 0', margin: 0, fontWeight: 600 }}>
                  {content.before_after.after}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 색상 swatches — 큐텐 클래식 스타일 (영문 라벨 강조 + 퍼스널컬러 뱃지) */}
        {content.color_swatches && content.color_swatches.length > 0 && (
          <div style={{ background: '#fff', padding: '60px 40px' }}>
            {content.color_swatches.slice(0, 8).map((sw, i) => (
              <div
                key={i}
                style={{
                  borderBottom: i === content.color_swatches!.length - 1 ? 'none' : '1px solid #f0e0d0',
                  padding: '24px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 8 }}>
                  {sw.personal_color && (
                    <span
                      style={{
                        fontSize: 11, color: '#fff',
                        background: '#e0a890', borderRadius: 12,
                        padding: '3px 10px', fontWeight: 600,
                      }}
                    >
                      {sw.personal_color}におすすめ
                    </span>
                  )}
                  <p style={{ fontSize: 14, color: '#5a4a3a', margin: 0 }}>{sw.name}</p>
                </div>
                {sw.english_label && (
                  <p
                    style={{
                      fontFamily: "'Noto Serif JP', serif",
                      fontSize: 36, fontWeight: 600, color: '#c08770',
                      margin: '0 0 8px', letterSpacing: '0.04em',
                    }}
                  >
                    {sw.english_label}
                  </p>
                )}
                <p style={{ fontSize: 13, color: '#7a6050', lineHeight: 1.8, margin: 0, wordBreak: 'keep-all' }}>
                  {sw.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 첫 설명 문단 */}
        {descLines[0] && (
          <div style={{ background: '#fdf6ee', padding: '60px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: '#5a4a3a', lineHeight: 2, margin: 0, maxWidth: 640, marginInline: 'auto', wordBreak: 'keep-all' }}>
              {descLines[0]}
            </p>
          </div>
        )}

        {/* 추가 이미지 + 설명 */}
        {images.slice(content.before_after ? 3 : 1).map((imgSrc, i) => {
          const lineIdx = i + 1
          return (
            <div key={`img-${lineIdx}`}>
              <img src={imgSrc} alt={`商品 ${lineIdx + 1}`} style={{ width: '100%', display: 'block' }} />
              {descLines[lineIdx] && (
                <div style={{ background: '#fff', padding: '44px 40px', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: '#5a4a3a', lineHeight: 1.9, margin: 0, wordBreak: 'keep-all' }}>
                    {descLines[lineIdx]}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {/* 스펙 */}
        {content.specs.length > 0 && (
          <div style={{ background: '#fdf6ee', padding: '52px 40px' }}>
            <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 22, color: '#c08770', textAlign: 'center', margin: '0 0 28px', letterSpacing: '0.05em' }}>
              Product Information
            </p>
            {content.specs.map((spec, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', padding: '13px 28px',
                  borderBottom: i === content.specs.length - 1 ? 'none' : '1px solid #ead8c8',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ fontSize: 12, color: '#a89678', width: 130, flexShrink: 0 }}>{spec.key}</span>
                <span style={{ fontSize: 13, color: '#5a4a3a', flex: 1, lineHeight: 1.7, wordBreak: 'keep-all' }}>
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 키워드 */}
        {content.keywords.length > 0 && (
          <div style={{ background: '#fff', padding: '40px' }}>
            <p style={{ fontSize: 11, color: '#c08770', textAlign: 'center', lineHeight: 2, margin: 0 }}>
              {content.keywords.map((k) => `#${k}`).join('  ')}
            </p>
          </div>
        )}

        {/* 가격 푸터 */}
        <div style={{ background: 'linear-gradient(180deg, #c08770 0%, #a06850 100%)', padding: '36px 40px', textAlign: 'center' }}>
          {yenPrice && (
            <p style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 32, fontWeight: 600, color: '#fff', margin: '0 0 8px' }}>
              {yenPrice}
            </p>
          )}
          {content.caution && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{content.caution}</p>
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
