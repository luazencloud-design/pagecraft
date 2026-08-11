/**
 * 오류 보고 — 실패를 오래 남는 채널(Sentry)로 보낸다.
 *
 * 왜 명시 호출인가: `instrumentation.ts`의 `onRequestError`는 **Next.js가 못 잡은 에러**에만
 * 발동한다. AI 라우트는 전부 `catch`해서 500 JSON으로 정상 반환하므로 Next.js 입장에선 에러가
 * 없고, Sentry도 아무것도 못 본다. 실패 기록이 `console.error` → Vercel 로그에만 남는데 Hobby
 * 플랜은 보존이 짧아 사후 추적이 끊긴다. 그래서 catch 지점에서 직접 보낸다.
 *
 * 태그에 분류 코드를 실어, 사용자가 보내온 화면 문구의 코드와 서버 기록이 곧바로 이어지게 한다.
 */

import * as Sentry from '@sentry/nextjs'
import { after } from 'next/server'
import { classifyError, type AuthMode, type ErrorInfo } from './errorCode'

/**
 * 이벤트 전송을 응답 뒤로 미뤄 끝까지 보낸다.
 *
 * 서버리스에서는 응답을 반환한 순간 함수가 얼어붙을 수 있다. `captureException`은 큐에 넣고
 * 바로 반환하므로, 그대로 두면 전송이 끝나기 전에 실행이 멈춰 이벤트가 사라진다 — 프리뷰에서
 * 실제로 그랬다(로컬은 프로세스가 살아 있어 전송이 완료됐다) [실측 2026-08-11].
 *
 * `after`는 응답을 지연시키지 않으면서 함수를 살려 둔다. 요청 수명주기 밖에서 호출되면
 * 던지므로, 그때는 전송만 시도하고 넘어간다.
 */
function flushAfterResponse(): void {
  try {
    after(async () => {
      await Sentry.flush(2000)
    })
  } catch {
    void Sentry.flush(2000)
  }
}

export interface ReportContext {
  /** 짧은 라우트 식별자 — Sentry에서 이걸로 묶어 본다 (예: 'ai/copy') */
  route: string
  mode?: AuthMode
  /** 라우트가 아는 부가 정보 (플랫폼·요청 매수 등) */
  extra?: Record<string, unknown>
}

/**
 * 에러를 분류해 Sentry로 보내고, 응답에 쓸 정보를 돌려준다.
 * 호출부는 반환값의 `message`·`code`를 그대로 응답 본문에 실으면 된다.
 */
export function reportError(err: unknown, ctx: ReportContext): ErrorInfo {
  const info = classifyError(err, ctx.mode ?? 'unknown')

  // 초기화가 안 된 채로 캡처하면 조용히 버려진다. 그 상태를 로그로 드러낸다 —
  // "Sentry에 아무것도 안 남는다"는 증상의 원인이 코드인지 설정인지 즉시 갈린다.
  if (!Sentry.getClient()) {
    // DSN 유무를 함께 남긴다. 초기화 실패의 원인이 "설정 부재"인지 "계측 파일 미로딩"인지
    // 이 한 줄로 갈린다 — 콜드스타트 로그는 서버리스에서 안 잡힐 수 있어 요청 시점에 찍는다.
    const reg = (globalThis as { __sentryRegister?: string }).__sentryRegister ?? '미실행'
    console.warn(
      `[sentry] 클라이언트 미초기화 — ${ctx.route} 오류가 Sentry에 남지 않는다 ` +
        `(DSN ${process.env.SENTRY_DSN ? '있음' : '없음'} / register ${reg})`,
    )
  }

  Sentry.captureException(err, {
    tags: {
      error_code: info.code,
      route: ctx.route,
      auth_mode: ctx.mode ?? 'unknown',
      actor: info.actor,
      retryable: String(info.retryable),
    },
    extra: {
      ...ctx.extra,
      // 어느 모델로 돌다 실패했는지 — 미설정이면 코드 폴백이 쓰인다는 사실 자체가 단서다
      textModel: process.env.GEMINI_TEXT_MODEL ?? '(하드코딩 폴백)',
      imageModel: process.env.GEMINI_IMAGE_MODEL ?? '(하드코딩 폴백)',
      // 원문 메시지는 넣지 않는다 — 예외 본문에 이미 전문이 실리고, 키 관련 문구가 섞이면
      // Sentry 서버 스크러버가 "[Filtered]"로 지워 버려 중복이자 무용이다 [실측 2026-08-11].
    },
  })

  // Vercel 로그에도 코드를 남긴다 — 실시간 관찰에는 이쪽이 빠르다
  console.error(`[${ctx.route}] ${info.code}`, err)
  flushAfterResponse()
  return info
}

/**
 * 인가 게이트의 거부를 기록한다. 게이트는 예외를 던지지 않고 응답만 반환해 왔기 때문에
 * 지금까지 어떤 흔적도 남지 않았다(4XX 건수만 보였다).
 *
 * 쿼터 보호: 로그인 안 한 접근(401)은 정상 트래픽이라 Sentry로 올리지 않는다.
 * 운영자가 손대야 하는 것(Redis 장애·서버 키 부재)만 이벤트로 남긴다.
 */
export function reportGateRejection(reason: string, status: number, detail?: Record<string, unknown>): void {
  console.warn(`[gate] ${status} ${reason}`, detail ?? '')
  if (status >= 500) {
    Sentry.captureMessage(`gate: ${reason}`, {
      level: 'error',
      tags: { gate_reason: reason, gate_status: String(status) },
      extra: detail,
    })
    flushAfterResponse()
  }
}
