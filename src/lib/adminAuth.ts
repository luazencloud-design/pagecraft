import { cookies } from 'next/headers'
import { verifyAdminSession, ADMIN_COOKIE } from './session'
import { isAdmin } from './trial'

/**
 * 관리자 인가 — 쿠키의 admin 세션 검증 + ADMIN_EMAILS 포함 확인.
 * 통과하면 이메일 반환, 아니면 null.
 */
export async function requireAdmin(): Promise<string | null> {
  const store = await cookies()
  const email = await verifyAdminSession(store.get(ADMIN_COOKIE)?.value)
  if (!email || !isAdmin(email)) return null
  return email
}
