import { NextResponse } from 'next/server'
import { verifyInviteToken, signTrialSession, TRIAL_SESSION_COOKIE } from '@/lib/session'
import { isInviteTokenValid } from '@/lib/invites'
import { activateTrial } from '@/lib/trial'

/**
 * 초대 링크 클릭 → 토큰 검증(존재+버전) → 체험 활성화 → 세션 쿠키 → 앱으로
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') || ''
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin

  const decoded = await verifyInviteToken(token)
  if (!decoded) return NextResponse.redirect(`${origin}/?invite=invalid`)

  const inv = await isInviteTokenValid(decoded.id, decoded.v)
  if (!inv) return NextResponse.redirect(`${origin}/?invite=revoked`)

  // 첫 클릭 시 체험 시작 (invite id 기준)
  await activateTrial(inv.id)

  const session = await signTrialSession(inv.id, inv.name)
  const res = NextResponse.redirect(`${origin}/product/new`)
  res.cookies.set(TRIAL_SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
  return res
}
