import { NextResponse } from 'next/server'
import { exchangeCodeForEmail } from '@/lib/googleOAuth'
import {
  verifyOAuthState,
  signAdminSession, ADMIN_COOKIE,
  signTrialSession, TRIAL_SESSION_COOKIE,
} from '@/lib/session'
import { isAdmin, activateTrial } from '@/lib/trial'
import { getInvite } from '@/lib/invites'

/** 구글 OAuth 콜백 — 관리자 / 초대 사용자 둘 다 처리 (state.purpose 로 분기) */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin
  const code = url.searchParams.get('code')
  const stateRaw = url.searchParams.get('state') || undefined

  const state = await verifyOAuthState(stateRaw)
  if (!code || !state) return NextResponse.redirect(`${origin}/?login=error`)

  const email = await exchangeCodeForEmail(origin, code)
  if (!email) return NextResponse.redirect(`${origin}/?login=error`)

  // ── 관리자 ──
  if (state.purpose === 'admin') {
    if (!isAdmin(email)) return NextResponse.redirect(`${origin}/admin?error=not_admin`)
    const session = await signAdminSession(email)
    const res = NextResponse.redirect(`${origin}/admin`)
    res.cookies.set(ADMIN_COOKIE, session, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60,
    })
    return res
  }

  // ── 초대 사용자 ──
  // 구글 라운드트립 후 초대가 여전히 유효한지 재확인 (삭제/만료 시 차단)
  const inv = state.inv ? await getInvite(state.inv) : null
  if (!inv) return NextResponse.redirect(`${origin}/?invite=revoked`)

  // 구글 이메일 기준 체험 활성화 (이미 시작했으면 그대로)
  await activateTrial(email)

  const session = await signTrialSession(email, inv.id, inv.name)
  const res = NextResponse.redirect(`${origin}/product/new`)
  res.cookies.set(TRIAL_SESSION_COOKIE, session, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
  })
  return res
}
