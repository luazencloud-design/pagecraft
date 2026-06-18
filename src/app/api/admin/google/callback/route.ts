import { NextResponse } from 'next/server'
import { signAdminSession, ADMIN_COOKIE } from '@/lib/session'
import { isAdmin } from '@/lib/trial'

/**
 * 구글 OAuth 콜백 — code → 토큰 → 이메일 → ADMIN_EMAILS 확인 → 관리자 세션
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(`${origin}/admin?error=no_code`)

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/admin?error=config`)
  }
  const redirectUri = `${origin}/api/admin/google/callback`

  try {
    // 1) code → access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) return NextResponse.redirect(`${origin}/admin?error=token`)
    const { access_token } = (await tokenRes.json()) as { access_token?: string }
    if (!access_token) return NextResponse.redirect(`${origin}/admin?error=token`)

    // 2) 이메일 조회
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const info = (await infoRes.json()) as { email?: string }
    const email = info.email?.toLowerCase()
    if (!email || !isAdmin(email)) {
      return NextResponse.redirect(`${origin}/admin?error=not_admin`)
    }

    // 3) 관리자 세션 쿠키
    const session = await signAdminSession(email)
    const res = NextResponse.redirect(`${origin}/admin`)
    res.cookies.set(ADMIN_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })
    return res
  } catch (err) {
    console.error('구글 OAuth 콜백 오류:', err)
    return NextResponse.redirect(`${origin}/admin?error=oauth`)
  }
}
