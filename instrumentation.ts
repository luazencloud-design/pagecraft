import * as Sentry from '@sentry/nextjs'

export async function register() {
  // 실행 흔적을 전역에 남긴다. 콜드스타트 로그는 서버리스에서 안 잡힐 수 있어,
  // 요청 시점에 이 값을 읽어야 "계측이 아예 안 돌았다"와 "돌았는데 초기화가 안 붙었다"가 갈린다.
  const g = globalThis as { __sentryRegister?: string }
  g.__sentryRegister = `runtime=${process.env.NEXT_RUNTIME ?? '?'}`
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
    g.__sentryRegister += ' server-config-imported'
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
    g.__sentryRegister += ' edge-config-imported'
  }
}

/**
 * 서버에서 던져진(unhandled) 에러를 Sentry로 넘긴다.
 *
 * 직접 대입이어야 한다 — 앞서 동적 import로 감싼 래퍼를 쓰고 있었는데, 프리뷰에서 서버 에러가
 * 하나도 잡히지 않았다(클라이언트는 정상 수신). await가 요청의 async 컨텍스트를 끊어 캡처가
 * 붙을 자리를 잃는 것으로 보인다. 공식 문서도 래퍼 없는 대입만 제시한다.
 */
export const onRequestError = Sentry.captureRequestError
