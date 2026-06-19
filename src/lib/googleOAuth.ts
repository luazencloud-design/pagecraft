/**
 * 구글 OAuth 공용 헬퍼 — 관리자 로그인 + 사용자(초대) 로그인 둘 다 사용
 * 콜백 URI 하나로 통일: {APP_URL}/api/oauth/google/callback
 */

export function googleRedirectUri(origin: string): string {
  return `${origin}/api/oauth/google/callback`
}

export function buildGoogleAuthUrl(origin: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID 미설정')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(origin),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

/** code → 구글 이메일 (실패 시 null) */
export async function exchangeCodeForEmail(origin: string, code: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: googleRedirectUri(origin),
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) return null
    const { access_token } = (await tokenRes.json()) as { access_token?: string }
    if (!access_token) return null

    const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const info = (await infoRes.json()) as { email?: string; verified_email?: boolean }
    // 인증된 이메일만 허용 (미인증 이메일 스푸핑 차단)
    if (!info.email || info.verified_email === false) return null
    return info.email.toLowerCase()
  } catch (err) {
    console.error('구글 OAuth 교환 오류:', err)
    return null
  }
}
