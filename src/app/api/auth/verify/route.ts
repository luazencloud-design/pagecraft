import { NextResponse } from 'next/server'
import { verifyMagicToken, signSession, SESSION_COOKIE } from '@/lib/session'
import { activateTrial } from '@/lib/trial'

/** 매직링크 클릭 → 검증 → 체험 활성화 → 세션 쿠키 → 앱으로 리다이렉트 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') || ''
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin

  const email = await verifyMagicToken(token)
  if (!email) {
    return NextResponse.redirect(`${origin}/?auth=invalid`)
  }

  // 첫 클릭 시 체험 시작 (이미 시작했으면 현 상태 유지)
  await activateTrial(email)

  const session = await signSession(email)
  const res = NextResponse.redirect(`${origin}/product/new`)
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
  return res
}
