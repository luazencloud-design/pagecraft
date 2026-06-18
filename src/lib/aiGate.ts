import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyTrialSession, TRIAL_SESSION_COOKIE } from './session'
import { consumeTrialCredits, refundTrialCredits, type CreditType } from './trial'

/**
 * AI 요청 인가 — 두 경로:
 *  1) BYOK: 헤더 x-gemini-key 있으면 그 키로, 크레딧 차감 없음 (무제한)
 *  2) 무료 체험: 헤더 키 없으면 로그인 세션 확인 → 서버 키 + 체험 크레딧 차감
 *  3) 둘 다 아니면 401
 *
 * 크레딧은 이 함수에서 차감됨 → 라우트 처리 실패 시 refundIfTrial()로 환불.
 */
export type AiAuth =
  | { mode: 'byok'; key: string }
  | { mode: 'trial'; key: string; subject: string; creditType: CreditType; multiplier: number }

export async function authorizeAi(
  req: Request,
  creditType: CreditType,
  multiplier = 1,
): Promise<{ auth: AiAuth } | { error: NextResponse }> {
  // 1) BYOK — 본인 키
  const headerKey = req.headers.get('x-gemini-key')?.trim()
  if (headerKey) return { auth: { mode: 'byok', key: headerKey } }

  // 2) 무료 체험 — 초대 링크로 로그인된 세션 + 크레딧
  const store = await cookies()
  const session = await verifyTrialSession(store.get(TRIAL_SESSION_COOKIE)?.value)
  if (!session) {
    return {
      error: NextResponse.json(
        { error: '초대 링크로 로그인하거나 본인 Gemini API 키를 입력해주세요.' },
        { status: 401 },
      ),
    }
  }
  const serverKey = process.env.GEMINI_API_KEY
  if (!serverKey) {
    return {
      error: NextResponse.json(
        { error: '무료 체험 서버 키가 설정되지 않았습니다. 본인 API 키를 사용해주세요.' },
        { status: 500 },
      ),
    }
  }
  const r = await consumeTrialCredits(session.sub, creditType, multiplier)
  if (!r.allowed) {
    const msg =
      r.reason === 'expired'
        ? '무료 체험 기간이 끝났어요. 본인 Gemini API 키를 입력하면 계속 사용할 수 있어요.'
        : `크레딧이 부족합니다 (필요 ${r.cost}개). 본인 API 키를 입력하면 무제한으로 사용할 수 있어요.`
    return { error: NextResponse.json({ error: msg }, { status: 402 }) }
  }
  return { auth: { mode: 'trial', key: serverKey, subject: session.sub, creditType, multiplier } }
}

/** 처리 실패 시 환불 (trial 모드만, byok는 무차감이라 무시) */
export async function refundIfTrial(auth: AiAuth, multiplierOverride?: number): Promise<void> {
  if (auth.mode !== 'trial') return
  await refundTrialCredits(auth.subject, auth.creditType, multiplierOverride ?? auth.multiplier)
}
