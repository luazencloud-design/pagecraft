import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  devIndicators: {
    position: 'bottom-right',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
}

/**
 * Sentry 빌드 래퍼 — 소스맵을 올려야 클라이언트 스택이 읽힌다. 지금까지 래퍼가 없어
 * 브라우저 오류가 난독화된 상태로만 남았다.
 *
 * `SENTRY_AUTH_TOKEN`이 없으면 업로드만 건너뛰고 빌드는 통과한다(경고 1줄).
 * 토큰을 Vercel env에 넣으면 그때부터 소스맵이 실제로 올라간다.
 */
export default withSentryConfig(nextConfig, {
  silent: true,
  // 소스맵을 배포 산출물에서 지워 브라우저에 원본이 노출되지 않게 한다
  sourcemaps: { deleteSourcemapsAfterUpload: true },
})
