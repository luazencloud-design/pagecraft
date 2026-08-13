import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyTrialSession, TRIAL_SESSION_COOKIE } from './session'
import { getInvite, inviteUsableReason, logBlock, maskEmail } from './invites'
import { consumeTrialCredits, refundTrialCredits, type CreditType } from './trial'
import { DEV_BYPASS } from './devBypass'
import { reportGateRejection } from './errorReport'

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
  | { mode: 'trial'; key: string; invite: string; subject: string; creditType: CreditType; multiplier: number }

export async function authorizeAi(
  req: Request,
  creditType: CreditType,
  multiplier = 1,
): Promise<{ auth: AiAuth } | { error: NextResponse }> {
  // 0) dev 전용 우회 — 로그인/키 없이 직원(무제한) 모드로 통과. 운영 빌드에선 항상 비활성.
  if (DEV_BYPASS) {
    const serverKey = process.env.GEMINI_API_KEY
    if (serverKey) {
      return { auth: { mode: 'trial', key: serverKey, invite: 'dev-bypass', subject: 'dev-bypass', creditType, multiplier } }
    }
    // 서버 키가 없으면 그냥 정상 흐름으로 (키 입력/로그인 유도)
  }

  // 1) BYOK — 본인 키
  const headerKey = req.headers.get('x-gemini-key')?.trim()
  if (headerKey) return { auth: { mode: 'byok', key: headerKey } }

  // 2) 무료 체험 — 초대 링크 + 구글 로그인 세션 + 크레딧
  const store = await cookies()
  const session = await verifyTrialSession(store.get(TRIAL_SESSION_COOKIE)?.value)
  if (!session) {
    reportGateRejection('no_session', 401, { creditType })
    return {
      error: NextResponse.json(
        { error: '초대 링크로 로그인하거나 본인 Gemini API 키를 입력해주세요.' },
        { status: 401 },
      ),
    }
  }
  // 초대가 삭제/만료/시작전이면 즉시 차단 (호출마다 재확인). 레코드는 남아도 inviteUsableReason로 판단
  // 저장소 장애는 예외로 던지지 않는다 — 미처리 예외가 되면 요청 컨텍스트가 통째로 오류 보고에
  // 실린다. 여기서 닫고 기록은 reportGateRejection이 맡는다(503이라 보고 대상에 든다).
  let inv: Awaited<ReturnType<typeof getInvite>> = null
  try {
    inv = session.inv ? await getInvite(session.inv) : null
  } catch {
    reportGateRejection('invite_lookup_failed', 503, { invite: session.inv })
    return {
      error: NextResponse.json(
        { error: '무료 체험이 일시적으로 불가합니다. 잠시 후 다시 시도하거나 본인 Gemini API 키를 입력해주세요.' },
        { status: 503 },
      ),
    }
  }
  if (!inv || inviteUsableReason(inv) !== 'ok') {
    const why = inv ? inviteUsableReason(inv) : 'missing'
    reportGateRejection('invite_unusable', 403, { invite: session.inv, reason: why })
    // 관리자 화면에서 "누가 왜 막혔나"를 보려면 여기 남아야 한다. 4xx라 오류 보고에는 안 간다.
    await logBlock({ stage: 'gate', reason: `invite_${why}`, invite: inv?.name ?? session.inv, subject: maskEmail(session.sub) })
    return {
      error: NextResponse.json(
        { error: '초대가 만료되었거나 삭제되었어요. 본인 Gemini API 키를 입력하면 계속 사용할 수 있어요.' },
        { status: 403 },
      ),
    }
  }
  const serverKey = process.env.GEMINI_API_KEY
  if (!serverKey) {
    reportGateRejection('server_key_missing', 500, { invite: inv.id })
    return {
      error: NextResponse.json(
        { error: '무료 체험 서버 키가 설정되지 않았습니다. 본인 API 키를 사용해주세요.' },
        { status: 500 },
      ),
    }
  }
  // 무제한(직원용) 초대 → 크레딧 차감 없이 통과
  if (inv.unlimited) {
    return { auth: { mode: 'trial', key: serverKey, invite: inv.id, subject: session.sub, creditType, multiplier } }
  }
  // 크레딧은 (초대 링크 × 계정) 단위 — 같은 계정도 링크마다 별도 500
  const r = await consumeTrialCredits(inv.id, session.sub, creditType, multiplier)
  if (!r.allowed) {
    reportGateRejection(`credit_${r.reason}`, r.reason === 'unavailable' ? 503 : 402, { invite: inv.id, creditType, cost: r.cost })
    await logBlock({ stage: 'gate', reason: `credit_${r.reason}`, invite: inv.name, subject: maskEmail(session.sub) })
    if (r.reason === 'unavailable') {
      return {
        error: NextResponse.json(
          { error: '무료 체험이 일시적으로 불가합니다. 잠시 후 다시 시도하거나 본인 Gemini API 키를 입력해주세요.' },
          { status: 503 },
        ),
      }
    }
    const msg =
      r.reason === 'expired'
        ? '무료 체험 기간이 끝났어요. 본인 Gemini API 키를 입력하면 계속 사용할 수 있어요.'
        : `크레딧이 부족합니다 (필요 ${r.cost}개). 본인 API 키를 입력하면 무제한으로 사용할 수 있어요.`
    return { error: NextResponse.json({ error: msg }, { status: 402 }) }
  }
  return { auth: { mode: 'trial', key: serverKey, invite: inv.id, subject: session.sub, creditType, multiplier } }
}

/** 처리 실패 시 환불 (trial 모드만, byok는 무차감이라 무시) */
export async function refundIfTrial(auth: AiAuth, multiplierOverride?: number): Promise<void> {
  if (auth.mode !== 'trial') return
  await refundTrialCredits(auth.invite, auth.subject, auth.creditType, multiplierOverride ?? auth.multiplier)
}
