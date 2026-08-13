import * as Sentry from '@sentry/nextjs'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    /**
     * 서버 설정과 달리 수집 단계를 끄지 않는다 — edge 런타임을 맡는 `@sentry/vercel-edge`에는
     * `requestDataIntegration` 자체가 없어(설치본 확인, 2026-08-13) 명시할 대상이 없고,
     * Node용 통합을 끌어오면 edge 번들이 깨진다.
     *
     * 이 파일은 `middleware.ts`나 `runtime = 'edge'` 라우트가 없는 현재 로드되지 않는다. 그럼에도
     * 스크러버를 두는 이유는, 그런 라우트가 추가되는 순간 이 설정이 조용히 유효해지기 때문이다 —
     * 그때 서버 쪽과 같은 보호가 이미 서 있어야 한다. 판단 근거는 서버 설정 주석 참조.
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
}
