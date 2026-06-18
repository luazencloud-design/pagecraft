import { NextResponse } from 'next/server'
import { verifyInviteToken, signOAuthState } from '@/lib/session'
import { isInviteTokenValid } from '@/lib/invites'
import { buildGoogleAuthUrl } from '@/lib/googleOAuth'

/**
 * 초대 링크 클릭 → 토큰 검증(존재+버전+유효기간) → 구글 로그인으로
 * 구글 로그인 후 콜백에서 이메일 기준 체험 활성화.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') || ''
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin

  const decoded = await verifyInviteToken(token)
  if (!decoded) return NextResponse.redirect(`${origin}/?invite=invalid`)

  const inv = await isInviteTokenValid(decoded.id, decoded.v)
  if (!inv) return NextResponse.redirect(`${origin}/?invite=revoked`)

  try {
    const state = await signOAuthState('invite', inv.id)
    return NextResponse.redirect(buildGoogleAuthUrl(origin, state))
  } catch (err) {
    console.error('초대 OAuth 시작 오류:', err)
    return NextResponse.redirect(`${origin}/?invite=error`)
  }
}
