/**
 * 미리보기 DOM을 standalone HTML 파일로 다운로드
 *
 * 모든 템플릿(KoreanDefaultPreview / Qoo10Modern / Qoo10Classic / EbayPreview)이
 * inline style 기반이라 `outerHTML` 한 줄로 모든 스타일이 보존됨.
 * 이미지는 dataUrl 형태로 IndexedDB → DOM에 박혀있어서 외부 의존성도 없음.
 *
 * 결과 파일은 어떤 브라우저/디바이스에서 열어도 800px 폭으로 동일하게 보임.
 */

interface HtmlExportOptions {
  /** 다운로드 파일명에 사용 — 특수문자는 자동 정리 */
  productName: string
  /** 페이지 lang 속성 (ko/ja/en) — 검색엔진/접근성용 */
  lang?: 'ko' | 'ja' | 'en'
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#39;'
      default: return c
    }
  })
}

function safeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '').trim() || '상세페이지'
}

/**
 * 미리보기 root DOM을 standalone HTML로 직렬화 후 다운로드 트리거
 *
 * @param node - 미리보기 root 엘리먼트 (DetailPagePreview의 ref 대상)
 * @param options - 파일명/언어 설정
 * @returns 성공 여부
 */
export function downloadHtmlSnapshot(
  node: HTMLElement,
  { productName, lang = 'ko' }: HtmlExportOptions,
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  // 미리보기 root의 inline 스타일과 자식 트리 그대로 직렬화
  const innerHtml = node.outerHTML

  // 폰트 임포트 — CDN에서 받아오므로 인터넷 있는 환경에서 원본 typography 재현
  // 오프라인이라도 시스템 폰트로 자동 fallback (style의 fontFamily 리스트에 sans-serif 포함)
  const fontImports = `
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700;900&display=swap');
  `

  const title = escapeHtml(`${productName} - 상세페이지`)

  const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=800,initial-scale=1">
<title>${title}</title>
<style>
${fontImports}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: #f3f3f5;
  display: flex;
  justify-content: center;
  padding: 24px 0;
  font-family: 'Pretendard Variable', 'Pretendard', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
}
body > div {
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.08);
  background: #ffffff;
}
img { max-width: 100%; height: auto; }
@media (max-width: 840px) {
  body { padding: 0; }
  body > div { box-shadow: none; }
}
</style>
</head>
<body>
${innerHtml}
</body>
</html>`

  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `상세페이지_${safeFileName(productName)}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch (err) {
    console.error('HTML 다운로드 실패:', err)
    return false
  }
}
