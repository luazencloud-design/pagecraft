import { NextResponse } from 'next/server'
import { buildGoogleAuthUrl } from '@/lib/googleOAuth'
import { signOAuthState } from '@/lib/session'

/**
 * 구글 로그인 시작 — 관리자용. (?admin=1)
 * 사용자(초대) 로그인은 /api/auth/invite 에서 시작됨.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin
  if (url.searchParams.get('admin') !== '1') {
    return NextResponse.redirect(`${origin}/`)
  }
  try {
    const state = await signOAuthState('admin')
    return NextResponse.redirect(buildGoogleAuthUrl(origin, state))
  } catch (err) {
    console.error(err)
    return NextResponse.redirect(`${origin}/admin?error=config`)
  }
}
