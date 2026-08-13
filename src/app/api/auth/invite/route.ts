import { NextResponse } from 'next/server'
import { verifyInviteToken, signOAuthState } from '@/lib/session'
import { getInvite, inviteUsableReason, logBlock } from '@/lib/invites'
import { buildGoogleAuthUrl } from '@/lib/googleOAuth'

/**
 * 초대 링크 클릭 → 토큰 검증(존재+버전+유효기간) → 구글 로그인으로.
 * 실패 시 사유별로 /invite-error 안내 페이지로 보냄:
 *   invalid    = 토큰 손상/위조
 *   gone       = 삭제됨 또는 재생성(옛 링크) → 존재하지 않음
 *   expired    = 기간 만료
 *   not_started= 시작일 전
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') || ''
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin
  // 이 함수가 링크 진입 실패의 단일 관문이다 — 여기서 기록해야 "링크를 눌렀는데 못 들어온 사람"이
  // 남는다. 이 단계는 로그인 전이라 누구인지는 알 수 없고, 어떤 초대가 왜 막혔는지만 남는다.
  const fail = async (reason: string, invite?: string) => {
    await logBlock({ stage: 'entry', reason, ...(invite ? { invite } : {}) })
    return NextResponse.redirect(`${origin}/invite-error?reason=${reason}`)
  }

  const decoded = await verifyInviteToken(token)
  if (!decoded) return fail('invalid')

  const inv = await getInvite(decoded.id)
  // 삭제됨 또는 재생성으로 버전 불일치 → "존재하지 않음"으로 안내
  if (!inv || inv.version !== decoded.v) return fail('gone', inv?.name ?? decoded.id)

  const reason = inviteUsableReason(inv)
  if (reason === 'expired') return fail('expired', inv.name)
  if (reason === 'not_started') return fail('not_started', inv.name)

  try {
    const state = await signOAuthState('invite', inv.id)
    return NextResponse.redirect(buildGoogleAuthUrl(origin, state))
  } catch (err) {
    console.error('초대 OAuth 시작 오류:', err)
    return fail('error', inv.name)
  }
}
