import * as Sentry from '@sentry/nextjs'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    // SENTRY_DEBUG=true 로 전송 로그를 켠다 — 대시보드를 열지 않고 수신 여부를 가른다
    debug: process.env.SENTRY_DEBUG === 'true',
    /**
     * 자격증명 헤더 안전장치.
     *
     * BYOK 키가 `x-gemini-key` 헤더로 들어온다. **현재 이 SDK는 요청 헤더를 이벤트에 싣지 않아
     * 지금은 아무것도 지우지 않는다** — 스크럽에 걸리지 않는 이름의 카나리 헤더를 보내 확인했고,
     * 이벤트에 나타나지 않았다 [실측 2026-08-11].
     *
     * 그럼에도 남겨 두는 이유: `sendDefaultPii: true`처럼 헤더 수집을 켜는 설정 변경은 한 줄이고,
     * 그 순간 사용자 키가 조용히 제3자로 나가기 시작한다. 되돌릴 수 없는 종류의 사고라 미리 막는다.
     */
    beforeSend(event) {
      const headers = event.request?.headers
      if (headers) {
        for (const key of Object.keys(headers)) {
          if (/^(x-gemini-key|authorization|cookie)$/i.test(key)) headers[key] = '[제거됨]'
        }
      }
      return event
    },
  })
} else {
  // 조용히 건너뛰면 "왜 서버 에러가 하나도 안 잡히나"를 추적할 단서가 없다.
  // 이 줄이 로그에 보이면 원인은 코드가 아니라 env 주입이다.
  console.warn('[sentry] SENTRY_DSN 미설정 — 서버 오류 보고가 비활성 상태입니다')
}
