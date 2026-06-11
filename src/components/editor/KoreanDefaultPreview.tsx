'use client'

import { forwardRef } from 'react'
import type { GeneratedContent } from '@/types/ai'
import GiftBlock from './GiftBlock'

interface KoreanDefaultPreviewProps {
  content: GeneratedContent
  price: string
  images: string[]
  storeIntroImage?: string | null
  termsImage?: string | null
  giftImage?: string | null
  giftDescription?: string | null
}

/**
 * 한국 (쿠팡·스마트스토어) 기본 템플릿 — 800px 표준 레이아웃
 * 헤더(검정/금색) + 메인이미지 + 셀링포인트 + 본문 + 사이사이 임팩트 한 줄 + 스펙 + 푸터
 *
 * 디자인 원칙:
 * - 글자 사이즈 전반적으로 키움 (모바일에서도 가독성 ↑)
 * - 사진 사이 텍스트는 selling_points 또는 description 한 문장 — 잘림 없이 그대로 표시
 *   (이전엔 32자 자르고 …을 붙였는데 잘린 모습이 어색해서 제거. 길이 제어는 프롬프트에서)
 */
const KoreanDefaultPreview = forwardRef<HTMLDivElement, KoreanDefaultPreviewProps>(
  ({ content, price, images, storeIntroImage, termsImage, giftImage, giftDescription }, ref) => {
    const descLines = content.description ? content.description.split('\n').filter(Boolean) : []
    const additionalImages = images.slice(1)

    // 사이사이 배너용 한 문장 — selling_points 우선, 부족하면 description 다음 줄
    // 잘림 없음 — 길이는 AI 프롬프트에서 30~50자 가이드로 통제
    const getBannerLine = (i: number): string => {
      const sp = content.selling_points[i]
      if (sp) return sp.trim()
      const dl = descLines[i + 1]
      if (dl) return dl.trim()
      return ''
    }

    return (
      <div
        ref={ref}
        style={{
          width: 800,
          fontFamily: "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif",
          lineHeight: 1.5,
          overflow: 'hidden',
          background: '#ffffff',
        }}
      >
        {/* 스토어 소개 이미지 (선택) */}
        {storeIntroImage && (
          <img src={storeIntroImage} alt="" style={{ width: '100%', display: 'block' }} />
        )}

        {/* 사은품 안내 (선택) — 스토어 소개 바로 아래 */}
        <GiftBlock giftImage={giftImage} giftDescription={giftDescription} />

        {/* 헤더 — 미니멀 화이트 / 블랙 타이포 + 골드 미세 악센트 */}
        <div
          style={{
            padding: '56px 40px 48px',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderBottom: '1px solid #ececec',
          }}
        >
          {/* 상단 미세 골드 마크 — 브랜드 톤 유지 */}
          <div
            style={{
              width: 28,
              height: 2,
              background: '#c8a050',
              marginBottom: 20,
            }}
          />
          <p
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: '#0f0f0f',
              textAlign: 'center',
              margin: 0,
              letterSpacing: '-0.025em',
              wordBreak: 'keep-all',
              lineHeight: 1.25,
            }}
          >
            {content.product_name}
          </p>
          {content.subtitle && (
            <p
              style={{
                fontSize: 15,
                color: '#777788',
                textAlign: 'center',
                margin: '14px 0 0',
                wordBreak: 'keep-all',
                fontWeight: 400,
                letterSpacing: '0.01em',
              }}
            >
              {content.subtitle}
            </p>
          )}
        </div>

        {/* 메인 이미지 */}
        {images[0] && (
          <img
            src={images[0]}
            alt="메인 상품 이미지"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        )}

        {/* 메인 카피 — 임팩트 강조 */}
        <div
          style={{
            background: '#f8f7f4',
            padding: '60px 40px',
            textAlign: 'center',
          }}
        >
          <div style={{ width: 60, height: 3, background: '#c8a050', margin: '0 auto 24px' }} />
          <p
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: '#0f0f0f',
              lineHeight: 1.45,
              margin: 0,
              maxWidth: 700,
              marginInline: 'auto',
              letterSpacing: '-0.02em',
              wordBreak: 'keep-all',
            }}
          >
            {content.main_copy}
          </p>
        </div>

        {/* 셀링포인트 — 3컬럼, 글자 키움 */}
        {content.selling_points.length > 0 && (
          <div
            style={{
              background: '#ffffff',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              padding: '60px 24px',
              gap: 16,
            }}
          >
            {content.selling_points.slice(0, 3).map((sp, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0 12px',
                }}
              >
                <p
                  style={{
                    fontSize: 38,
                    fontWeight: 900,
                    color: '#c8a050',
                    margin: '0 0 14px',
                    lineHeight: 1,
                    letterSpacing: '-0.04em',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </p>
                <div style={{ width: 30, height: 2, background: '#c8a050', margin: '0 0 14px' }} />
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#0f0f0f',
                    textAlign: 'center',
                    lineHeight: 1.55,
                    margin: 0,
                    wordBreak: 'keep-all',
                  }}
                >
                  {sp}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 첫 설명 문단 — 한 번만 (이전엔 사이사이 반복)
            메인카피와 동일 크기(30px)지만 두께는 더 얇게(600) — 강약 구분 */}
        {descLines[0] && (
          <div
            style={{
              background: '#f8f7f4',
              padding: '60px 40px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: 24,
                color: '#0f0f0f',
                lineHeight: 1.5,
                margin: 0,
                maxWidth: 700,
                marginInline: 'auto',
                wordBreak: 'keep-all',
                fontWeight: 600,
                letterSpacing: '-0.015em',
              }}
            >
              {descLines[0]}
            </p>
          </div>
        )}

        {/* 추가 이미지 + 짧은 임팩트 한 줄 (긴 설명 X) */}
        {additionalImages.map((imgSrc, i) => {
          const banner = getBannerLine(i)
          return (
            <div key={`img-${i + 1}`}>
              <img
                src={imgSrc}
                alt={`상품 이미지 ${i + 2}`}
                style={{ width: '100%', display: 'block' }}
              />
              {banner && (
                <div
                  style={{
                    background: i % 2 === 0 ? '#ffffff' : '#f8f7f4',
                    padding: '40px 40px',
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: '#0f0f0f',
                      lineHeight: 1.4,
                      margin: 0,
                      letterSpacing: '-0.015em',
                      wordBreak: 'keep-all',
                    }}
                  >
                    {banner}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {/* 스펙 테이블 */}
        {content.specs.length > 0 && (
          <div style={{ background: '#ffffff', padding: '52px 0' }}>
            <p
              style={{
                fontSize: 19,
                fontWeight: 900,
                color: '#c8a050',
                textAlign: 'center',
                margin: '0 0 10px',
                letterSpacing: '0.04em',
              }}
            >
              SPECIFICATION
            </p>
            <div style={{ width: 60, height: 2, background: '#c8a050', margin: '0 auto 28px' }} />
            {content.specs.map((spec, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  padding: '11px 60px',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    color: '#9998a8',
                    textAlign: 'right',
                    width: 180,
                    flexShrink: 0,
                    paddingRight: 24,
                    fontWeight: 500,
                  }}
                >
                  {spec.key}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: '#0f0f0f',
                    textAlign: 'left',
                    flex: 1,
                    lineHeight: 1.65,
                    wordBreak: 'keep-all',
                    fontWeight: 500,
                  }}
                >
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 키워드 */}
        {content.keywords.length > 0 && (
          <div
            style={{
              background: '#f8f7f4',
              padding: '36px 30px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: '#555568',
                lineHeight: 1.9,
                margin: 0,
                maxWidth: 740,
                marginInline: 'auto',
                wordBreak: 'keep-all',
                fontWeight: 500,
              }}
            >
              {content.keywords.map((k) => `#${k}`).join('  ')}
            </p>
          </div>
        )}

        {/* 가격 푸터 */}
        <div
          style={{
            padding: '36px 40px',
            background: '#161616',
            textAlign: 'center',
          }}
        >
          {price && (
            <p
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: '#c8a050',
                margin: '0 0 8px',
                letterSpacing: '-0.02em',
              }}
            >
              ₩{Number(price.replace(/[^\d]/g, '') || 0).toLocaleString()}
            </p>
          )}
          {content.caution && (
            <p
              style={{
                fontSize: 14,
                color: '#ffffff',
                lineHeight: 1.6,
                margin: 0,
                wordBreak: 'keep-all',
                fontWeight: 400,
              }}
            >
              {content.caution}
            </p>
          )}
        </div>

        {/* 약관 이미지 */}
        {termsImage && (
          <img src={termsImage} alt="" style={{ width: '100%', display: 'block' }} />
        )}
      </div>
    )
  }
)

KoreanDefaultPreview.displayName = 'KoreanDefaultPreview'
export default KoreanDefaultPreview
