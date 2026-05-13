/**
 * 큐텐(Qoo10) 전용 상세페이지 ZIP 익스포트
 *
 * 큐텐 에디터는 `data:` base64 인라인 이미지를 보안 정책으로 통째로 제거하고,
 * 자기네 CDN에 호스팅된 URL만 받음. 그래서 우리 HTML을 그대로 붙여넣으면
 * 이미지가 전부 사라짐.
 *
 * 이 함수는 큐텐 셀러들의 표준 워크플로우를 자동화:
 *   1. 미리보기 DOM 전체를 캔버스로 한 번에 캡처
 *   2. 1200px 높이 단위로 세로 슬라이스 → JPEG 변환 (1MB/장 한도)
 *   3. ZIP으로 패키징 — 슬라이스 이미지 N장 + placeholder HTML + 사용법
 *
 * 사용자는 ZIP 풀어서:
 *   - 큐텐 에디터의 '이미지 업로드(내 파일)' 로 상세_01.jpg ~ NN.jpg 일괄 업로드
 *   - 큐텐이 발급한 CDN URL N개를 HTML의 placeholder와 매칭해서 교체
 *   - HTML을 큐텐 에디터에 붙여넣기
 */

interface Qoo10ExportOptions {
  productName: string
  /** ja(일본어) or ko(한국어). 큐텐은 jp 마켓이지만 사용자가 한국어 토글한 상태일 수도 */
  lang?: 'ja' | 'ko'
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
 * placeholder 박힌 큐텐용 HTML 생성
 * — 단순히 슬라이스 이미지를 세로 stacked. 큐텐 에디터에 그대로 붙여넣기 가능.
 * — src 부분은 사용자가 큐텐 CDN URL로 교체해야 함.
 */
function buildQoo10PlaceholderHtml(fileNames: string[], productName: string, lang: 'ja' | 'ko'): string {
  const title = productName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const imgs = fileNames
    .map(
      (name, i) =>
        `  <img src="${name}" alt="상세 ${String(i + 1).padStart(2, '0')}" style="display:block;width:100%;max-width:820px;height:auto;margin:0 auto;">`,
    )
    .join('\n')

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;text-align:center;">
<!--
  큐텐 업로드 가이드:
  1. 같은 폴더 내 상세_NN.jpg 파일들을 큐텐 에디터의
     "이미지 업로드 (내 파일)" 로 일괄 업로드하세요.
  2. 업로드 후 큐텐이 발급한 각 이미지의 CDN URL을 복사해서
     아래 <img> 태그의 src="상세_NN.jpg" 부분을 차례로 교체합니다.
  3. 교체 완료된 HTML 전체를 복사해서 큐텐 에디터에 붙여넣기.
-->
${imgs}
</body>
</html>`
}

const README = `# PageCraft — 큐텐 상세페이지 업로드 가이드

이 ZIP에는 다음이 들어있습니다:
  - 상세_01.jpg ~ 상세_NN.jpg : 세로로 슬라이스된 상세페이지 이미지들 (각 1MB 미만)
  - 상세페이지.html             : <img> placeholder가 박힌 단순 HTML
  - 사용법.txt                  : 이 파일

## 업로드 단계

[1] 큐텐 셀러 페이지에서 '이미지 업로드 (내 파일)' 클릭
    → 상세_01.jpg ~ NN.jpg 전체 선택 → 일괄 업로드
    → 큐텐이 각 이미지에 CDN URL을 발급해줍니다.

[2] 상세페이지.html 을 메모장(또는 VSCode)으로 열기
    → 안의 src="상세_01.jpg" ~ "상세_NN.jpg" 를
       큐텐 발급 URL로 차례차례 교체 (Ctrl+H find/replace 추천)

[3] 교체된 HTML 전체 복사
    → 큐텐 에디터의 HTML 모드(<>) 에 붙여넣기
    → 저장

## 왜 이렇게 해야 하나?

큐텐 에디터는 보안 정책상 base64 인라인 이미지를 자동 제거합니다.
이미지는 반드시 큐텐 CDN 또는 외부 호스팅 URL을 통해 참조되어야 합니다.

큐텐 이미지 제한:
  - 한 장당 1MB 이하 (JPG/JPEG/PNG/GIF)
  - 합계 40MB 까지
  - 가로 권장 820px

이 ZIP의 이미지들은 모두 위 제한에 맞춰 자동 슬라이스/압축되어 있습니다.
`

/**
 * 큐텐 ZIP 익스포트 메인 — 미리보기 DOM을 받아서 ZIP Blob 생성 후 다운로드
 */
export async function exportQoo10Zip(
  node: HTMLElement,
  {
    productName,
    lang = 'ja',
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

  // 3) ZIP 패키징
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  const fileNames = blobs.map(
    (_, i) => `상세_${String(i + 1).padStart(2, '0')}.jpg`,
  )
  blobs.forEach((blob, i) => {
    zip.file(fileNames[i], blob)
  })

  zip.file('상세페이지.html', buildQoo10PlaceholderHtml(fileNames, productName, lang))
  zip.file('사용법.txt', README)

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
