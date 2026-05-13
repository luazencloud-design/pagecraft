/**
 * 큐텐(Qoo10) 전용 상세페이지 ZIP 익스포트
 *
 * 큐텐은 base64 인라인 이미지를 보안 정책으로 제거하므로 HTML과 이미지를 분리:
 *   - HTML: 텍스트 + 스타일 + 이미지 자리 placeholder 박스만
 *   - 이미지: 원본 상품 이미지들을 가로 820px 규격으로 리사이즈한 JPEG
 *
 * 사용자는 큐텐 에디터에서:
 *   1. HTML 붙여넣기 → 텍스트/레이아웃 잡힘 + 이미지 자리에 placeholder 박스 표시
 *   2. 각 placeholder 자리에 ZIP의 이미지를 차례로 끼워넣기
 *      (placeholder 박스 안의 번호와 ZIP 파일명의 번호가 매칭)
 */

interface Qoo10ExportInput {
  /** 미리보기 DOM (이미지 자리 placeholder 추출용) */
  node: HTMLElement
  /** 상품명 — ZIP/HTML 파일명 */
  productName: string
  /** lang 속성 — ja or ko */
  lang?: 'ja' | 'ko'
  /** 진행률 콜백 */
  onProgress?: (msg: string) => void
}

function safeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '').trim() || '큐텐상세'
}

/**
 * dataUrl 이미지를 가로 820px 규격으로 리사이즈해서 JPEG Blob 반환
 * 1MB 초과 시 quality 낮춰 재압축
 */
async function resizeImageToBlob(
  dataUrl: string,
  targetWidth = 820,
  initialQuality = 0.9,
): Promise<Blob | null> {
  const img = new Image()
  const loaded = await new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = dataUrl
  })
  if (!loaded) return null

  // 원본이 820보다 작으면 그대로, 크면 다운스케일
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

  // 1MB 미만 될 때까지 quality 단계적 감소
  let quality = initialQuality
  for (let attempt = 0; attempt < 4; attempt++) {
    const blob = await new Promise<Blob | null>((resolve) =>
      c.toBlob((b) => resolve(b), 'image/jpeg', quality),
    )
    if (!blob) return null
    if (blob.size <= 1024 * 1024) return blob
    quality -= 0.15
  }
  // 마지막 시도 — 0.45 quality
  return await new Promise<Blob | null>((resolve) =>
    c.toBlob((b) => resolve(b), 'image/jpeg', 0.45),
  )
}

/**
 * 미리보기 DOM 클론 → 모든 <img> 를 번호 매겨진 placeholder 박스로 교체 → outerHTML 반환
 * 반환 객체에 placeholder가 매칭되는 원본 dataUrl 리스트도 함께 (ZIP 이미지 파일 순서 기준)
 */
function buildHtmlAndExtractImages(node: HTMLElement): {
  html: string
  imageDataUrls: string[]
} {
  const cloned = node.cloneNode(true) as HTMLElement
  const imgs = Array.from(cloned.querySelectorAll('img'))
  const imageDataUrls: string[] = []

  imgs.forEach((img, i) => {
    const src = img.getAttribute('src') || ''
    imageDataUrls.push(src)

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

function wrapInDocument(inner: string, title: string, lang: 'ja' | 'ko'): string {
  const safeTitle = title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;">
${inner}
</body>
</html>`
}

/**
 * 큐텐 ZIP 익스포트 — 메인
 */
export async function exportQoo10Zip({
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

  // 1) HTML 생성 + 이미지 dataUrl 수집 (순서 그대로)
  const { html: innerHtml, imageDataUrls } = buildHtmlAndExtractImages(node)
  const html = wrapInDocument(innerHtml, productName, lang)

  // 2) 이미지 리사이즈 (가로 820, 1MB 미만 JPEG)
  onProgress?.(`이미지 리사이즈 중... (${imageDataUrls.length}장)`)
  const resizedBlobs: Array<{ name: string; blob: Blob }> = []

  for (let i = 0; i < imageDataUrls.length; i++) {
    const dataUrl = imageDataUrls[i]
    if (!dataUrl || !dataUrl.startsWith('data:')) continue
    const blob = await resizeImageToBlob(dataUrl, 820, 0.9)
    if (!blob) continue
    const idx = String(i + 1).padStart(2, '0')
    resizedBlobs.push({ name: `이미지_${idx}.jpg`, blob })
  }

  // 3) ZIP 패키징
  onProgress?.('ZIP 패키징 중...')
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  zip.file(`${safeFileName(productName)}.html`, html)
  resizedBlobs.forEach(({ name, blob }) => zip.file(name, blob))

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
    resizedBlobs.reduce((sum, { blob }) => sum + blob.size, 0) / 1024,
  )

  return {
    success: true,
    imageCount: resizedBlobs.length,
    totalSizeKB,
  }
}
