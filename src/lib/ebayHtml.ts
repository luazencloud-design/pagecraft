import type { GeneratedContent } from '@/types/ai'

/**
 * eBay 설명 에디터에 그대로 붙여넣을 HTML 빌더 — 모바일 친화 버전
 *
 * 모바일 트래픽 80%+ 환경에서 안전하게 보이는 단순 HTML만 사용:
 * - <strong> / <b> 굵기
 * - <ul> / <li> 불릿 리스트
 * - <hr> 가로 구분선
 * - <p> 문단 + line-height
 * - 이모지 (✨📋📦↩️💳)
 *
 * 피하는 것:
 * - <table> (모바일에서 가로 스크롤 / 잘림)
 * - 색상·폰트 변경 (모바일 stripping)
 * - <h1>/<h2> 큰 헤더 (eBay 자체 헤더와 충돌)
 * - 인라인 이미지 / 외부 CSS / class
 */
export function buildEbayHtml(c: GeneratedContent, price: string): string {
  const usd = price ? `$${Number(price.replace(/[^\d.]/g, '') || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''

  const FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif"
  const parts: string[] = []

  // 컨테이너 — 단일 div + 폰트만 (색상 없음)
  parts.push(`<div style="font-family:${FONT};line-height:1.6;">`)

  // 타이틀 — 가운데 정렬 굵게
  parts.push(`<p style="text-align:center;"><strong>${escapeHtml(c.product_name)}</strong></p>`)

  // 부제
  if (c.subtitle) {
    parts.push(`<p style="text-align:center;">${escapeHtml(c.subtitle)}</p>`)
  }

  // Condition + Price 라인 (가운데)
  const condParts: string[] = []
  if (c.condition) condParts.push(`<strong>Condition:</strong> ${escapeHtml(c.condition)}`)
  if (usd) condParts.push(`<strong>Price:</strong> ${usd} USD`)
  if (condParts.length > 0) {
    parts.push(`<p style="text-align:center;">${condParts.join('  &nbsp;|&nbsp;  ')}</p>`)
  }

  parts.push('<hr>')

  // 섹션 헤더 헬퍼 — 굵은 단순 텍스트 (h1/h2 X)
  const sectionHeader = (emoji: string, title: string) =>
    `<p><strong>${emoji} ${escapeHtml(title)}</strong></p>`

  // Key Features
  if (c.bullet_points && c.bullet_points.length > 0) {
    parts.push(sectionHeader('✨', 'Key Features'))
    parts.push('<ul>')
    for (const bp of c.bullet_points.slice(0, 7)) {
      parts.push(`<li>${escapeHtml(bp)}</li>`)
    }
    parts.push('</ul>')
    parts.push('<hr>')
  }

  // Description
  if (c.description) {
    parts.push(sectionHeader('📝', 'Description'))
    const lines = c.description.split('\n').filter(Boolean)
    for (const line of lines) {
      parts.push(`<p>${escapeHtml(line)}</p>`)
    }
    parts.push('<hr>')
  }

  // Item Specifics — 표 X, 불릿 리스트로
  if (c.item_specifics && c.item_specifics.length > 0) {
    parts.push(sectionHeader('📋', 'Item Specifics'))
    parts.push('<ul>')
    for (const sp of c.item_specifics) {
      parts.push(`<li><strong>${escapeHtml(sp.key)}:</strong> ${escapeHtml(sp.value)}</li>`)
    }
    parts.push('</ul>')
    parts.push('<hr>')
  }

  // Shipping
  if (c.shipping_policy) {
    parts.push(sectionHeader('📦', 'Shipping'))
    parts.push(`<p>${escapeHtml(c.shipping_policy)}</p>`)
    parts.push('<hr>')
  }

  // Returns
  if (c.return_policy) {
    parts.push(sectionHeader('↩️', 'Returns'))
    parts.push(`<p>${escapeHtml(c.return_policy)}</p>`)
    parts.push('<hr>')
  }

  // Payment
  if (c.payment_policy) {
    parts.push(sectionHeader('💳', 'Payment'))
    parts.push(`<p>${escapeHtml(c.payment_policy)}</p>`)
    parts.push('<hr>')
  }

  // Caution
  if (c.caution) {
    parts.push(`<p><strong>⚠️ Note:</strong> ${escapeHtml(c.caution)}</p>`)
  }

  // Tags
  if (c.keywords && c.keywords.length > 0) {
    parts.push(`<p><em>${c.keywords.map((k) => `#${escapeHtml(k)}`).join(' ')}</em></p>`)
  }

  parts.push('</div>')

  return parts.join('\n')
}

/**
 * 평문 fallback — 메모장 등 plain text only
 */
export function buildEbayPlainText(c: GeneratedContent, price: string): string {
  const usd = price ? `$${Number(price.replace(/[^\d.]/g, '') || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
  const lines: string[] = []
  const divider = '─────────────────────────'

  if (c.product_name) lines.push(c.product_name, '')
  if (c.subtitle) lines.push(c.subtitle, '')
  if (c.condition) lines.push(`Condition: ${c.condition}`)
  if (usd) lines.push(`Price: ${usd} USD`)
  if (c.condition || usd) lines.push('')

  if (c.bullet_points && c.bullet_points.length > 0) {
    lines.push(divider, '✨ KEY FEATURES', divider)
    for (const bp of c.bullet_points) lines.push(`• ${bp}`)
    lines.push('')
  }

  if (c.description) {
    lines.push(divider, '📝 DESCRIPTION', divider)
    lines.push(c.description, '')
  }

  if (c.item_specifics && c.item_specifics.length > 0) {
    lines.push(divider, '📋 ITEM SPECIFICS', divider)
    for (const sp of c.item_specifics) lines.push(`• ${sp.key}: ${sp.value}`)
    lines.push('')
  }

  if (c.shipping_policy) lines.push(divider, '📦 SHIPPING', divider, c.shipping_policy, '')
  if (c.return_policy) lines.push(divider, '↩️ RETURNS', divider, c.return_policy, '')
  if (c.payment_policy) lines.push(divider, '💳 PAYMENT', divider, c.payment_policy, '')

  if (c.caution) lines.push(`⚠️ Note: ${c.caution}`, '')

  if (c.keywords && c.keywords.length > 0) {
    lines.push(c.keywords.map((k) => `#${k}`).join(' '))
  }

  return lines.join('\n').trim()
}

/**
 * 클립보드에 rich text + plain text 동시 복사
 * - eBay 데스크톱/모바일 에디터: HTML 받아서 굵기/불릿/구분선 보존
 * - 메모장 등 plain text only: text/plain fallback
 */
export async function copyEbayToClipboard(content: GeneratedContent, price: string): Promise<boolean> {
  const html = buildEbayHtml(content, price)
  const plain = buildEbayPlainText(content, price)

  if (typeof window !== 'undefined' && window.ClipboardItem && navigator.clipboard?.write) {
    try {
      const htmlBlob = new Blob([html], { type: 'text/html' })
      const textBlob = new Blob([plain], { type: 'text/plain' })
      await navigator.clipboard.write([
        new window.ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ])
      return true
    } catch (err) {
      console.warn('ClipboardItem 실패, plain text fallback:', err)
    }
  }

  try {
    await navigator.clipboard.writeText(plain)
    return true
  } catch (err) {
    console.error('클립보드 복사 실패:', err)
    return false
  }
}

/** HTML escape — XSS 방지 + 클립보드 안전성 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
