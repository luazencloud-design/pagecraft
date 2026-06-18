import { NextResponse } from 'next/server'

/**
 * 관리자 구글 로그인 시작 — 구글 OAuth 동의 화면으로 리다이렉트
 * env: GOOGLE_CLIENT_ID
 * 등록 필요(구글 클라우드 콘솔): 리다이렉트 URI {APP_URL}/api/admin/google/callback
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID 미설정' }, { status: 500 })
  }
  const redirectUri = `${origin}/api/admin/google/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  })
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
