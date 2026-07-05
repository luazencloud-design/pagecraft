/**
 * dev 전용 인증 우회 — 로그인/키 없이 '직원(무제한)' 모드로 통과.
 *
 * 안전장치(이중 잠금):
 *  1) NODE_ENV !== 'production' — 운영 빌드(Vercel 포함)에선 항상 false
 *  2) NEXT_PUBLIC_DEV_BYPASS === 'true' — 명시적으로 켠 경우만
 *
 * → `next dev` 로컬에서만 활성. 운영에 실수로 env를 넣어도 NODE_ENV 때문에 무효.
 *
 * 서버(aiGate)·클라(authStore) 양쪽에서 같은 플래그를 읽음.
 * 변경 시 dev 서버 재시작 필요.
 */
export const DEV_BYPASS =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_BYPASS === 'true'
