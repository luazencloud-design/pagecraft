import * as Sentry from '@sentry/nextjs'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    // SENTRY_DEBUG=true 로 전송 로그를 켠다 — 대시보드를 열지 않고 수신 여부를 가른다
    debug: process.env.SENTRY_DEBUG === 'true',
  })
} else {
  // 조용히 건너뛰면 "왜 서버 에러가 하나도 안 잡히나"를 추적할 단서가 없다.
  // 이 줄이 로그에 보이면 원인은 코드가 아니라 env 주입이다.
  console.warn('[sentry] SENTRY_DSN 미설정 — 서버 오류 보고가 비활성 상태입니다')
}
