import type { GeneratedContent } from '@/types/ai'

/**
 * eBay 설명 에디터에 그대로 붙여넣을 HTML 빌더
 *
 * eBay 정책:
 * - HTML 인라인 스타일(font-size/color/font-weight/text-decoration) 지원
 * - <h1>~<h3>, <p>, <ul>/<li>, <table>/<tr>/<td>, <strong>, <em>, <span style> 모두 OK
 * - JavaScript / iframe / form 등 active content 금지 (2017~)
 * - 외부 CSS / class 의존성 없는 inline-only 권장
 *
 * 클립보드에 text/html로 넣으면 eBay 에디터가 rich text로 받아 폰트 크기/색까지 그대로 보존.
 * text/plain fallback도 같이 제공해서 메모장 등에선 일반 텍스트로 보임.
 */
export function buildEbayHtml(c: GeneratedContent, price: string): string {
  const usd = price ? `$${Number(price.replace(/[^\d.]/g, '') || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''

  // 색상/폰트 — EbayPreview와 동일
  const TEXT = '#191919'
  const GRAY = '#707070'
  const ACCENT = '#0654BA'
  const PRICE = '#E53238'
  const FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif"

  const parts: string[] = []

  // 컨테이너
  parts.push(`<div style="font-family:${FONT};color:${TEXT};line-height:1.6;font-size:14px;max-width:800px;">`)

  // 타이틀
  parts.push(`<h1 style="font-size:22px;font-weight:700;color:${TEXT};margin:0 0 10px;line-height:1.35;">${escapeHtml(c.product_name)}</h1>`)

  // 부제
  if (c.subtitle) {
    parts.push(`<p style="font-size:14px;color:${GRAY};font-style:italic;margin:0 0 16px;">${escapeHtml(c.subtitle)}</p>`)
  }

  // Condition + Price
  const condLine: string[] = []
  if (c.condition) {
    condLine.push(`<span style="font-size:13px;font-weight:700;color:#3B7A14;background:#E8F4D8;padding:3px 12px;border:1px solid #A4D265;border-radius:3px;">✓ ${escapeHtml(c.condition)}</span>`)
  }
  if (usd) {
    condLine.push(`<span style="font-size:26px;font-weight:700;color:${PRICE};margin-left:14px;">${usd} <span style="font-size:13px;color:${GRAY};font-weight:600;">USD</span></span>`)
  }
  if (condLine.length > 0) {
    parts.push(`<p style="margin:0 0 24px;">${condLine.join('')}</p>`)
  }

  // 섹션 헤더 헬퍼
  const sectionHeader = (title: string) =>
    `<h2 style="font-size:18px;font-weight:700;color:${ACCENT};border-bottom:2px solid ${ACCENT};padding-bottom:6px;margin:28px 0 14px;">${escapeHtml(title)}</h2>`

  // Key Features
  if (c.bullet_points && c.bullet_points.length > 0) {
    parts.push(sectionHeader('★ Key Features'))
    parts.push('<ul style="margin:0;padding-left:22px;">')
    for (const bp of c.bullet_points.slice(0, 7)) {
      parts.push(`<li style="font-size:14px;line-height:1.7;margin:0 0 8px;">${escapeHtml(bp)}</li>`)
    }
    parts.push('</ul>')
  }

  // Description
  if (c.description) {
    parts.push(sectionHeader('Description'))
    const lines = c.description.split('\n').filter(Boolean)
    for (let i = 0; i < lines.length; i++) {
      const last = i === lines.length - 1
      parts.push(`<p style="font-size:14px;line-height:1.8;margin:${last ? '0' : '0 0 14px'};">${escapeHtml(lines[i])}</p>`)
    }
  }

  // Item Specifics 표
  if (c.item_specifics && c.item_specifics.length > 0) {
    parts.push(sectionHeader('Item Specifics'))
    parts.push('<table style="width:100%;border-collapse:collapse;font-size:14px;margin:0;"><tbody>')
    for (const sp of c.item_specifics) {
      parts.push(
        `<tr>` +
        `<td style="padding:8px 12px;color:${GRAY};font-weight:700;width:34%;border-bottom:1px solid #E5E5E5;">${escapeHtml(sp.key)}</td>` +
        `<td style="padding:8px 12px;color:${TEXT};border-bottom:1px solid #E5E5E5;">${escapeHtml(sp.value)}</td>` +
        `</tr>`,
      )
    }
    parts.push('</tbody></table>')
  }

  // Shipping
  if (c.shipping_policy) {
    parts.push(sectionHeader('Shipping'))
    parts.push(`<p style="font-size:14px;line-height:1.8;margin:0;">${escapeHtml(c.shipping_policy)}</p>`)
  }

  // Returns
  if (c.return_policy) {
    parts.push(sectionHeader('Returns'))
    parts.push(`<p style="font-size:14px;line-height:1.8;margin:0;">${escapeHtml(c.return_policy)}</p>`)
  }

  // Payment
  if (c.payment_policy) {
    parts.push(sectionHeader('Payment'))
    parts.push(`<p style="font-size:14px;line-height:1.8;margin:0;">${escapeHtml(c.payment_policy)}</p>`)
  }

  // Caution
  if (c.caution) {
    parts.push(
      `<p style="font-size:13px;color:#7A5D00;background:#FFF8E1;padding:10px 14px;border-left:3px solid #FFC107;margin:24px 0 0;line-height:1.7;">` +
      `<strong>Note:</strong> ${escapeHtml(c.caution)}</p>`,
    )
  }

  // Additional Information
  if (c.specs && c.specs.length > 0) {
    parts.push(`<div style="margin:28px 0 0;padding-top:18px;border-top:1px solid #E5E5E5;">`)
    parts.push(`<h3 style="font-size:12px;font-weight:700;color:${GRAY};letter-spacing:1px;margin:0 0 10px;">ADDITIONAL INFORMATION</h3>`)
    for (const sp of c.specs) {
      parts.push(
        `<p style="font-size:12px;margin:4px 0;line-height:1.6;">` +
        `<span style="color:${GRAY};font-weight:600;display:inline-block;width:200px;">${escapeHtml(sp.key)}</span>` +
        `<span style="color:${TEXT};">${escapeHtml(sp.value)}</span></p>`,
      )
    }
    parts.push('</div>')
  }

  // Tags
  if (c.keywords && c.keywords.length > 0) {
    parts.push(
      `<p style="font-size:12px;color:${GRAY};font-style:italic;margin:24px 0 0;">` +
      c.keywords.map((k) => `#${escapeHtml(k)}`).join('&nbsp;&nbsp;') +
      `</p>`,
    )
  }

  parts.push('</div>')

  return parts.join('\n')
}

/**
 * eBay 텍스트(plain) 빌더 — text/plain fallback
 * HTML 못 받는 곳(메모장 등)에서도 구조 알아볼 수 있도록.
 */
export function buildEbayPlainText(c: GeneratedContent, price: string): string {
  const usd = price ? `$${Number(price.replace(/[^\d.]/g, '') || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
  const lines: string[] = []

  if (c.product_name) lines.push(c.product_name, '')
  if (c.subtitle) lines.push(c.subtitle, '')
  if (c.condition) lines.push(`Condition: ${c.condition}`)
  if (usd) lines.push(`Price: ${usd} USD`)
  if (c.condition || usd) lines.push('')

  if (c.bullet_points && c.bullet_points.length > 0) {
    lines.push('★ KEY FEATURES')
    lines.push('─────────────')
    for (const bp of c.bullet_points) lines.push(`• ${bp}`)
    lines.push('')
  }

  if (c.description) {
    lines.push('DESCRIPTION')
    lines.push('─────────────')
    lines.push(c.description, '')
  }

  if (c.item_specifics && c.item_specifics.length > 0) {
    lines.push('ITEM SPECIFICS')
    lines.push('─────────────')
    for (const sp of c.item_specifics) lines.push(`${sp.key}: ${sp.value}`)
    lines.push('')
  }

  if (c.shipping_policy) lines.push('SHIPPING', '─────────────', c.shipping_policy, '')
  if (c.return_policy) lines.push('RETURNS', '─────────────', c.return_policy, '')
  if (c.payment_policy) lines.push('PAYMENT', '─────────────', c.payment_policy, '')

  if (c.caution) lines.push(`Note: ${c.caution}`, '')

  if (c.keywords && c.keywords.length > 0) {
    lines.push(c.keywords.map((k) => `#${k}`).join(' '))
  }

  return lines.join('\n').trim()
}

/**
 * 클립보드에 rich text + plain text 동시 복사
 * - eBay 설명 에디터 같은 rich-text editor: HTML 그대로 받아 폰트 크기/색 보존
 * - 메모장/터미널 등 plain text only: text/plain fallback
 */
export async function copyEbayToClipboard(content: GeneratedContent, price: string): Promise<boolean> {
  const html = buildEbayHtml(content, price)
  const plain = buildEbayPlainText(content, price)

  // 모던 브라우저: ClipboardItem API
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

  // Fallback: plain text만
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
