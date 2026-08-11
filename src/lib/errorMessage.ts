/**
 * 서버 에러 메시지를 사용자 친화적인 문구로 변환
 * Gemini/네트워크/인증/크레딧 등 내부 에러를 숨기고 친절한 안내로 교체
 */

export function friendlyErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err || '')
  const lower = msg.toLowerCase()

  // 네트워크 / 타임아웃
  if (/network|timeout|fetch failed|econnreset/.test(lower)) {
    return '네트워크 연결이 불안정합니다. 잠시 후 다시 시도해주세요.'
  }

  // 모델 부재·지원 종료(404 NOT_FOUND) / 모델명 형식 오류(400 INVALID_ARGUMENT)
  // 아래 Gemini 캐치올보다 먼저 본다 — 영구 장애가 "일시적 문제"로 안내되면 사용자가 무한 재시도한다.
  // "unexpected" 파싱 분기보다도 앞이어야 한다(모델명 형식 오류 문구에 그 단어가 들어간다).
  if (
    /not_found/.test(lower) ||
    /no longer available|is not found for api version|unexpected model name format/.test(lower)
  ) {
    return '현재 AI 모델을 사용할 수 없습니다. 재시도로는 해결되지 않으니 관리자에게 문의해주세요.'
  }

  // Gemini API 과부하 / 일시 오류
  if (/503|unavailable|high demand|overloaded/.test(lower)) {
    return 'AI 서버가 일시적으로 바쁩니다. 30초 후 다시 시도해주세요.'
  }

  // 쿼터 초과
  if (/quota|rate.?limit|too many requests/.test(lower)) {
    return '요청이 몰리고 있습니다. 1분 후 다시 시도해주세요.'
  }

  // 429 - 크레딧 부족
  if (/크레딧이 부족|credit/.test(msg)) {
    return msg // 이미 친화적 메시지
  }

  // 인증
  if (/unauthorized|401|로그인/.test(lower) || /로그인/.test(msg)) {
    return '로그인이 필요합니다. 다시 로그인해주세요.'
  }

  // 파싱 실패
  if (/json|parse|unexpected/.test(lower)) {
    return 'AI 응답을 처리하는 중 문제가 생겼습니다. 다시 시도해주세요.'
  }

  // payload 초과
  if (/413|too large|payload/.test(lower)) {
    return '이미지 크기가 너무 큽니다. 이미지 수를 줄이거나 다른 이미지로 시도해주세요.'
  }

  // API 키 / 설정 이슈
  if (/api.?key|credential|forbidden|403/.test(lower)) {
    return '서비스 설정에 일시적 문제가 있습니다. 관리자에게 문의해주세요.'
  }

  // Gemini 일반 에러
  if (/gemini|google|genai/.test(lower)) {
    return 'AI 처리 중 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }

  // 기본 fallback — 원본 노출하지 않고 일반 문구
  return '일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
}
