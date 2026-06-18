import { Resend } from 'resend'

/**
 * 매직링크 이메일 발송 — Resend
 *
 * env:
 *  - RESEND_API_KEY=re_xxx           (Resend 대시보드에서 발급)
 *  - EMAIL_FROM="PageCraft <onboarding@resend.dev>"
 *      · 도메인 인증 전: resend.dev onboarding 주소로 시작 가능 (본인에게만 발송 제한 가능성)
 *      · 도메인 인증 후: noreply@yourdomain.com 등 자유
 */
let client: Resend | null = null
function getResend(): Resend {
  if (client) return client
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY 환경변수가 필요합니다.')
  client = new Resend(key)
  return client
}

export async function sendMagicLinkEmail(to: string, link: string): Promise<void> {
  const from = process.env.EMAIL_FROM || 'PageCraft <onboarding@resend.dev>'
  const html = `
  <div style="font-family:'Apple SD Gothic Neo',Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
    <h2 style="margin:0 0 8px;font-size:20px">PageCraft 로그인</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6">
      아래 버튼을 눌러 로그인하세요. 이 링크는 <b>15분간</b> 유효합니다.
    </p>
    <a href="${link}" style="display:inline-block;padding:13px 28px;background:#c8a050;color:#0c0c10;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px">
      로그인하기
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.6">
      버튼이 안 되면 이 주소를 복사해 붙여넣으세요:<br>
      <span style="color:#666;word-break:break-all">${link}</span>
    </p>
    <p style="margin:16px 0 0;font-size:11px;color:#bbb">
      본인이 요청하지 않았다면 이 메일을 무시하세요.
    </p>
  </div>`

  const { error } = await getResend().emails.send({
    from,
    to,
    subject: 'PageCraft 로그인 링크',
    html,
  })
  if (error) {
    throw new Error(`메일 발송 실패: ${error.message || error.name}`)
  }
}
