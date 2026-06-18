import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyTrialSession, TRIAL_SESSION_COOKIE } from '@/lib/session'
import { getTrialStatus } from '@/lib/trial'

/** 현재 체험 로그인 상태 + 크레딧 조회 */
export async function GET() {
  const store = await cookies()
  const session = await verifyTrialSession(store.get(TRIAL_SESSION_COOKIE)?.value)
  if (!session) {
    return NextResponse.json({ loggedIn: false })
  }
  const trial = await getTrialStatus(session.sub)
  return NextResponse.json({ loggedIn: true, name: session.name, trial })
}
