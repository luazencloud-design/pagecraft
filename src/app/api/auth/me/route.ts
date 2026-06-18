import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySession, SESSION_COOKIE } from '@/lib/session'
import { getTrialStatus } from '@/lib/trial'

/** 현재 로그인 상태 + 체험 크레딧 조회 */
export async function GET() {
  const store = await cookies()
  const email = await verifySession(store.get(SESSION_COOKIE)?.value)
  if (!email) {
    return NextResponse.json({ loggedIn: false })
  }
  const trial = await getTrialStatus(email)
  return NextResponse.json({ loggedIn: true, email, trial })
}
