import * as Sentry from '@sentry/nextjs'

/** 라우터 이동을 계측한다 — 빌드가 이 export를 요구한다(없으면 ACTION REQUIRED 경고) */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1, // 10% 샘플링 (무료 티어 아껴쓰기)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  })
}
