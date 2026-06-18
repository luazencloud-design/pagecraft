import { NextResponse } from 'next/server'
import { signMagicToken } from '@/lib/session'
import { sendMagicLinkEmail } from '@/lib/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 매직링크 요청 — 이메일로 로그인 링크 발송 */
export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string }
    const clean = email?.trim().toLowerCase() || ''
    if (!EMAIL_RE.test(clean)) {
      return NextResponse.json({ error: '올바른 이메일을 입력해주세요.' }, { status: 400 })
    }

    const token = await signMagicToken(clean)
    // 링크 베이스 — 배포 URL(env) 우선, 없으면 요청 origin
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
    const link = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}`

    await sendMagicLinkEmail(clean, link)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('매직링크 발송 오류:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '메일 발송 실패' },
      { status: 500 },
    )
  }
}
