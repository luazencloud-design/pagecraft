'use client'

import { useState, useCallback, useMemo } from 'react'
import { useProductStore } from '@/stores/productStore'
import { useImageStore, MAX_IMAGES } from '@/stores/imageStore'
import { useUsageStore } from '@/stores/usageStore'
import { api, ApiError } from '@/lib/api'
import { compressForImageGen } from '@/lib/image'
import { showToast } from '@/components/ui/Toast'

export default function AiModelToggle() {
  const { product } = useProductStore()
  const {
    images, aiModelEnabled, aiModelGender, aiOnlyMode,
    setAiModelEnabled, setAiModelGender, setAiOnlyMode, addImages,
  } = useImageStore()

  const [generating, setGenerating] = useState(false)
  const [generatingSet, setGeneratingSet] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  // 풀세트 매수 (모델 시착 1장 + 각도 컷 N-1장). 슬라이더로 선택.
  const [setCount, setSetCount] = useState(4)

  // 한도는 "템플릿에 들어가는 이미지" 기준 — 모드에 따라 다르게 계산
  //  - AI 전용 모드 ON: AI 이미지만 템플릿에 들어가니 AI count 만 한도
  //  - mixed 모드: 모든 이미지가 템플릿에 들어가니 전체 count 한도
  const aiImagesCount = images.filter((img) => img.source === 'ai').length
  const remainingSlots = aiOnlyMode
    ? Math.max(0, MAX_IMAGES - aiImagesCount)
    : Math.max(0, MAX_IMAGES - images.length)
  const slotUsed = aiOnlyMode ? aiImagesCount : images.length
  const slotLabel = aiOnlyMode ? 'AI' : '전체'

  // 실제 생성 가능 매수 (사용자가 골랐어도 남은 슬롯만큼만)
  const effectiveCount = useMemo(
    () => Math.max(0, Math.min(setCount, remainingSlots)),
    [setCount, remainingSlots],
  )
  const sliderMax = Math.max(1, Math.min(10, remainingSlots || 1))

  const generate = useCallback(async () => {
    if (!product.name && images.length === 0) {
      setErrorMsg('상품명을 입력하거나 이미지를 먼저 업로드해주세요.')
      return
    }

    setGenerating(true)
    setErrorMsg('')
    try {
      // AI 이미지 생성용 — 1024px/0.9로 Gemini 출력 품질 보존 (최대 5장)
      const smallImages = await Promise.all(
        images.slice(0, 5).map((img) => compressForImageGen(img.dataUrl))
      )
      const result = await api.post<{ image: string }>('/api/image/generate', {
        productName: product.name,
        category: product.category,
        gender: aiModelGender,
        images: smallImages,
      })
      if (result.image) {
        addImages([result.image], true, 'ai')
        useUsageStore.getState().fetchUsage()
      }
    } catch (err) {
      if (err instanceof ApiError) {
        try {
          const body = JSON.parse(err.message)
          setErrorMsg(body.error || '이미지 생성에 실패했습니다.')
        } catch {
          setErrorMsg(err.message || '이미지 생성에 실패했습니다.')
        }
      } else {
        setErrorMsg('이미지 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setGenerating(false)
    }
  }, [product, images, aiModelGender, addImages])

  const generateSet = useCallback(async () => {
    if (images.length < 2) {
      setErrorMsg('AI 풀세트 생성은 원본 사진 2장 이상이 필요합니다.')
      return
    }
    if (effectiveCount === 0) {
      setErrorMsg('이미지 슬롯이 가득 찼습니다.')
      return
    }
    setGeneratingSet(true)
    setErrorMsg('')
    try {
      const smallImages = await Promise.all(
        images.slice(0, 5).map((img) => compressForImageGen(img.dataUrl)),
      )
      const result = await api.post<{ images: string[]; generated: number; requested: number }>(
        '/api/image/generate-set',
        {
          productName: product.name,
          category: product.category,
          gender: aiModelGender,
          images: smallImages,
          count: effectiveCount,
        },
      )
      if (result.images?.length) {
        addImages(result.images, true, 'ai')
        // 풀세트 성공 시 자동으로 AI 전용 모드 활성화 — 사용자가 끄고 싶으면 토글
        setAiOnlyMode(true)
        useUsageStore.getState().fetchUsage()
        if (result.generated < result.requested) {
          setErrorMsg(
            `${result.generated}/${result.requested}장 생성 (${result.requested - result.generated}장 실패) — 모자란 만큼 크레딧 환불됨`,
          )
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        try {
          const body = JSON.parse(err.message)
          setErrorMsg(body.error || '풀세트 생성에 실패했습니다.')
        } catch {
          setErrorMsg(err.message || '풀세트 생성에 실패했습니다.')
        }
      } else {
        setErrorMsg('풀세트 생성 중 오류가 발생했습니다.')
      }
    } finally {
      setGeneratingSet(false)
    }
  }, [images, product, aiModelGender, effectiveCount, addImages, setAiOnlyMode])

  return (
    <div>
      {/* Row 1: [toggle] [label] [badge] */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px 4px' }}>
        {/* Toggle */}
        <button
          onClick={() => setAiModelEnabled(!aiModelEnabled)}
          style={{
            width: '34px',
            height: '18px',
            borderRadius: '9px',
            background: aiModelEnabled ? 'var(--accent)' : 'var(--surface3)',
            border: `1px solid ${aiModelEnabled ? 'var(--accent)' : 'var(--border2)'}`,
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.2s',
            flexShrink: 0,
            padding: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: aiModelEnabled ? '#0c0c10' : 'var(--text2)',
              transition: 'all 0.2s',
              transform: aiModelEnabled ? 'translateX(16px)' : 'translateX(0)',
            }}
          />
        </button>

        {/* Label */}
        <span style={{ fontSize: '11px', color: 'var(--text2)', flex: 1 }}>
          AI 모델 이미지 생성
        </span>

        {/* Badge — green, NOT accent */}
        <span
          style={{
            fontSize: '9px',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(62,207,142,0.12)',
            color: 'var(--green)',
            fontWeight: 600,
          }}
        >
          AI
        </span>
      </div>

      {aiModelEnabled && (
        <>
          {/* Row 2: gender row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 18px 6px' }}>
            <div
              style={{
                display: 'flex',
                border: '1px solid var(--border2)',
                borderRadius: '6px',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setAiModelGender('female')}
                style={{
                  padding: '4px 12px',
                  fontSize: '10px',
                  fontWeight: 600,
                  background: aiModelGender === 'female' ? 'var(--accent)' : 'var(--surface2)',
                  color: aiModelGender === 'female' ? '#0c0c10' : 'var(--text3)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                여성
              </button>
              <button
                onClick={() => setAiModelGender('male')}
                style={{
                  padding: '4px 12px',
                  fontSize: '10px',
                  fontWeight: 600,
                  background: aiModelGender === 'male' ? 'var(--accent)' : 'var(--surface2)',
                  color: aiModelGender === 'male' ? '#0c0c10' : 'var(--text3)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                남성
              </button>
            </div>
          </div>

          {/* Row 3: generate button — GREEN */}
          <div style={{ padding: '4px 18px 8px' }}>
            <button
              onClick={generate}
              disabled={generating || generatingSet}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '7px',
                fontSize: '11px',
                fontWeight: 700,
                background: generating ? 'var(--surface3)' : 'var(--green)',
                border: 'none',
                color: generating ? 'var(--text3)' : '#fff',
                cursor: generating || generatingSet ? 'not-allowed' : 'pointer',
              }}
            >
              {generating ? '생성 중...' : '🧑 한 장 생성'}
            </button>

            {/* ── 풀세트 영역 ── */}
            <div
              style={{
                marginTop: 10,
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(200, 160, 80, 0.06)',
                border: '1px solid rgba(200, 160, 80, 0.25)',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginBottom: 6, letterSpacing: 0.5 }}>
                ✨ AI 이미지 풀세트
              </div>
              <p style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.5, margin: '0 0 8px' }}>
                모델 시착 1장 + 다양한 각도 제품 컷 N-1장.
                <br />
                <span style={{ color: 'var(--text2)' }}>원본 사진 2장 이상 필요</span>
              </p>

              {/* 매수 선택 — 슬라이더, 남은 슬롯에 맞춰 max 동적 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text2)', flexShrink: 0 }}>
                  생성 매수
                </span>
                <input
                  type="range"
                  min={1}
                  max={sliderMax}
                  value={effectiveCount}
                  onChange={(e) => setSetCount(Number(e.target.value))}
                  disabled={remainingSlots === 0}
                  style={{
                    flex: 1,
                    accentColor: 'var(--accent)',
                    cursor: remainingSlots === 0 ? 'not-allowed' : 'pointer',
                  }}
                />
                <span
                  style={{
                    minWidth: 26,
                    textAlign: 'right',
                    fontSize: 12,
                    fontWeight: 800,
                    color: 'var(--accent)',
                    fontFamily: 'var(--mono, monospace)',
                  }}
                >
                  {effectiveCount}장
                </span>
              </div>

              {/* 보조 안내 — 템플릿 슬롯 (모드별) / 크레딧 */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 9.5,
                  color: 'var(--text3)',
                  margin: '0 0 8px',
                }}
              >
                <span title={aiOnlyMode ? 'AI 전용 모드 — AI 이미지만 템플릿에 사용' : '모든 이미지가 템플릿에 사용됨'}>
                  {slotLabel} 슬롯 {slotUsed}/{MAX_IMAGES} (남음 {remainingSlots})
                </span>
                <span>
                  크레딧 <b style={{ color: 'var(--text2)' }}>{effectiveCount * 5}</b>개
                </span>
              </div>

              {/* AI 전용 모드 토글 — AI 이미지 있을 때만 의미 있음
                  잠긴 상태: AI 전용 ON + 전체 > 10 → 토글 OFF 못 함 (시각 hint) */}
              {images.some((i) => i.source === 'ai') && (() => {
                const wouldExceedIfOff = aiOnlyMode && images.length > MAX_IMAGES
                return (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 0 10px',
                      borderTop: '1px solid rgba(200,160,80,0.18)',
                      marginTop: 4,
                      marginBottom: 8,
                    }}
                  >
                    <button
                      onClick={() => {
                        const result = setAiOnlyMode(!aiOnlyMode)
                        if (!result.ok && result.excess) {
                          showToast(
                            `원본+AI 합쳐서 ${images.length}장이라 일반 모드 전환 불가 — ${result.excess}장 삭제 후 다시 시도`,
                            'error',
                          )
                        }
                      }}
                      style={{
                        width: 28,
                        height: 16,
                        borderRadius: 8,
                        background: aiOnlyMode ? 'var(--accent)' : 'var(--surface3)',
                        border: `1px solid ${aiOnlyMode ? 'var(--accent)' : 'var(--border2)'}`,
                        cursor: 'pointer',
                        position: 'relative',
                        flexShrink: 0,
                        padding: 0,
                      }}
                      title={
                        wouldExceedIfOff
                          ? `원본+AI ${images.length}장 — 일반 모드 전환 불가`
                          : aiOnlyMode
                            ? 'AI 이미지만 템플릿에 사용 중'
                            : '원본+AI 모두 사용 중'
                      }
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '1px',
                          left: '1px',
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: aiOnlyMode ? '#0c0c10' : 'var(--text2)',
                          transition: 'all 0.2s',
                          transform: aiOnlyMode ? 'translateX(12px)' : 'translateX(0)',
                        }}
                      />
                    </button>
                    <span style={{ fontSize: 10, color: 'var(--text2)', flex: 1, lineHeight: 1.4 }}>
                      AI 이미지만 템플릿에 사용
                      <br />
                      <span style={{ color: wouldExceedIfOff ? 'var(--red)' : 'var(--text3)' }}>
                        {wouldExceedIfOff
                          ? `🔒 원본+AI ${images.length}장 — ${images.length - MAX_IMAGES}장 삭제 후 끄기 가능`
                          : aiOnlyMode
                            ? '원본은 그리드에서 참고용'
                            : '원본+AI 모두 템플릿에 포함'}
                      </span>
                    </span>
                  </div>
                )
              })()}

              <button
                onClick={generateSet}
                disabled={
                  generating ||
                  generatingSet ||
                  images.length < 2 ||
                  effectiveCount === 0
                }
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  background:
                    generatingSet || images.length < 2 || effectiveCount === 0
                      ? 'var(--surface3)'
                      : 'var(--accent)',
                  border: 'none',
                  color:
                    generatingSet || images.length < 2 || effectiveCount === 0
                      ? 'var(--text3)'
                      : '#0c0c10',
                  cursor:
                    generating || generatingSet || images.length < 2 || effectiveCount === 0
                      ? 'not-allowed'
                      : 'pointer',
                }}
                title={
                  images.length < 2
                    ? '원본 사진 2장 이상 업로드 후 사용 가능'
                    : effectiveCount === 0
                      ? '슬롯이 가득 찼습니다 — 이미지를 삭제 후 다시 시도'
                      : `${effectiveCount}장 생성 (모델 ${Math.min(1, effectiveCount)} + 각도 ${Math.max(0, effectiveCount - 1)})`
                }
              >
                {generatingSet
                  ? `${effectiveCount}장 생성 중...`
                  : effectiveCount === 0
                    ? '⛔ 슬롯 가득 참'
                    : `✨ ${effectiveCount}장 한번에 생성`}
              </button>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div
                style={{
                  marginTop: '6px',
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: '8px',
                  padding: '8px 13px',
                  fontSize: '12px',
                  color: 'var(--red)',
                }}
              >
                {errorMsg}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
