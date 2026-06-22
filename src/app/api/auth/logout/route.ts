import { NextResponse } from 'next/server'
import { TRIAL_SESSION_COOKIE } from '@/lib/session'

/** 로그아웃 — 체험 세션 쿠키 제거 */
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(TRIAL_SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
