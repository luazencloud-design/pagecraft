/**
 * 큐텐(Qoo10) 전용 상세페이지 ZIP 익스포트 — 2가지 방식
 *
 * 큐텐 에디터의 제약:
 *   - base64 인라인 이미지 제거 → 외부/큐텐 호스팅 URL만 가능
 *   - CSS position 일부 strip
 *   - <img> 사이 기본 행간 여백 발생 (block 변경 못 함)
 *
 * 두 가지 방식을 제공:
 *   A) Hybrid (텍스트 HTML + 분리 이미지)
 *      - HTML: 미리보기 DOM의 <img>를 placeholder 박스로 교체 (텍스트/스타일 보존)
 *      - 이미지: 가로 820 리사이즈된 원본 이미지 N장
 *      - 사용자가 큐텐 에디터에서 placeholder 자리에 이미지 끼워넣기
 *
 *   B) Sliced (상세페이지 통째 슬라이스)
 *      - 미리보기 DOM 전체를 1200px 청크로 세로 슬라이스 → JPEG
 *      - HTML: <table>로 이미지 stacked — 이미지 사이 여백 없음 (border-collapse + cellspacing 0)
 *      - 사용자가 큐텐 에디터에서 일괄 업로드 후 HTML img src만 교체하면 끝
 */

interface Qoo10ExportInput {
  node: HTMLElement
  productName: string
  lang?: 'ja' | 'ko'
  onProgress?: (msg: string) => void
}

function safeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '').trim() || '큐텐상세'
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/* ─────────────────────────────────────────────
 * 공통 유틸
 * ───────────────────────────────────────────── */

/** 1MB 초과 시 quality 단계적 감소하면서 JPEG 변환 */
async function canvasToJpegUnder1MB(
  c: HTMLCanvasElement,
  initialQuality = 0.9,
): Promise<Blob | null> {
  let quality = initialQuality
  for (let attempt = 0; attempt < 4; attempt++) {
    const blob = await new Promise<Blob | null>((resolve) =>
      c.toBlob((b) => resolve(b), 'image/jpeg', quality),
    )
    if (!blob) return null
    if (blob.size <= 1024 * 1024) return blob
    quality -= 0.15
  }
  return await new Promise<Blob | null>((resolve) =>
    c.toBlob((b) => resolve(b), 'image/jpeg', 0.45),
  )
}

async function resizeImageToBlob(dataUrl: string, targetWidth = 820): Promise<Blob | null> {
  const img = new Image()
  const ok = await new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = dataUrl
  })
  if (!ok) return null

  const scale = img.width > targetWidth ? targetWidth / img.width : 1
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  return canvasToJpegUnder1MB(c, 0.9)
}

async function ensureFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  try {
    await Promise.all([
      document.fonts.load('500 16px "Pretendard Variable"'),
      document.fonts.load('900 36px "Pretendard Variable"'),
      document.fonts.load('500 16px "Noto Sans JP"'),
      document.fonts.load('900 36px "Noto Sans JP"'),
    ])
    await document.fonts.ready
  } catch {
    /* 폰트 실패해도 진행 */
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ─────────────────────────────────────────────
 * 방식 A — Hybrid (HTML + 분리 이미지)
 * ───────────────────────────────────────────── */

function buildHybridHtml(node: HTMLElement): {
  html: string
  imageDataUrls: string[]
} {
  const cloned = node.cloneNode(true) as HTMLElement
  const imgs = Array.from(cloned.querySelectorAll('img'))
  const imageDataUrls: string[] = []

  imgs.forEach((img, i) => {
    imageDataUrls.push(img.getAttribute('src') || '')
    const idx = String(i + 1).padStart(2, '0')
    const placeholder = document.createElement('div')
    placeholder.setAttribute('data-qoo10-image-slot', idx)
    placeholder.style.cssText =
      'width:100%;max-width:820px;margin:0 auto;padding:80px 20px;' +
      'background:#f5f5f5;border:2px dashed #c8a050;color:#888;' +
      "font-family:'Pretendard Variable','Pretendard',sans-serif;" +
      'font-size:16px;font-weight:600;text-align:center;box-sizing:border-box;'
    placeholder.textContent = `▦ 이미지 ${idx} 자리`
    img.replaceWith(placeholder)
  })

  return { html: cloned.outerHTML, imageDataUrls }
}

function wrapHtmlDocument(inner: string, title: string, lang: 'ja' | 'ko'): string {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;">
${inner}
</body>
</html>`
}

/**
 * 방식 A — Hybrid (HTML 텍스트 + 분리 이미지) ZIP 익스포트
 */
export async function exportQoo10HybridZip({
  node,
  productName,
  lang = 'ja',
  onProgress,
}: Qoo10ExportInput): Promise<{
  success: boolean
  imageCount: number
  totalSizeKB: number
}> {
  onProgress?.('HTML 추출 중...')
  const { html: innerHtml, imageDataUrls } = buildHybridHtml(node)
  const html = wrapHtmlDocument(innerHtml, productName, lang)

  onProgress?.(`이미지 리사이즈 중... (${imageDataUrls.length}장)`)
  const resizedBlobs: Array<{ name: string; blob: Blob }> = []
  for (let i = 0; i < imageDataUrls.length; i++) {
    const dataUrl = imageDataUrls[i]
    if (!dataUrl || !dataUrl.startsWith('data:')) continue
    const blob = await resizeImageToBlob(dataUrl, 820)
    if (!blob) continue
    const idx = String(i + 1).padStart(2, '0')
    resizedBlobs.push({ name: `이미지_${idx}.jpg`, blob })
  }

  onProgress?.('ZIP 패키징 중...')
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  zip.file(`${safeFileName(productName)}.html`, html)
  resizedBlobs.forEach(({ name, blob }) => zip.file(name, blob))

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  triggerDownload(zipBlob, `큐텐_HTML_${safeFileName(productName)}.zip`)

  const totalSizeKB = Math.round(
    resizedBlobs.reduce((sum, { blob }) => sum + blob.size, 0) / 1024,
  )
  return { success: true, imageCount: resizedBlobs.length, totalSizeKB }
}

/* ─────────────────────────────────────────────
 * 방식 B — Sliced (통째 슬라이스)
 * ───────────────────────────────────────────── */

async function sliceCanvasToJpegs(
  source: HTMLCanvasElement,
  chunkHeight: number,
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
    const blob = await canvasToJpegUnder1MB(c, 0.9)
    if (blob) out.push(blob)
  }
  return out
}

/**
 * 슬라이스 이미지를 <table>로 stacked — 큐텐 에디터에서 이미지 사이 여백 없이 표시
 *
 * 핵심:
 *   - cellspacing="0" cellpadding="0" 의 HTML 속성으로 셀 간격 제거 (CSS strip에 안 죽음)
 *   - <img> 태그 사이에 공백/줄바꿈 없음 (text node로 인한 인라인 여백 방지)
 *   - 각 행마다 <tr><td><img></td></tr> — 한 줄 단위로 stacked
 */
function buildSlicedTableHtml(
  fileNames: string[],
  productName: string,
  lang: 'ja' | 'ko',
): string {
  const rows = fileNames
    .map(
      (name) =>
        `<tr><td style="padding:0;font-size:0;line-height:0;"><img src="${name}" width="820" style="display:block;width:820px;height:auto;margin:0;padding:0;border:0;vertical-align:top;"></td></tr>`,
    )
    .join('')

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(productName)}</title>
</head>
<body style="margin:0;padding:0;text-align:center;">
<table border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse;border-spacing:0;margin:0 auto;width:820px;">
<tbody>${rows}</tbody>
</table>
</body>
</html>`
}

/**
 * 방식 B — Sliced (통째 슬라이스) ZIP 익스포트
 */
export async function exportQoo10SlicedZip({
  node,
  productName,
  lang = 'ja',
  onProgress,
  chunkHeight = 1200,
  pixelRatio = 1.5,
}: Qoo10ExportInput & {
  chunkHeight?: number
  pixelRatio?: number
}): Promise<{
  success: boolean
  chunkCount: number
  totalSizeKB: number
}> {
  onProgress?.('상세페이지 렌더링 중...')
  await ensureFontsLoaded()

  const { toCanvas } = await import('html-to-image')
  const fullCanvas = await toCanvas(node, {
    pixelRatio,
    backgroundColor: '#ffffff',
    cacheBust: true,
  })

  const physicalChunkHeight = Math.round(chunkHeight * pixelRatio)
  onProgress?.(
    `이미지 슬라이싱 중... (총 ${Math.ceil(fullCanvas.height / physicalChunkHeight)}장)`,
  )
  const blobs = await sliceCanvasToJpegs(fullCanvas, physicalChunkHeight)

  onProgress?.('ZIP 패키징 중...')
  const fileNames = blobs.map((_, i) => `상세_${String(i + 1).padStart(2, '0')}.jpg`)
  const html = buildSlicedTableHtml(fileNames, productName, lang)

  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  zip.file(`${safeFileName(productName)}.html`, html)
  blobs.forEach((blob, i) => zip.file(fileNames[i], blob))

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  triggerDownload(zipBlob, `큐텐_슬라이스_${safeFileName(productName)}.zip`)

  const totalSizeKB = Math.round(blobs.reduce((sum, b) => sum + b.size, 0) / 1024)
  return { success: true, chunkCount: blobs.length, totalSizeKB }
}
