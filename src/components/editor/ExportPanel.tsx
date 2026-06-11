'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useImageStore } from '@/stores/imageStore'
import { useProductStore } from '@/stores/productStore'
import { showToast } from '@/components/ui/Toast'

/** 캔버스 둥근 사각형 path */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * 썸네일 오른쪽 하단에 사은품 이미지 배지 합성
 * — 흰 바탕 카드 + 얇은 파란 테두리 + 좌상단 작은 '+' 기호 (제품 + 사은품)
 */
function drawGiftBadge(ctx: CanvasRenderingContext2D, giftImg: HTMLImageElement) {
  const BLUE = '#3b82f6'
  const BOX = 150
  const M = 18
  const x = 600 - BOX - M
  const y = 600 - BOX - M
  const r = 14

  ctx.save()

  // 흰 카드 바탕 + 미세 그림자
  ctx.shadowColor = 'rgba(0,0,0,0.18)'
  ctx.shadowBlur = 12
  ctx.shadowOffsetY = 3
  roundRectPath(ctx, x, y, BOX, BOX, r)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.restore()

  // 이미지 (cover) — 안쪽 4px 패딩, 둥근 클립
  ctx.save()
  roundRectPath(ctx, x + 4, y + 4, BOX - 8, BOX - 8, r - 3)
  ctx.clip()
  const inner = BOX - 8
  const scale = Math.max(inner / giftImg.width, inner / giftImg.height)
  const sw = giftImg.width * scale
  const sh = giftImg.height * scale
  ctx.drawImage(giftImg, x + 4 + (inner - sw) / 2, y + 4 + (inner - sh) / 2, sw, sh)
  ctx.restore()

  // 얇은 파란 테두리
  roundRectPath(ctx, x, y, BOX, BOX, r)
  ctx.lineWidth = 3
  ctx.strokeStyle = BLUE
  ctx.stroke()

  // 좌상단 작은 '+' 기호 (제품 + 사은품)
  const cx = x
  const cy = y
  ctx.beginPath()
  ctx.arc(cx, cy, 16, 0, Math.PI * 2)
  ctx.fillStyle = BLUE
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - 7, cy)
  ctx.lineTo(cx + 7, cy)
  ctx.moveTo(cx, cy - 7)
  ctx.lineTo(cx, cy + 7)
  ctx.stroke()
}

/** 600x600 썸네일 크롭 편집기 */
function ThumbnailEditor() {
  const { images, thumbnailImageId, thumbnailDataUrl, setThumbnailDataUrl, giftImage } =
    useImageStore()
  const sourceImage = images.find((img) => img.id === thumbnailImageId)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
  const [giftImgEl, setGiftImgEl] = useState<HTMLImageElement | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  // 사은품 배지 — 사은품 이미지 있을 때만 의미. 기본 OFF.
  const [giftBadgeOn, setGiftBadgeOn] = useState(false)

  // 소스 이미지 로드
  useEffect(() => {
    if (!sourceImage) return
    const img = new Image()
    img.onload = () => {
      setImgEl(img)
      const scale = Math.max(600 / img.width, 600 / img.height)
      const sw = img.width * scale
      const sh = img.height * scale
      setOffset({ x: (600 - sw) / 2, y: (600 - sh) / 2 })
    }
    img.src = sourceImage.dataUrl
  }, [sourceImage])

  // 사은품 이미지 로드
  useEffect(() => {
    if (!giftImage) {
      setGiftImgEl(null)
      return
    }
    const img = new Image()
    img.onload = () => setGiftImgEl(img)
    img.src = giftImage
  }, [giftImage])

  // 캔버스 그리기
  const draw = useCallback(() => {
    if (!canvasRef.current || !imgEl) return
    const ctx = canvasRef.current.getContext('2d')!
    const scale = Math.max(600 / imgEl.width, 600 / imgEl.height)
    const sw = imgEl.width * scale
    const sh = imgEl.height * scale
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 600, 600)
    ctx.drawImage(imgEl, offset.x, offset.y, sw, sh)
    // 사은품 배지 — 토글 ON + 이미지 로드됐을 때만
    if (giftBadgeOn && giftImgEl) drawGiftBadge(ctx, giftImgEl)
  }, [imgEl, offset, giftBadgeOn, giftImgEl])

  useEffect(() => { draw() }, [draw])

  // 드래그로 위치 조절
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }
  const handleMouseUp = () => setDragging(false)

  // 썸네일 저장 (dataUrl로) — 캔버스에 이미 배지 합성된 상태 그대로 캡처
  const saveThumbnail = () => {
    if (!canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.92)
    setThumbnailDataUrl(dataUrl)
    showToast('썸네일이 생성되었습니다')
  }

  // 다운로드
  const downloadThumbnail = () => {
    const src = thumbnailDataUrl
    if (!src) return
    const { generatedContent } = useEditorStore.getState()
    const { product } = useProductStore.getState()
    const name = (generatedContent?.product_name || product.name || '상품')
      .replace(/[/\\?%*:|"<>]/g, '')
    const a = document.createElement('a')
    a.href = src
    a.download = `${name}_600x600.jpg`
    a.click()
    showToast('썸네일 다운로드 시작')
  }

  if (!sourceImage) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text3)', fontSize: 12 }}>
        이미지 그리드에서 📌 버튼으로<br />썸네일 이미지를 선택하세요
      </div>
    )
  }

  return (
    <div>
      {/* 크롭 미리보기 */}
      <div
        style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', borderRadius: 8, border: '1px solid var(--border)', cursor: 'grab', position: 'relative', background: '#fff' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={600}
          style={{ width: '100%', height: '100%' }}
        />
        {/* 가이드 */}
        <div style={{ position: 'absolute', inset: 0, border: '2px dashed var(--accent)', borderRadius: 8, pointerEvents: 'none', opacity: 0.4 }} />
      </div>
      <p style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginTop: 6 }}>
        드래그하여 위치 조절 · 600×600px
      </p>

      {/* 사은품 배지 토글 — 사은품 이미지 있을 때만 노출 */}
      {giftImage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 10,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(59,130,246,0.06)',
            border: '1px solid rgba(59,130,246,0.25)',
          }}
        >
          <button
            onClick={() => setGiftBadgeOn((v) => !v)}
            style={{
              width: 28,
              height: 16,
              borderRadius: 8,
              background: giftBadgeOn ? '#3b82f6' : 'var(--surface3)',
              border: `1px solid ${giftBadgeOn ? '#3b82f6' : 'var(--border2)'}`,
              cursor: 'pointer',
              position: 'relative',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '1px',
                left: '1px',
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: giftBadgeOn ? '#fff' : 'var(--text2)',
                transition: 'all 0.2s',
                transform: giftBadgeOn ? 'translateX(12px)' : 'translateX(0)',
              }}
            />
          </button>
          <span style={{ fontSize: 10.5, color: 'var(--text2)', flex: 1, lineHeight: 1.4 }}>
            썸네일에 사은품 배지 표시
            <br />
            <span style={{ color: 'var(--text3)' }}>오른쪽 하단 · 파란 테두리 + 기호</span>
          </span>
        </div>
      )}

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button
          onClick={saveThumbnail}
          style={{ flex: 1, padding: '8px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: 'var(--accent)', border: 'none', color: '#0c0c10', cursor: 'pointer' }}
        >
          ✓ 썸네일 확정
        </button>
        {thumbnailDataUrl && (
          <button
            onClick={downloadThumbnail}
            style={{ flex: 1, padding: '8px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: 'var(--green)', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            ⬇ 다운로드
          </button>
        )}
      </div>

      {/* 확정된 썸네일 미리보기 */}
      {thumbnailDataUrl && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>확정된 썸네일</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumbnailDataUrl} alt="썸네일" style={{ width: '100%', borderRadius: 6, border: '1px solid var(--border)' }} />
        </div>
      )}
    </div>
  )
}

export default function ExportPanel() {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-text3 uppercase tracking-[2px] mb-[14px]">썸네일 (600×600)</p>
      <ThumbnailEditor />
    </div>
  )
}
