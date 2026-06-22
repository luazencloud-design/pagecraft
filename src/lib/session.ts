import { SignJWT, jwtVerify } from 'jose'

/**
 * jose JWT 기반 토큰/세션 (DB 불필요)
 *  - 초대 토큰: 관리자 발급 링크. 만료 없음, version으로 무효화
 *  - 체험 세션: 초대 클릭 후 로그인 (subject=invite id, 30일)
 *  - 관리자 세션: 구글 OAuth 후 (7일)
 *
 * AUTH_SECRET 환경변수(16자+)로 서명.
 */
function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET 환경변수가 필요합니다 (32자 이상 권장).')
  return new TextEncoder().encode(s)
}

/* ── 초대 토큰 (관리자 발급) — 만료 없음, Redis version으로 무효화 ── */
export async function signInviteToken(inviteId: string, version: number): Promise<string> {
  return new SignJWT({ kind: 'invite', id: inviteId, v: version })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .sign(getSecret())
}

export async function verifyInviteToken(token: string): Promise<{ id: string; v: number } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.kind !== 'invite' || typeof payload.id !== 'string' || typeof payload.v !== 'number') return null
    return { id: payload.id, v: payload.v }
  } catch {
    return null
  }
}

/* ── 체험 세션 (초대 클릭 + 구글 로그인 후) ──────────────────────
 *   sub = 구글 이메일(크레딧 신원), inv = 들어온 초대 id(삭제/만료 시 차단), name = 초대 이름 */
export const TRIAL_SESSION_COOKIE = 'pc_session'

export async function signTrialSession(email: string, inv: string, name: string): Promise<string> {
  return new SignJWT({ kind: 'trial-session', sub: email, inv, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

export async function verifyTrialSession(
  token: string | undefined,
): Promise<{ sub: string; inv: string; name: string } | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.kind !== 'trial-session' || typeof payload.sub !== 'string') return null
    return {
      sub: payload.sub,
      inv: typeof payload.inv === 'string' ? payload.inv : '',
      name: typeof payload.name === 'string' ? payload.name : '',
    }
  } catch {
    return null
  }
}

/* ── 구글 OAuth state (CSRF 방지 + 용도 전달) ──
 *   purpose: 'admin' | 'invite', invite면 inv(초대 id) 동반 */
export async function signOAuthState(purpose: 'admin' | 'invite', inv?: string): Promise<string> {
  return new SignJWT({ kind: 'oauth-state', purpose, inv: inv || '' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getSecret())
}

export async function verifyOAuthState(
  token: string | undefined,
): Promise<{ purpose: 'admin' | 'invite'; inv: string } | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.kind !== 'oauth-state') return null
    const purpose = payload.purpose
    if (purpose !== 'admin' && purpose !== 'invite') return null
    return { purpose, inv: typeof payload.inv === 'string' ? payload.inv : '' }
  } catch {
    return null
  }
}

/* ── 관리자 세션 (구글 OAuth 후) ── */
export const ADMIN_COOKIE = 'pc_admin'

export async function signAdminSession(email: string): Promise<string> {
  return new SignJWT({ kind: 'admin', email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyAdminSession(token: string | undefined): Promise<string | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.kind !== 'admin' || typeof payload.email !== 'string') return null
    return payload.email
  } catch {
    return null
  }
}
