/**
 * 오류 분류 — 화면 문구·API 응답·Sentry 태그가 같은 코드를 공유한다.
 *
 * 왜 필요한가: 실패가 전부 `catch` 안에서 친절한 문장으로 바뀌어 반환되므로, 사용자가 보내온
 * 화면 캡처와 서버에서 실제로 일어난 일을 잇는 고리가 없었다. Vercel Hobby 로그는 금방 사라져
 * 사후 추적도 어렵다. 코드를 세 곳에 동시에 실으면 캡처 한 장으로 원인이 좁혀진다.
 *
 * 왜 분류기인가: throw 지점이 25곳이고 전부 문자열 메시지다. 그 전부를 타입 있는 에러로
 * 바꾸는 대신, 메시지를 읽어 코드로 접는 함수 하나를 둔다 — 호출부 변경이 최소가 된다.
 *
 * 순서가 의미를 갖는다: 위에서부터 처음 걸리는 것 하나만 반환된다. 좁은 조건이 위에 온다.
 */

/** 실패의 성격 — 재시도가 의미 있는지, 누가 손을 써야 하는지 */
export type ErrorActor =
  | 'user'      // 사용자가 조치 가능 (키 교체·입력 변경)
  | 'operator'  // 운영자만 조치 가능 (모델·서버 설정)
  | 'system'    // 양쪽 다 못 고침 (일시 장애·상류 응답 이상)

export interface ErrorInfo {
  code: string
  /** 사용자에게 보일 문장 */
  message: string
  /** 같은 요청을 다시 보내 해결될 여지가 있는가 */
  retryable: boolean
  actor: ErrorActor
}

/** BYOK면 키 문제의 책임이 사용자에게, 체험이면 운영자에게 있다 */
export type AuthMode = 'byok' | 'trial' | 'unknown'

const KEY_HINT: Record<AuthMode, string> = {
  byok: '입력한 Gemini API 키를 확인해주세요. 키가 잘못되었거나 만료되었을 수 있습니다.',
  trial: '서비스 설정에 문제가 있습니다. 관리자에게 문의해주세요.',
  unknown: '입력한 API 키를 확인하거나, 문제가 계속되면 관리자에게 문의해주세요.',
}

const QUOTA_HINT: Record<AuthMode, string> = {
  byok: '본인 API 키의 사용 한도를 초과했습니다. 한도가 초기화된 뒤 다시 시도해주세요.',
  trial: '요청이 몰리고 있습니다. 1분 후 다시 시도해주세요.',
  unknown: '사용 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
}

/**
 * 에러를 코드로 접는다. `mode`를 주면 키·한도 계열 문구가 책임 주체에 맞게 갈린다.
 */
export function classifyError(err: unknown, mode: AuthMode = 'unknown'): ErrorInfo {
  const raw = err instanceof Error ? err.message : String(err || '')
  const lower = raw.toLowerCase()

  // 네트워크·타임아웃 — 서버↔Gemini 구간
  if (/network|timeout|fetch failed|econnreset|aborted/.test(lower)) {
    return { code: 'E_NETWORK', retryable: true, actor: 'system', message: '네트워크 연결이 불안정합니다. 잠시 후 다시 시도해주세요.' }
  }

  // 모델 부재·지원 종료(404) / 모델명 형식 오류(400). 영구 장애라 재시도가 무의미하다.
  // 아래 파싱 분기보다 앞이어야 한다 — 모델명 형식 오류 문구에 "unexpected"가 들어간다.
  if (/not_found/.test(lower) || /no longer available|is not found for api version|unexpected model name format/.test(lower)) {
    return { code: 'E_MODEL_GONE', retryable: false, actor: 'operator', message: '현재 AI 모델을 사용할 수 없습니다. 재시도로는 해결되지 않으니 관리자에게 문의해주세요.' }
  }

  // 안전 필터 차단 — 입력을 바꿔야 풀린다. withRetry도 이 계열은 재시도하지 않는다.
  if (/safety|prohibited|recitation|blocklist|image_safety/.test(lower)) {
    return { code: 'E_SAFETY', retryable: false, actor: 'user', message: 'AI 안전 정책에 걸려 생성이 중단되었습니다. 다른 사진이나 상품명으로 시도해주세요.' }
  }

  // 키 없음 — BYOK 진입 전
  if (/api 키가 없습니다|키를 입력해주세요/.test(raw)) {
    return { code: 'E_NO_KEY', retryable: false, actor: 'user', message: 'Gemini API 키가 필요합니다. 설정에서 키를 입력해주세요.' }
  }

  // 키 무효·권한 거부. 상류 원문 패턴 + 기존 friendlyErrorMessage가 잡던 범위를 함께 유지한다.
  if (
    /api key not valid|api_key_invalid|permission_denied|unauthenticated/.test(lower) ||
    /api.?key|credential|forbidden/.test(lower) ||
    /\b403\b/.test(lower)
  ) {
    return { code: 'E_KEY_INVALID', retryable: false, actor: mode === 'byok' ? 'user' : 'operator', message: KEY_HINT[mode] }
  }

  // 쿼터·RPM 초과
  if (/resource_exhausted|quota|rate.?limit|too many requests/.test(lower) || /\b429\b/.test(lower)) {
    return { code: 'E_QUOTA', retryable: true, actor: mode === 'byok' ? 'user' : 'system', message: QUOTA_HINT[mode] }
  }

  // 과부하 — 재시도 3회를 이미 소진한 뒤 도달한다
  if (/503|unavailable|high demand|overloaded/.test(lower)) {
    return { code: 'E_OVERLOADED', retryable: true, actor: 'system', message: 'AI 서버가 일시적으로 바쁩니다. 30초 후 다시 시도해주세요.' }
  }

  // 크레딧 — 게이트가 이미 친화적 문구로 만들어 둔 것
  if (/크레딧이 부족|credit/.test(raw)) {
    return { code: 'E_CREDIT', retryable: false, actor: 'user', message: raw }
  }

  // 로그인 필요
  if (/unauthorized|401/.test(lower) || /로그인/.test(raw)) {
    return { code: 'E_AUTH', retryable: false, actor: 'user', message: '로그인이 필요합니다. 다시 로그인해주세요.' }
  }

  // 페이로드 초과 (Vercel 바디 상한)
  if (/413|too large|payload/.test(lower)) {
    return { code: 'E_PAYLOAD', retryable: false, actor: 'user', message: '이미지 크기가 너무 큽니다. 이미지 수를 줄이거나 다른 이미지로 시도해주세요.' }
  }

  // 200인데 본문 텍스트가 없다 — MAX_TOKENS로 잘렸을 때의 대표 증상.
  // 재시도해도 같은 자리에서 잘리므로 재시도를 권하지 않는다.
  if (/텍스트를 찾을 수 없습니다|어떤 언어도 추출하지 못했습니다|설명 생성에 실패/.test(raw)) {
    return { code: 'E_NO_TEXT', retryable: false, actor: 'system', message: '생성 결과가 비어 있습니다. 입력 정보를 줄이거나 이미지 수를 줄여 다시 시도해주세요.' }
  }

  // 이미지가 응답에 없다
  if (/이미지 실패|각도 컷 실패|배경 제거 실패|세트 생성 전체 실패|응답 형식을 인식하지 못했습니다|응답을 받지 못했습니다/.test(raw)) {
    return { code: 'E_NO_IMAGE', retryable: true, actor: 'system', message: '이미지를 생성하지 못했습니다. 다른 사진으로 다시 시도해주세요.' }
  }

  // JSON 파싱 실패
  if (/json|parse/.test(lower)) {
    return { code: 'E_PARSE', retryable: true, actor: 'system', message: 'AI 응답을 처리하는 중 문제가 생겼습니다. 다시 시도해주세요.' }
  }

  // 상류 일반 오류
  if (/gemini|google|genai|replicate|recraft/.test(lower)) {
    return { code: 'E_UPSTREAM', retryable: true, actor: 'system', message: 'AI 처리 중 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' }
  }

  return { code: 'E_UNKNOWN', retryable: true, actor: 'system', message: '일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' }
}

/** 화면 문구 끝에 코드를 괄호로 붙인다 — 사용자가 캡처만 보내도 원인이 좁혀진다 */
export function messageWithCode(info: ErrorInfo): string {
  return `${info.message} (${info.code})`
}
