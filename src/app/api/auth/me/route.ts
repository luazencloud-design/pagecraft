import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyTrialSession, TRIAL_SESSION_COOKIE } from '@/lib/session'
import { getInvite, inviteUsableReason } from '@/lib/invites'
import { getTrialStatus } from '@/lib/trial'

/** 현재 체험 로그인 상태 + 크레딧 (초대 삭제/만료 시 loggedIn=false) */
export async function GET() {
  const store = await cookies()
  const session = await verifyTrialSession(store.get(TRIAL_SESSION_COOKIE)?.value)
  if (!session) return NextResponse.json({ loggedIn: false })

  // 초대 유효성 재확인 — 삭제/만료/시작전이면 로그아웃 취급 (레코드는 남아도 차단)
  const inv = session.inv ? await getInvite(session.inv) : null
  if (!inv || inviteUsableReason(inv) !== 'ok') {
    return NextResponse.json({ loggedIn: false, reason: 'invite_revoked' })
  }

  // 무제한(직원용) 초대 → 크레딧 표시 X
  if (inv.unlimited) {
    return NextResponse.json({ loggedIn: true, name: session.name, email: session.sub, unlimited: true })
  }
  const trial = await getTrialStatus(session.inv, session.sub) // (초대 링크 × 계정) 기준
  return NextResponse.json({ loggedIn: true, name: session.name, email: session.sub, trial })
}
