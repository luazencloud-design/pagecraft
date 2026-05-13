/**
 * 큐텐(Qoo10) 전용 상세페이지 ZIP 익스포트
 *
 * 큐텐 에디터는 base64 인라인 이미지를 보안 정책으로 제거하므로, 상세페이지를
 * 1MB 미만 JPEG 청크 N장으로 자동 슬라이스해서 ZIP으로 묶어 다운로드.
 *
 * 사용자는 ZIP 풀어서 상세_01.jpg ~ NN.jpg 를 큐텐 에디터에 순서대로 업로드하면 끝.
 */

interface Qoo10ExportOptions {
  productName: string
  /** 슬라이스 청크 1장당 최대 높이(px). 기본 1200 — 820w × 1200h JPEG ≈ 200~500KB */
  chunkHeight?: number
  /** JPEG quality (0~1). 기본 0.85 */
  jpegQuality?: number
  /** 캡처 시 pixelRatio. 기본 1.5 (선명도 vs 메모리 균형) */
  pixelRatio?: number
  /** 진행률 콜백 — 토스트 업데이트용 */
  onProgress?: (msg: string) => void
}

function safeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '').trim() || '큐텐상세'
}

/**
 * 캔버스를 세로로 슬라이스해서 JPEG Blob 배열로 반환
 */
async function sliceCanvasToJpegs(
  source: HTMLCanvasElement,
  chunkHeight: number,
  quality: number,
): Promise<Blob[]> {
  const out: Blob[] = []
  const total = source.height
  const width = source.width

  for (let y = 0; y < total; y += chunkHeight) {
    const h = Math.min(chunkHeight, total - y)
    const c = document.createElement('canvas')
    c.width = width
    c.height = h
    const ctx = c.getContext('2d')
    if (!ctx) continue
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, h)
    ctx.drawImage(source, 0, y, width, h, 0, 0, width, h)

    const blob = await new Promise<Blob | null>((resolve) => {
      c.toBlob((b) => resolve(b), 'image/jpeg', quality)
    })
    if (blob) out.push(blob)
  }
  return out
}

/**
 * 큐텐 ZIP 익스포트 메인 — 미리보기 DOM을 받아서 ZIP Blob 생성 후 다운로드
 */
export async function exportQoo10Zip(
  node: HTMLElement,
  {
    productName,
    chunkHeight = 1200,
    jpegQuality = 0.85,
    pixelRatio = 1.5,
    onProgress,
  }: Qoo10ExportOptions,
): Promise<{ success: boolean; chunkCount: number; totalSizeKB: number }> {
  onProgress?.('상세페이지 렌더링 중...')

  // 폰트 보장 — 다른 다운로드와 동일 패턴
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await Promise.all([
        document.fonts.load('500 16px "Pretendard Variable"'),
        document.fonts.load('900 36px "Pretendard Variable"'),
        document.fonts.load('500 16px "Noto Sans JP"'),
        document.fonts.load('900 36px "Noto Sans JP"'),
      ])
      await document.fonts.ready
    } catch {
      /* 폰트 로드 실패해도 진행 */
    }
  }

  // 1) 전체 캔버스 캡처
  const { toCanvas } = await import('html-to-image')
  const fullCanvas = await toCanvas(node, {
    pixelRatio,
    backgroundColor: '#ffffff',
    cacheBust: true,
  })

  // 청크 높이를 pixelRatio 적용 후 픽셀로 변환
  const physicalChunkHeight = Math.round(chunkHeight * pixelRatio)

  onProgress?.(`이미지 슬라이싱 중... (총 ${Math.ceil(fullCanvas.height / physicalChunkHeight)}장)`)

  // 2) 세로 슬라이스 → JPEG Blob 배열
  const blobs = await sliceCanvasToJpegs(fullCanvas, physicalChunkHeight, jpegQuality)

  // 1MB 초과 청크가 있으면 quality 단계적으로 낮춰 재시도
  for (let i = 0; i < blobs.length; i++) {
    if (blobs[i].size > 1024 * 1024) {
      // 너무 큰 청크 — quality 0.7로 재압축
      const sliceY = i * physicalChunkHeight
      const h = Math.min(physicalChunkHeight, fullCanvas.height - sliceY)
      const c = document.createElement('canvas')
      c.width = fullCanvas.width
      c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) continue
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, c.width, h)
      ctx.drawImage(fullCanvas, 0, sliceY, c.width, h, 0, 0, c.width, h)
      const retry = await new Promise<Blob | null>((resolve) =>
        c.toBlob((b) => resolve(b), 'image/jpeg', 0.7),
      )
      if (retry) blobs[i] = retry
    }
  }

  onProgress?.('ZIP 패키징 중...')

  // 3) ZIP 패키징 — 슬라이스 이미지만, 큐텐 에디터에 순서대로 업로드하면 끝
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  blobs.forEach((blob, i) => {
    const name = `상세_${String(i + 1).padStart(2, '0')}.jpg`
    zip.file(name, blob)
  })

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })

  // 4) 다운로드 트리거
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `큐텐_${safeFileName(productName)}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)

  const totalSizeKB = Math.round(
    blobs.reduce((sum, b) => sum + b.size, 0) / 1024,
  )

  return { success: true, chunkCount: blobs.length, totalSizeKB }
}
