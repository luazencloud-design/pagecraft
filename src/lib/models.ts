/**
 * 텍스트 모델 후보 — 두 서비스가 같은 순서로 답하도록 한 자리에 둔다.
 *
 * 이 모듈은 **아무것도 import하지 않는다**. `ai.service`·`translate.service` 양쪽에서 안전하게
 * 끌어 쓰기 위한 조건이다 — 그 두 파일은 서로를 참조하지 않으려고 로직을 복제해 온 관례가 있고,
 * 기본값이 복제된 채로 한쪽만 갱신되면 두 경로가 서로 다른 모델로 답하게 된다.
 *
 * 후보를 목록으로 두는 이유: 사용자가 각자 키를 쓰는 구조라 **키마다 접근 가능한 모델이 다르다**.
 * 같은 이름이 어떤 키로는 200이고 어떤 키로는 404다 [실측 2026-08-13]. 이름 하나를 고정하면
 * 한쪽 집단은 반드시 막힌다.
 *
 * 1순위가 3.5-lite인 근거: 같은 프롬프트에서 상세페이지 4~5배·사은품 2배 빠르고 thinking
 * 토큰을 쓰지 않는다. 필드 누락·규격 미달 없음
 * [실측: `.private/measure/model-migration/out/02-text.json`, `12-gift-branch.json`].
 *
 * 두 자리 모두 env로 덮을 수 있다 — 순서를 바꾸는 데 배포가 필요 없게.
 */
const DEFAULT_TEXT_MODEL = 'gemini-3.5-flash-lite'
const DEFAULT_TEXT_MODEL_FALLBACK = 'gemini-2.5-flash'

/** 후보가 하나로 접혔다는 경고는 콜드스타트당 한 번만 — 요청마다 찍으면 로그가 묻힌다. */
let warnedSingleCandidate = false

export function textModels(): string[] {
  const models = [
    ...new Set([
      process.env.GEMINI_TEXT_MODEL || DEFAULT_TEXT_MODEL,
      process.env.GEMINI_TEXT_MODEL_FALLBACK || DEFAULT_TEXT_MODEL_FALLBACK,
    ]),
  ]
  // env를 한쪽만 지정하면서 다른 쪽 기본값과 같은 값을 고르면 폴백이 조용히 사라진다.
  // 장애 대응 중 모델을 핀으로 박을 때 실제로 일어나는 조합이라 로그로 드러낸다.
  if (models.length < 2 && !warnedSingleCandidate) {
    warnedSingleCandidate = true
    console.warn(`[gemini] 텍스트 모델 후보가 ${models[0]} 하나뿐 — 404 폴백이 비활성입니다`)
  }
  return models
}
