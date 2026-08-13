import * as Sentry from '@sentry/nextjs'
// `@sentry/nextjs`가 재export하지 않아 정의처에서 직접 가져온다. `@sentry/core`는 SDK의 필수
// 의존이라 같은 버전으로 항상 함께 설치된다 — 단독으로 사라질 수 있는 패키지가 아니다.
import { requestDataIntegration } from '@sentry/core'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    // SENTRY_DEBUG=true 로 전송 로그를 켠다 — 대시보드를 열지 않고 수신 여부를 가른다
    debug: process.env.SENTRY_DEBUG === 'true',
    /**
     * 이벤트에 실을 요청 데이터의 범위를 명시한다.
     *
     * 수집 기본값이 넓다 — 쿠키·요청 본문·IP 헤더가 `sendDefaultPii`와 무관하게 켜져 있다
     * (SDK 소스에 `TODO(v11)`로 남아 있다). 진단에 필요한 것만 남기고 나머지는 담지 않는다.
     * `cookies: false`면 SDK가 파싱 사본(`request.cookies`)과 원본 `cookie` 헤더를 함께
     * 지운다. `data: false`는 요청 본문(상품 이미지 base64 자리), `ip: false`는
     * `x-forwarded-for` 계열이다.
     *
     * 기본값 추론에 기대지 않고 셋 다 적는다 — 관측된 이벤트가 추론과 어긋났다.
     *
     * 전송 직전 훅이 아니라 수집 단계에서 정하는 이유: `beforeSend`는 오류 이벤트에만 걸리고,
     * `tracesSampleRate`로 전송되는 트랜잭션 이벤트도 같은 요청 데이터를 싣는다.
     *
     * 판정 근거·측정 기록: `.private/PROGRESS.md` 2026-08-13
     */
    integrations: [
      requestDataIntegration({ include: { cookies: false, data: false, ip: false } }),
    ],
    /**
     * 2차 방어 — 위 설정이 SDK 개편으로 무력화돼도 전송 직전에 한 번 더 걸린다.
     * 쿠키는 필드째 지우고, 자격증명 헤더(BYOK 키 포함)는 이름으로 가린다.
     */
    beforeSend(event) {
      const req = event.request
      if (req) {
        delete req.cookies
        const headers = req.headers
        if (headers) {
          for (const key of Object.keys(headers)) {
            if (/^(x-gemini-key|authorization|cookie|set-cookie)$/i.test(key)) headers[key] = '[제거됨]'
          }
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
