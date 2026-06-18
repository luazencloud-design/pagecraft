import { SignJWT, jwtVerify } from 'jose'

/**
 * 매직링크 토큰 + 로그인 세션 — jose JWT (DB 불필요)
 *
 * - 매직링크 토큰: 이메일 + 15분 만료, 클릭 1회용(서명으로 위조 방지)
 * - 세션: 이메일 + 30일, httpOnly 쿠키
 *
 * AUTH_SECRET 환경변수로 서명. 없으면 에러.
 */
function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 16) {
    throw new Error('AUTH_SECRET 환경변수가 필요합니다 (16자 이상).')
  }
  return new TextEncoder().encode(s)
}

export const SESSION_COOKIE = 'pc_session'

/** 매직링크용 단기 토큰 (15분) */
export async function signMagicToken(email: string): Promise<string> {
  return new SignJWT({ email, kind: 'magic' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getSecret())
}

/** 매직링크 토큰 검증 → 이메일 반환 (실패 시 null) */
export async function verifyMagicToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.kind !== 'magic' || typeof payload.email !== 'string') return null
    return payload.email
  } catch {
    return null
  }
}

/** 로그인 세션 토큰 (30일) */
export async function signSession(email: string): Promise<string> {
  return new SignJWT({ email, kind: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

/** 세션 토큰 검증 → 이메일 (실패 시 null) */
export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (payload.kind !== 'session' || typeof payload.email !== 'string') return null
    return payload.email
  } catch {
    return null
  }
}
