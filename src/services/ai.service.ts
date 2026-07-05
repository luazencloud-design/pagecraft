import type {
  AIGenerateRequest,
  AITitleRequest,
  AITagRequest,
  AIModelImageRequest,
  AIRegenRequest,
  GeneratedContent,
  GeneratedTitle,
  GeneratedAll,
  GeneratedByLang,
  RegenField,
} from '@/types/ai'
import Replicate from 'replicate'
import type { Platform } from '@/types/product'
import { PLATFORM_META } from '@/types/product'
import { currentRequestKey } from '@/lib/apiKeyContext'
import { buildCoupangSystemPrompt, buildCoupangTitlePrompt, buildCoupangTagPrompt } from './prompts/coupang'
import { buildQoo10SystemPrompt } from './prompts/qoo10'
import { buildEbaySystemPrompt } from './prompts/ebay'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Gemini가 가끔 깨진 JSON을 반환함 — 코드블록, trailing comma, 제어문자 등 정리
 */
function safeParseJSON<T>(text: string): T {
  let cleaned = text.trim()
  // ```json ... ``` 코드블록 제거
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '')
  // JSON 시작/끝 추출
  const startIdx = cleaned.search(/[\[{]/)
  const endIdx = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'))
  if (startIdx >= 0 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1)
  }
  // trailing comma 제거
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')

  try {
    return JSON.parse(cleaned) as T
  } catch {
    // 문자열 내부의 이스케이프 안 된 줄바꿈/탭을 이스케이프 처리
    cleaned = cleaned.replace(/"([^"]*?)"/g, (match, inner: string) => {
      const escaped = inner
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
      return `"${escaped}"`
    })
    // trailing comma 다시 제거
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')

    try {
      return JSON.parse(cleaned) as T
    } catch (e) {
      console.error('JSON 파싱 최종 실패. 원본:', text.substring(0, 500))
      throw new Error(`JSON 파싱 실패: ${(e as Error).message}`)
    }
  }
}

/**
 * Gemini API fetch with auto-retry — 503 (overload) / 429 (rate limit) 대응
 * 최대 3회 재시도. 429는 Retry-After 헤더 존중 (없으면 5s/10s/15s).
 */
async function geminiRequest(url: string, body: object): Promise<Response> {
  // 보안: API 키를 URL 쿼리(?key=)에서 헤더(x-goog-api-key)로 이동.
  // 키가 fetch URL/네트워크 로그/에러에 노출되는 경로를 원천 차단.
  const u = new URL(url)
  const apiKey = u.searchParams.get('key') || ''
  u.searchParams.delete('key')
  const cleanUrl = u.toString()

  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    })
    if (attempt === MAX_RETRIES) return res

    if (res.status === 503) {
      await new Promise((r) => setTimeout(r, attempt * 2000))
      continue
    }
    if (res.status === 429) {
      // Retry-After 헤더 존중 (초 단위). 없으면 attempt * 5초.
      const retryAfter = res.headers.get('Retry-After')
      const waitMs = retryAfter
        ? Math.min(30_000, Number(retryAfter) * 1000)
        : attempt * 5000
      console.warn(`[gemini] 429 rate limited, ${waitMs}ms 후 재시도 (${attempt}/${MAX_RETRIES})`)
      await new Promise((r) => setTimeout(r, waitMs))
      continue
    }
    return res
  }
  throw new Error('Gemini API 재시도 실패')
}

/**
 * BYOK — 요청 컨텍스트의 사용자 키 우선. 없으면 서버 env(셀프호스트/데모용) 폴백.
 * 둘 다 없으면 에러.
 */
function getApiKey(): string {
  const key = currentRequestKey() || process.env.GEMINI_API_KEY
  if (!key) throw new Error('Gemini API 키가 없습니다. 설정에서 API 키를 입력해주세요.')
  return key
}

function getTextModel(): string {
  return process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash'
}

function getImageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
}

/**
 * 플랫폼별 시스템 프롬프트 디스패처
 * - 한국 마켓 (coupang/smartstore/multi-kr/other) → 쿠팡 SEO 톤 (KO만)
 * - 일본 마켓 (qoo10-jp) → 큐텐 감성/무드 톤 (JA + KO 동시)
 * - 미국 마켓 (ebay-us) → eBay 텍스트 위주 SEO + Item Specifics (EN + KO 동시)
 */
function buildSystemPrompt(req: AIGenerateRequest, coupangSuggestions: string[] = []): string {
  const platform = req.platform as Platform
  const meta = PLATFORM_META[platform]
  if (meta?.market === 'jp') return buildQoo10SystemPrompt(req)
  if (meta?.market === 'us') return buildEbaySystemPrompt(req)
  return buildCoupangSystemPrompt(req, coupangSuggestions)
}

const buildTitlePrompt = buildCoupangTitlePrompt
const buildTagPrompt = buildCoupangTagPrompt

/**
 * 통합 생성 — content + titles + tags를 한번의 API 호출로
 *
 * 반환 타입:
 * - 한국 마켓: { ko: GeneratedAll }
 * - 일본 마켓 (큐텐): { ja: GeneratedAll, ko: GeneratedAll } — 1회 호출로 양 언어 동시 생성
 *   클라에서 즉시 토글 가능 (캐시 hit), 추가 API 호출 불필요
 */
export async function generateAll(
  req: AIGenerateRequest,
  coupangSuggestions: string[] = [],
): Promise<GeneratedByLang> {
  const apiKey = getApiKey()
  const systemPrompt = buildSystemPrompt(req, coupangSuggestions)
  const platform = req.platform as Platform
  const market = PLATFORM_META[platform]?.market
  const isJpMarket = market === 'jp'
  const isUsMarket = market === 'us'
  const isBilingual = isJpMarket || isUsMarket

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = []

  for (const img of req.images) {
    const base64 = img.replace(/^data:image\/\w+;base64,/, '')
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: base64 },
    })
  }

  parts.push({
    text: isJpMarket
      ? 'この商品画像を分析し、Qoo10ジャパン用の日本語コピーと쿠팡用の韓国語コピーを両方同時に生成してください。'
      : isUsMarket
        ? 'Analyze this product image and generate eBay listing content in both English and Korean simultaneously.'
        : '이 상품 이미지를 분석하고 상세페이지 콘텐츠, 최적화 상품명 5개, 검색 태그 20개를 한번에 생성해주세요.',
  })

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      // 양 언어 동시 생성하려면 토큰 한도 상향
      maxOutputTokens: isBilingual ? 16384 : 8192,
    },
  }

  const res = await geminiRequest(
    `${GEMINI_BASE}/${getTextModel()}:generateContent?key=${apiKey}`,
    body,
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API 오류: ${res.status} ${err}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini 응답에서 텍스트를 찾을 수 없습니다.')

  if (isBilingual) {
    // 큐텐(ja+ko) / eBay(en+ko) — 바이링구얼 응답
    const parsed = safeParseJSON<{ ja?: GeneratedAll; ko?: GeneratedAll; en?: GeneratedAll }>(text)
    const result: GeneratedByLang = {}
    if (parsed.ja) result.ja = parsed.ja
    if (parsed.ko) result.ko = parsed.ko
    if (parsed.en) result.en = parsed.en
    if (!result.ja && !result.ko && !result.en) {
      throw new Error(`${isJpMarket ? '큐텐' : 'eBay'} 응답에서 어떤 언어도 추출하지 못했습니다.`)
    }
    return result
  }

  // 한국 마켓 — 단일 GeneratedAll 응답 → ko 키로 래핑
  const single = safeParseJSON<GeneratedAll>(text)
  return { ko: single }
}

export async function generateTitles(
  req: AITitleRequest,
): Promise<GeneratedTitle[]> {
  const apiKey = getApiKey()
  const prompt = buildTitlePrompt(req)

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 2000,
    },
  }

  const res = await geminiRequest(
    `${GEMINI_BASE}/${getTextModel()}:generateContent?key=${apiKey}`,
    body,
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API 오류: ${res.status} ${err}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini 응답에서 텍스트를 찾을 수 없습니다.')

  return safeParseJSON(text) as GeneratedTitle[]
}

export async function generateTags(req: AITagRequest): Promise<string[]> {
  const apiKey = getApiKey()
  const prompt = buildTagPrompt(req)

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 1000,
    },
  }

  const res = await geminiRequest(
    `${GEMINI_BASE}/${getTextModel()}:generateContent?key=${apiKey}`,
    body,
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API 오류: ${res.status} ${err}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini 응답에서 텍스트를 찾을 수 없습니다.')

  return safeParseJSON(text) as string[]
}

/**
 * 카테고리/상품명 기반 카메라 포커스 결정
 *
 * 핵심 원칙: AI가 "전신 풀샷" 으로 가지 않고, 제품이 실제로 보여야 하는 부위만 보이도록
 * 명시적으로 컷/액션을 지정. 불필요한 신체 부위는 프레임에서 제외.
 *
 * 우선순위:
 *   1. CATEGORY_GROUPS 의 정확 카테고리 일치 (사용자가 명시 선택했으므로 가장 신뢰)
 *   2. 상품명 키워드 매칭 (귀걸이/반지 등 매우 구체적인 아이템)
 *   3. 카테고리 키워드 부분 매칭 (legacy / 자유 입력 대응)
 *   4. 디폴트 (전신)
 */
type CameraFocus = {
  /** 카메라가 향하는 부위 — 프롬프트의 "focusing on" 절 */
  part: string
  /** 샷 타입 (클로즈업/미디엄/풀샷 등) */
  shot: string
  /** 프레임에 들어가는 범위 — 어디까지 보일지 명시 */
  crop: string
  /** 모델이 제품과 어떻게 인터랙션 하는지 — wearing / using / applying / carrying 등 */
  action: string
  /** AI에게 추가로 강제할 명령 — "절대 X 보이지 마세요" 류 */
  extraInstruction?: string
  /**
   * 프롬프트 첫 문장으로 박힐 영문 표준 촬영 용어 — Gemini Image가 가장 강하게 따르는 부분
   * 예: "close-up portrait of the head and shoulders only"
   *    "medium shot of the upper body only (head to waist)"
   *    "low-angle shot of the legs and feet only"
   */
  leadFraming: string
}

function getCameraFocus(category: string, productName: string): CameraFocus {
  // ── 1) 정확 카테고리 (CATEGORY_GROUPS) 우선 ──────────────────────────
  // 자주 쓰는 leadFraming 상수 — 일관성 유지
  const F = {
    headShoulders: 'a tight close-up portrait of the head and shoulders only (no body below the shoulders visible)',
    faceOnly: 'an extreme close-up of the face only (cropped at the neck, NO body visible)',
    faceMacro: 'a macro close-up of the face area (cropped tight, NO body visible)',
    upperBody: 'a medium shot showing only the upper body from head to waist (NO legs or lower body visible, cropped at the waist)',
    lowerBody: 'a low-angle medium shot showing only the lower body from waist to feet (cropped at the waist, NO face visible)',
    feet: 'a low-angle close-up of the legs and feet only from knees to feet (NO upper body or face visible)',
    chestUp: 'a medium close-up showing only the chest and head area from lower face to chest (NO lower body)',
    wrist: 'a tight close-up of a wrist and hand only (NO body, NO face visible)',
    finger: 'a macro close-up of fingers and hand only (NO body, NO face visible)',
    ankle: 'a close-up of ankles and feet from calf down (NO upper body visible)',
    hatHead: 'a medium close-up of the head and shoulders, framed tight on the hat being worn (NO body below the shoulders visible)',
    bagShot: 'a medium shot showing the upper body and the bag clearly, cropped at the hip (NO legs visible)',
    waistMid: 'a medium shot of the waist and torso area focused on the belt (NO face, NO legs visible)',
    fullBody: 'a full-body fashion shot from head to feet',
    midToKnee: 'a medium-long shot from head to knees (cropped at knees, lower legs not visible)',
    // 비착용 제품군 (식품/생활/가전 등) — 사람은 보조, 제품이 주인공
    handsProduct: 'a close-up of hands presenting the product on a clean styled surface (cropped at the chest, NO face visible)',
    tableScene: 'a waist-up shot of a model at a bright styled table using the product (product clearly visible in front)',
    kitchenScene: 'a waist-up shot of a model in a bright modern kitchen using the product',
    lifestyleWide: 'a wide lifestyle shot of a styled room with the model full-body and the product in use',
    neckCloseup: 'a medium close-up of the neck and collarbone area wearing the jewelry (chin to chest only, NO lower body)',
    earCloseup: 'a close-up profile shot of the head focused on the ear area (NO body below the shoulders)',
  }

  const byExactCategory: Record<string, CameraFocus> = {
    // 의류·잡화
    '패딩/점퍼': { leadFraming: F.midToKnee, part: '상반신~허벅지', shot: '미디엄', crop: '머리~무릎', action: 'wearing', extraInstruction: '겉옷 핏 강조. 무릎 아래 자르기.' },
    '집업/후리스': { leadFraming: F.upperBody, part: '상반신', shot: '미디엄', crop: '머리~허리', action: 'wearing', extraInstruction: '허리 아래 보이지 않게 잘라야 합니다.' },
    '티셔츠/맨투맨': { leadFraming: F.upperBody, part: '상반신', shot: '미디엄', crop: '머리~허리', action: 'wearing', extraInstruction: '허리 아래 보이지 않게 잘라야 합니다.' },
    '바지/하의': { leadFraming: F.fullBody, part: '하체 중심 전신', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '전신 풀샷이되 하의가 잘 보이게.' },
    '가방/배낭': { leadFraming: F.bagShot, part: '어깨/손/등', shot: '미디엄', crop: '상반신 + 가방', action: 'carrying', extraInstruction: '가방 강조, 다리 아래 X.' },
    '모자/액세서리': { leadFraming: F.hatHead, part: '머리/얼굴 상부', shot: '미디엄 클로즈업', crop: '머리~어깨', action: 'wearing on head', extraInstruction: '얼굴+모자 중심. 어깨 아래 절대 X.' },
    '신발/부츠': { leadFraming: F.fullBody, part: '전신 (발 강조)', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '전신 풀샷이되 신발이 또렷이 보이는 스타일링.' },
    '슬리퍼/샌들': { leadFraming: F.fullBody, part: '전신 (발 강조)', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '전신 풀샷이되 슬리퍼/샌들이 또렷이 보이는 스타일링.' },
    '스카프/머플러': { leadFraming: F.chestUp, part: '목/어깨', shot: '미디엄 클로즈업', crop: '얼굴 하부~가슴', action: 'wearing around neck', extraInstruction: '스카프 두른 모습. 허리 아래 X.' },
    '기타 의류/잡화': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing/using' }, // (구 카테고리명 — 저장된 드래프트 호환)

    // 의류 (확장)
    '셔츠/블라우스': { leadFraming: F.upperBody, part: '상반신', shot: '미디엄', crop: '머리~허리', action: 'wearing', extraInstruction: '허리 아래 보이지 않게. 셔츠 핏/카라 강조.' },
    '니트/스웨터': { leadFraming: F.upperBody, part: '상반신', shot: '미디엄', crop: '머리~허리', action: 'wearing', extraInstruction: '니트 질감이 잘 보이게. 허리 아래 X.' },
    '스커트/원피스': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '전신 풀샷 — 기장과 실루엣이 잘 보이게.' },
    '스포츠웨어/애슬레저': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '가벼운 스트레칭/러닝 포즈. 활동적인 무드.' },
    '속옷/양말': { leadFraming: F.ankle, part: '발목/발', shot: '클로즈업', crop: '종아리~발', action: 'wearing', extraInstruction: '양말은 발목 중심 클로즈업. 이너웨어는 라운지웨어 위에 겹쳐 건전하게.' },
    '기타 의류': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing' },

    // 패션잡화 (확장)
    '여행가방/캐리어': { leadFraming: F.fullBody, part: '전신 + 캐리어', shot: '풀샷', crop: '전신', action: 'pulling', extraInstruction: '캐리어를 끌고 걷는 공항/여행 무드. 제품 전체가 또렷이.' },
    '장갑/벨트': { leadFraming: F.waistMid, part: '허리/손', shot: '미디엄', crop: '허리 또는 손', action: 'wearing', extraInstruction: '벨트는 허리 중심, 장갑은 손 클로즈업.' },
    '선글라스/안경테': { leadFraming: F.headShoulders, part: '얼굴', shot: '미디엄 클로즈업', crop: '머리~어깨', action: 'wearing', extraInstruction: '얼굴+안경 중심. 어깨 아래 X.' },
    '기타 패션잡화': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing/using' },

    // 보석·시계 — 착용 부위 클로즈업
    '목걸이': { leadFraming: F.neckCloseup, part: '목/쇄골', shot: '클로즈업', crop: '턱~가슴', action: 'wearing', extraInstruction: '목걸이가 주인공. 쇄골 라인 강조, 하반신 X.' },
    '귀걸이': { leadFraming: F.earCloseup, part: '귀/옆얼굴', shot: '클로즈업', crop: '머리~어깨', action: 'wearing', extraInstruction: '귀와 귀걸이 중심의 옆모습. 어깨 아래 X.' },
    '반지': { leadFraming: F.finger, part: '손가락', shot: '마크로', crop: '손만', action: 'wearing on finger', extraInstruction: '손가락과 반지 정밀 클로즈업. 얼굴/몸 X.' },
    '팔찌/뱅글': { leadFraming: F.wrist, part: '손목', shot: '클로즈업', crop: '손목만', action: 'wearing on wrist', extraInstruction: '손목과 팔찌 중심. 얼굴/몸 X.' },
    '시계': { leadFraming: F.wrist, part: '손목', shot: '클로즈업', crop: '손목만', action: 'wearing on wrist', extraInstruction: '손목의 시계 정밀 클로즈업. 다이얼이 또렷이.' },
    '패션주얼리/기타': { leadFraming: F.chestUp, part: '얼굴~가슴', shot: '미디엄 클로즈업', crop: '얼굴 하부~가슴', action: 'wearing', extraInstruction: '착용 부위가 잘 보이게.' },

    // 화장품·뷰티 — 얼굴 중심
    '스킨케어 (토너/세럼/크림)': { leadFraming: F.faceOnly, part: '얼굴/볼', shot: '클로즈업', crop: '얼굴만', action: 'with smooth radiant skin', extraInstruction: '매끄러운 피부 강조. 얼굴만, 신체 X.' },
    '클렌징': { leadFraming: F.faceOnly, part: '얼굴', shot: '클로즈업', crop: '얼굴만', action: 'with clean fresh skin', extraInstruction: '깨끗한 맨얼굴 클로즈업.' },
    '마스크팩/패드': { leadFraming: F.faceOnly, part: '얼굴', shot: '클로즈업', crop: '얼굴만', action: 'with the mask sheet on face', extraInstruction: '눈 감고 마스크팩 얹은 얼굴.' },
    '선케어': { leadFraming: F.headShoulders, part: '얼굴/어깨', shot: '미디엄 클로즈업', crop: '얼굴~어깨', action: 'with healthy glowing skin', extraInstruction: '야외 자연광, 윤기 피부.' },
    '메이크업 베이스 (쿠션/파운데이션)': { leadFraming: F.faceOnly, part: '얼굴', shot: '클로즈업', crop: '얼굴만', action: 'with flawless base makeup' },
    '메이크업 색조 (립/아이/치크)': { leadFraming: F.faceMacro, part: '얼굴 (적용 부위)', shot: '클로즈업', crop: '얼굴만', action: 'with the makeup visibly applied', extraInstruction: '적용 부위(입술/눈/볼) 정밀 강조.' },
    '향수/바디': { leadFraming: F.wrist, part: '손목/목', shot: '클로즈업', crop: '손목 또는 목', action: 'spraying or applying', extraInstruction: '향수 분사 모션.' },
    '헤어케어': { leadFraming: F.headShoulders, part: '머리카락', shot: '미디엄 클로즈업', crop: '머리~어깨', action: 'with sleek glossy hair', extraInstruction: '윤기 머릿결 강조.' },
    '기타 뷰티': { leadFraming: F.headShoulders, part: '얼굴', shot: '미디엄 클로즈업', crop: '얼굴만', action: 'using the beauty product' },

    // 유아·아동 — 옷/신발은 전신(아이 핏 강조), 용품·완구는 사용 장면
    '유아복 (0~3세)': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '아기 옷 핏이 잘 보이는 전신. 밝고 사랑스러운 분위기.' },
    '아동복 (4~10세)': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '아동복 핏이 잘 보이는 전신. 밝은 카탈로그 분위기.' },
    '아동 신발/잡화': { leadFraming: F.fullBody, part: '전신 (발 강조)', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '전신 풀샷이되 신발/잡화가 또렷이 보이게.' },
    '유아용품 (침구/식기/위생)': { leadFraming: F.fullBody, part: '전신 + 제품', shot: '풀샷', crop: '전신', action: 'using', extraInstruction: '제품을 사용하는 자연스러운 장면. 제품이 또렷이 보이게.' },
    '장난감/완구': { leadFraming: F.fullBody, part: '전신 + 제품', shot: '풀샷', crop: '전신', action: 'playing with', extraInstruction: '장난감을 갖고 노는 밝은 장면. 제품이 주인공.' },
    '기저귀/물티슈': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '제품 패키지가 주인공. 밝고 청결한 무드.' },
    '기타 유아·아동': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing/using' },

    // 식품 — 얼굴 없이 손/테이블 중심, 제품·음식이 주인공
    '신선식품 (과일/채소/정육/수산)': { leadFraming: F.handsProduct, part: '손 + 식재료', shot: '클로즈업', crop: '손~제품', action: 'presenting fresh', extraInstruction: '신선한 식재료가 주인공. 밝은 자연광, 나무 도마/식탁 스타일링.' },
    '가공식품 (라면/통조림/오일)': { leadFraming: F.tableScene, part: '상반신 + 식탁', shot: '미디엄', crop: '허리 위 + 테이블', action: 'preparing a meal with', extraInstruction: '조리/차림 장면. 제품 패키지가 또렷이 보이게.' },
    '과자/간식': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '제품과 내용물이 함께 보이게. 밝고 맛있어 보이는 스타일링.' },
    '커피/차': { leadFraming: F.tableScene, part: '상반신 + 컵', shot: '미디엄', crop: '허리 위 + 테이블', action: 'enjoying a cup of', extraInstruction: '따뜻한 카페 무드. 김이 오르는 컵과 제품 패키지.' },
    '음료/생수': { leadFraming: F.handsProduct, part: '손 + 병', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '시원한 느낌 — 물방울 맺힌 병/캔. 제품 라벨 또렷이.' },
    '쌀/잡곡': { leadFraming: F.handsProduct, part: '손 + 곡물', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '곡물의 질감이 보이게. 패키지와 내용물 함께.' },
    '소스/양념': { leadFraming: F.kitchenScene, part: '상반신 + 주방', shot: '미디엄', crop: '허리 위', action: 'cooking with', extraInstruction: '요리에 넣는 장면. 제품 병/패키지가 또렷이.' },
    '냉장/냉동식품': { leadFraming: F.tableScene, part: '상반신 + 식탁', shot: '미디엄', crop: '허리 위 + 테이블', action: 'serving', extraInstruction: '조리 완성 접시와 제품 패키지 함께.' },
    '건강기능식품/영양제': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '제품 용기가 주인공. 밝고 신뢰감 있는 클린 무드.' },
    '기타 식품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting' },

    // 주방·생활 — 사용 장면 중심
    '조리용품 (팬/냄비)': { leadFraming: F.kitchenScene, part: '상반신 + 주방', shot: '미디엄', crop: '허리 위', action: 'cooking with', extraInstruction: '조리 중인 장면. 제품(팬/냄비)이 화면 중심.' },
    '식기/컵/테이블웨어': { leadFraming: F.tableScene, part: '손 + 식탁', shot: '미디엄', crop: '허리 위 + 테이블', action: 'setting the table with', extraInstruction: '차려진 식탁 스타일링. 그릇/컵이 주인공.' },
    '주방잡화 (보관용기/조리도구)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '실사용 장면 클로즈업. 제품 기능이 보이게.' },
    '욕실용품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '밝고 청결한 욕실 배경. 제품이 주인공.' },
    '세제/청소용품': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'cleaning with', extraInstruction: '밝은 집안 청소 장면. 제품 패키지 또렷이.' },
    '화장지/위생용품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '제품 패키지가 주인공. 청결한 무드.' },
    '수납/정리': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'organizing with', extraInstruction: '정리된 공간과 제품. 비포/애프터 느낌의 깔끔함.' },
    '기타 생활용품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using' },

    // 가전·디지털
    '주방가전 (블렌더/커피머신/밥솥)': { leadFraming: F.kitchenScene, part: '상반신 + 주방', shot: '미디엄', crop: '허리 위', action: 'using', extraInstruction: '주방 조리대 위 제품 사용 장면. 제품이 화면 중심.' },
    '생활가전 (청소기/공기청정기)': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'using', extraInstruction: '거실에서 사용하는 장면. 제품 전체 형태가 또렷이.' },
    '계절가전 (선풍기/히터/제습기)': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'relaxing near', extraInstruction: '계절감 있는 실내. 제품이 화면 중심.' },
    '미용/건강가전 (드라이어/마사지기)': { leadFraming: F.upperBody, part: '상반신', shot: '미디엄', crop: '머리~허리', action: 'using', extraInstruction: '사용 장면 — 제품과 사용 부위가 함께 보이게.' },
    '음향기기 (헤드폰/스피커)': { leadFraming: F.headShoulders, part: '머리/귀', shot: '미디엄 클로즈업', crop: '머리~어깨', action: 'wearing/listening to', extraInstruction: '헤드폰은 착용 컷, 스피커는 옆에 두고 감상하는 무드.' },
    '모바일/PC 액세서리': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '데스크 셋업 위 사용 클로즈업. 제품 디테일 강조.' },
    '기타 가전/디지털': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using' },

    // 가구·인테리어 — 공간 연출
    '침구 (이불/베개/매트리스커버)': { leadFraming: F.lifestyleWide, part: '전신 + 침실', shot: '와이드', crop: '전신', action: 'relaxing on', extraInstruction: '아늑한 침실. 침구 질감과 컬러가 주인공.' },
    '커튼/러그/홈데코': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'in a room styled with', extraInstruction: '제품이 돋보이는 인테리어 연출.' },
    '조명': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'in a cozy room lit by', extraInstruction: '저녁 무드, 따뜻한 조명 빛이 주인공.' },
    '소형가구 (테이블/의자/선반)': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'using', extraInstruction: '실사용 배치 장면. 가구 형태와 비율이 또렷이.' },
    '기타 가구/인테리어': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'in a room with' },

    // 스포츠·레저 — 활동 장면
    '헬스/운동용품': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'working out with', extraInstruction: '운동 동작 중. 활기찬 무드, 제품 사용이 명확히.' },
    '캠핑용품': { leadFraming: F.lifestyleWide, part: '전신 + 야외', shot: '와이드', crop: '전신', action: 'camping with', extraInstruction: '캠핑장 셋업. 자연광, 제품이 화면 중심.' },
    '등산/아웃도어': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'hiking with', extraInstruction: '산/트레일 배경. 장비 착용/사용이 또렷이.' },
    '골프': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'playing golf with', extraInstruction: '골프장/연습장. 스윙 또는 어드레스 자세.' },
    '자전거/보드': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'riding', extraInstruction: '야외 라이딩 장면. 안전장비 착용.' },
    '수영/수상용품': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'at the pool with', extraInstruction: '수영장 사이드. 스포티하고 건전한 무드.' },
    '기타 스포츠/레저': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'using' },

    // 반려동물 — 반려동물 + 제품이 주인공
    '강아지용품': { leadFraming: F.lifestyleWide, part: '사람 + 강아지', shot: '와이드', crop: '전신', action: 'playing with their dog using', extraInstruction: '귀여운 강아지와 제품이 주인공. 밝은 실내/공원.' },
    '고양이용품': { leadFraming: F.lifestyleWide, part: '사람 + 고양이', shot: '와이드', crop: '전신', action: 'playing with their cat using', extraInstruction: '귀여운 고양이와 제품이 주인공. 아늑한 실내.' },
    '사료/간식 (반려동물)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '사료 패키지가 주인공. 옆에 강아지/고양이가 기대하는 모습.' },
    '기타 반려동물': { leadFraming: F.lifestyleWide, part: '사람 + 반려동물', shot: '와이드', crop: '전신', action: 'with their pet using' },

    // 문구·공구·차량
    '문구/사무용품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'writing/working with', extraInstruction: '깔끔한 데스크 위 사용 클로즈업.' },
    '공구/작업용품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'working with', extraInstruction: '작업 장면 클로즈업. 장갑 낀 손, 제품 기능 강조.' },
    '자동차용품': { leadFraming: F.handsProduct, part: '손 + 제품 + 차량', shot: '클로즈업', crop: '손~제품', action: 'using on the car', extraInstruction: '차량 옆/내부 사용 장면. 제품이 또렷이.' },
    '기타': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using' },

    // ── 코스트코 전면 정렬로 추가된 카테고리들 ──────────────────────
    // 디지털·TV·컴퓨터
    'TV': { leadFraming: F.lifestyleWide, part: '전신 + 거실', shot: '와이드', crop: '전신', action: 'watching', extraInstruction: '거실 TV 시청 장면. 화면과 베젤 디자인이 또렷이.' },
    '노트북/태블릿': { leadFraming: F.tableScene, part: '상반신 + 데스크', shot: '미디엄', crop: '허리 위 + 책상', action: 'working on', extraInstruction: '카페/데스크 작업 장면. 화면과 제품 디자인 강조.' },
    '모니터/프린터': { leadFraming: F.tableScene, part: '상반신 + 데스크', shot: '미디엄', crop: '허리 위 + 책상', action: 'using', extraInstruction: '깔끔한 데스크 셋업. 제품이 화면 중심.' },
    '카메라': { leadFraming: F.upperBody, part: '상반신', shot: '미디엄', crop: '머리~허리', action: 'holding and shooting with', extraInstruction: '카메라를 든 촬영 장면. 제품 디테일 또렷이.' },
    '모바일/충전 액세서리': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '폰과 함께 사용하는 클로즈업.' },
    '게임/게이밍': { leadFraming: F.tableScene, part: '상반신 + 데스크', shot: '미디엄', crop: '허리 위 + 책상', action: 'gaming with', extraInstruction: '게이밍 데스크 셋업, 은은한 RGB 무드.' },
    '키보드/마우스/저장장치': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '데스크 위 사용 클로즈업. 제품 디테일 강조.' },
    '악기': { leadFraming: F.upperBody, part: '상반신 + 악기', shot: '미디엄', crop: '머리~허리', action: 'playing', extraInstruction: '연주 장면. 악기가 주인공.' },
    '기타 디지털': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using' },

    // 가전 (대형 포함)
    '냉장고/김치냉장고': { leadFraming: F.lifestyleWide, part: '전신 + 주방', shot: '와이드', crop: '전신', action: 'in a kitchen with', extraInstruction: '주방 설치 모습. 제품 전면 디자인이 또렷이.' },
    '세탁기/건조기/의류관리기': { leadFraming: F.lifestyleWide, part: '전신 + 세탁실', shot: '와이드', crop: '전신', action: 'doing laundry with', extraInstruction: '밝은 세탁실. 제품 전면이 화면 중심.' },
    '계절가전 (에어컨/선풍기/히터)': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'relaxing near', extraInstruction: '계절감 있는 실내. 제품이 화면 중심.' },
    '공기청정기/제습기': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'relaxing near', extraInstruction: '깨끗하고 쾌적한 거실 무드.' },
    '청소기/생활가전': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'cleaning with', extraInstruction: '거실 청소 장면. 제품 전체 형태 또렷이.' },
    '기타 가전': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using' },

    // 가구·침구·인테리어
    '거실가구 (소파/테이블)': { leadFraming: F.lifestyleWide, part: '전신 + 거실', shot: '와이드', crop: '전신', action: 'relaxing on', extraInstruction: '아늑한 거실 연출. 가구 형태와 소재가 또렷이.' },
    '침실가구 (침대/매트리스)': { leadFraming: F.lifestyleWide, part: '전신 + 침실', shot: '와이드', crop: '전신', action: 'relaxing on', extraInstruction: '포근한 침실 연출.' },
    '유아동 가구': { leadFraming: F.lifestyleWide, part: '전신 + 키즈룸', shot: '와이드', crop: '전신', action: 'using', extraInstruction: '밝은 키즈룸. 안전하고 사랑스러운 무드.' },
    '식탁/책상/의자': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'using', extraInstruction: '실사용 배치. 가구 비율이 또렷이.' },
    '침구 (이불/베개)': { leadFraming: F.lifestyleWide, part: '전신 + 침실', shot: '와이드', crop: '전신', action: 'relaxing on', extraInstruction: '아늑한 침실. 침구 질감과 컬러가 주인공.' },
    '커튼/블라인드/러그': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'in a room styled with', extraInstruction: '제품이 돋보이는 인테리어 연출.' },
    '홈데코/거울/액자': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'in a room styled with', extraInstruction: '감각적인 인테리어 소품 연출.' },

    // 홈·키친 (추가분)
    '주방잡화 (조리도구/보관용기)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '실사용 장면 클로즈업. 제품 기능이 보이게.' },
    '칼/도마': { leadFraming: F.kitchenScene, part: '상반신 + 주방', shot: '미디엄', crop: '허리 위', action: 'preparing ingredients with', extraInstruction: '재료 손질 장면. 안전하고 깔끔하게, 제품 중심.' },
    '세탁용품 (건조대/바구니)': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'doing laundry with', extraInstruction: '밝은 실내 세탁/정리 장면.' },

    // 유아동 (추가분)
    '유아동 바디/구강케어': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '아이 케어 용품. 청결하고 부드러운 무드.' },

    // 스포츠 (추가분)
    '겨울 스포츠': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'skiing/snowboarding with', extraInstruction: '설원 배경. 장비 착용이 또렷이.' },

    // 파티오·정원
    '정원 가구': { leadFraming: F.lifestyleWide, part: '전신 + 야외', shot: '와이드', crop: '전신', action: 'relaxing on', extraInstruction: '테라스/정원 야외 연출. 자연광.' },
    '파라솔/차양막': { leadFraming: F.lifestyleWide, part: '전신 + 야외', shot: '와이드', crop: '전신', action: 'relaxing under', extraInstruction: '햇살 좋은 야외. 제품이 화면 중심.' },
    '그릴/바비큐': { leadFraming: F.lifestyleWide, part: '전신 + 야외', shot: '와이드', crop: '전신', action: 'grilling with', extraInstruction: '야외 바비큐 장면. 그릴과 음식이 또렷이.' },
    '정원용품/장식': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'gardening with', extraInstruction: '정원 손질 장면. 자연광.' },
    '꽃/식물/원예': { leadFraming: F.handsProduct, part: '손 + 화분', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '화분/꽃 클로즈업. 싱그러운 무드.' },
    '창고/보관함': { leadFraming: F.lifestyleWide, part: '전신 + 야외', shot: '와이드', crop: '전신', action: 'organizing', extraInstruction: '마당/베란다 수납 장면. 제품 전체 형태.' },
    '기타 정원': { leadFraming: F.lifestyleWide, part: '전신 + 야외', shot: '와이드', crop: '전신', action: 'using' },

    // 보석 (추가분)
    '순금/순은 (골드바/실버바)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '골드바/실버바 정밀 클로즈업. 고급스러운 무드, 어두운 배경 광택 강조.' },

    // 화장품·미용·위생 (추가분)
    '화장지/키친타월': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '패키지가 주인공. 청결한 무드.' },
    '생리대/위생용품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '패키지 중심. 깨끗하고 신뢰감 있는 무드.' },

    // 건강·영양제 — 전부 제품 용기 중심
    '비타민/미네랄': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '영양제 용기가 주인공. 밝고 클린한 무드.' },
    '유산균': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '용기와 스틱/캡슐 함께. 클린 무드.' },
    '오메가3/크릴오일': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '용기와 캡슐 함께. 신뢰감 있는 무드.' },
    '홍삼': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '홍삼 패키지/스틱. 프리미엄 무드.' },
    '어린이 영양제': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '알록달록 밝은 무드. 패키지가 주인공.' },
    '다이어트/콜라겐': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '용기 중심. 가볍고 산뜻한 무드.' },
    '프로틴/헬스 보충제': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '쉐이커/용기와 함께. 스포티한 무드.' },
    '관절/기타 건강식품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '용기 중심. 신뢰감 있는 클린 무드.' },

    // 공구·설비 (추가분)
    '선반/수납 (공구)': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'organizing with', extraInstruction: '창고/거실 수납 정리 장면.' },
    '전구/건전지': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '제품 패키지/본체 클로즈업.' },
    '보안 (금고/도어락)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '현관/도어 사용 장면. 제품 조작부 또렷이.' },
    '기타 공구/설비': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using' },

    // 식품 (추가분)
    '쌀/잡곡/시리얼': { leadFraming: F.handsProduct, part: '손 + 곡물', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '곡물의 질감이 보이게. 패키지와 내용물 함께.' },
    '건식품 (건어물/김/견과)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '내용물과 패키지 함께. 먹음직스러운 스타일링.' },
    '유기농식품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting fresh', extraInstruction: '자연광, 신선하고 건강한 유기농 무드.' },

    // 문구·사무 (세분화)
    '문구 (펜/노트)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'writing with', extraInstruction: '깔끔한 데스크 위 필기 클로즈업.' },
    '사무용품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '사무실 데스크 사용 장면.' },
    '사무기기 (계산기/코팅기)': { leadFraming: F.tableScene, part: '상반신 + 데스크', shot: '미디엄', crop: '허리 위 + 책상', action: 'using', extraInstruction: '사무실 데스크. 제품 조작 장면.' },
    '기타 문구/사무': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using' },

    // 커클랜드 시그니처 — 동종 카테고리와 같은 프레이밍 + KS 패키지 강조
    'KS 식품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '커클랜드 패키지 라벨이 또렷이. 먹음직스러운 스타일링.' },
    'KS 건강/영양제': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '커클랜드 용기 라벨 중심. 클린한 무드.' },
    'KS 의류/잡화': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '핏이 잘 보이는 전신. 캐주얼 카탈로그 무드.' },
    'KS 미용': { leadFraming: F.headShoulders, part: '얼굴', shot: '미디엄 클로즈업', crop: '얼굴~어깨', action: 'using the beauty product', extraInstruction: '제품 용기와 함께. 클린 뷰티 무드.' },
    'KS 홈/생활용품/세제': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '실사용 장면. 커클랜드 패키지 또렷이.' },
    'KS 공구': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'working with', extraInstruction: '작업 장면 클로즈업. 제품 기능 강조.' },
    'KS 골프용품': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'playing golf with', extraInstruction: '골프장/연습장. 스윙 또는 어드레스 자세.' },
    'KS 반려동물용품': { leadFraming: F.lifestyleWide, part: '사람 + 반려동물', shot: '와이드', crop: '전신', action: 'with their pet using', extraInstruction: '반려동물과 제품이 주인공. 커클랜드 패키지 보이게.' },

    // ── 코스트코 1:1 미러링으로 추가된 항목들 ──────────────────
    'Apple (아이폰/아이패드/워치/에어팟)': { leadFraming: F.handsProduct, part: '손 + 기기', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '미니멀 데스크 위 애플 기기 사용 클로즈업.' },
    '오디오/영상기기 (스피커/사운드바/헤드폰)': { leadFraming: F.headShoulders, part: '머리/귀', shot: '미디엄 클로즈업', crop: '머리~어깨', action: 'wearing/listening to', extraInstruction: '헤드폰은 착용 컷, 스피커/사운드바는 거실 감상 무드.' },
    '모바일 (스마트기기/충전기/액세서리)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '폰과 함께 사용하는 클로즈업.' },
    '보안 카메라': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'installing/checking', extraInstruction: '현관/실내 설치 장면. 제품과 앱 화면.' },
    '노트북/데스크탑': { leadFraming: F.tableScene, part: '상반신 + 데스크', shot: '미디엄', crop: '허리 위 + 책상', action: 'working on', extraInstruction: '데스크 작업 장면. 화면과 제품 디자인 강조.' },
    '태블릿': { leadFraming: F.tableScene, part: '상반신 + 데스크', shot: '미디엄', crop: '허리 위 + 책상', action: 'using', extraInstruction: '카페/소파 사용 장면. 화면 또렷이.' },
    '게임 (게이밍 의자/PC 액세서리/콘솔)': { leadFraming: F.tableScene, part: '상반신 + 데스크', shot: '미디엄', crop: '허리 위 + 책상', action: 'gaming with', extraInstruction: '게이밍 데스크 셋업, 은은한 RGB 무드.' },
    '컴퓨터 액세서리 (키보드/마우스/저장장치/공유기)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '데스크 위 사용 클로즈업. 제품 디테일 강조.' },
    '악기 (건반/현악기)': { leadFraming: F.upperBody, part: '상반신 + 악기', shot: '미디엄', crop: '머리~허리', action: 'playing', extraInstruction: '연주 장면. 악기가 주인공.' },
    '냉장고 (김치냉장고/와인셀러/냉동고)': { leadFraming: F.lifestyleWide, part: '전신 + 주방', shot: '와이드', crop: '전신', action: 'in a kitchen with', extraInstruction: '주방 설치 모습. 제품 전면 디자인 또렷이.' },
    '가전세트': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'in a home with', extraInstruction: '신혼집/새집 가전 셋업 연출.' },
    '커머셜 가전': { leadFraming: F.kitchenScene, part: '상반신 + 주방', shot: '미디엄', crop: '허리 위', action: 'operating', extraInstruction: '업소용 주방. 스테인리스 장비 무드.' },
    '주방가전 (블렌더/커피메이커/전자레인지/밥솥)': { leadFraming: F.kitchenScene, part: '상반신 + 주방', shot: '미디엄', crop: '허리 위', action: 'using', extraInstruction: '주방 조리대 위 제품 사용 장면. 제품이 화면 중심.' },
    '계절가전 (에어컨/선풍기/히터/제습기)': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'relaxing near', extraInstruction: '계절감 있는 실내. 제품이 화면 중심.' },
    '공기청정가전': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'relaxing near', extraInstruction: '깨끗하고 쾌적한 거실 무드.' },
    '생활가전 (청소기/전동칫솔)': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'using', extraInstruction: '거실 사용 장면. 제품 전체 형태 또렷이.' },
    '미용/건강가전 (마사지기/면도기/비데)': { leadFraming: F.upperBody, part: '상반신', shot: '미디엄', crop: '머리~허리', action: 'using', extraInstruction: '사용 장면 — 제품과 사용 부위가 함께 보이게.' },
    '미용/건강가전': { leadFraming: F.upperBody, part: '상반신', shot: '미디엄', crop: '머리~허리', action: 'using', extraInstruction: '사용 장면 — 제품과 사용 부위가 함께.' },
    '거실가구 (소파/TV장/테이블)': { leadFraming: F.lifestyleWide, part: '전신 + 거실', shot: '와이드', crop: '전신', action: 'relaxing on', extraInstruction: '아늑한 거실 연출. 가구 형태와 소재 또렷이.' },
    '침실가구 (매트리스/침대/서랍장)': { leadFraming: F.lifestyleWide, part: '전신 + 침실', shot: '와이드', crop: '전신', action: 'relaxing on', extraInstruction: '포근한 침실 연출.' },
    '주방가구 (식탁/의자)': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'dining at', extraInstruction: '식탁 차림 연출. 가구 비율 또렷이.' },
    '사무가구 (의자/책상)': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'working at', extraInstruction: '홈오피스 연출.' },
    '조명 (램프/스탠드)': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'in a cozy room lit by', extraInstruction: '저녁 무드, 따뜻한 조명 빛이 주인공.' },
    '침구 (이불/세트/베개/쿠션)': { leadFraming: F.lifestyleWide, part: '전신 + 침실', shot: '와이드', crop: '전신', action: 'relaxing on', extraInstruction: '아늑한 침실. 침구 질감과 컬러가 주인공.' },
    '홈인테리어 (커튼/블라인드/러그/타월/거울)': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'in a room styled with', extraInstruction: '제품이 돋보이는 인테리어 연출.' },
    '조리용품 (프라이팬/쿡웨어)': { leadFraming: F.kitchenScene, part: '상반신 + 주방', shot: '미디엄', crop: '허리 위', action: 'cooking with', extraInstruction: '조리 중인 장면. 제품이 화면 중심.' },
    '식탁용품 (그릇/수저/컵/와인잔)': { leadFraming: F.tableScene, part: '손 + 식탁', shot: '미디엄', crop: '허리 위 + 테이블', action: 'setting the table with', extraInstruction: '차려진 식탁 스타일링. 그릇/컵이 주인공.' },
    '주방잡화 (조리도구/수납/보관용기)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '실사용 장면 클로즈업. 제품 기능이 보이게.' },
    '기저귀': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '제품 패키지가 주인공. 밝고 청결한 무드.' },
    '유아동 의류/잡화 (아우터/상의/하의/신발)': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '아이 옷 핏이 잘 보이는 전신. 밝은 카탈로그 무드.' },
    '유아동용품': { leadFraming: F.fullBody, part: '전신 + 제품', shot: '풀샷', crop: '전신', action: 'using', extraInstruction: '제품을 사용하는 자연스러운 장면. 제품 또렷이.' },
    '완구 (블럭/교육용/인형/보드게임)': { leadFraming: F.fullBody, part: '전신 + 제품', shot: '풀샷', crop: '전신', action: 'playing with', extraInstruction: '장난감을 갖고 노는 밝은 장면. 제품이 주인공.' },
    '반려동물용품 (강아지/고양이)': { leadFraming: F.lifestyleWide, part: '사람 + 반려동물', shot: '와이드', crop: '전신', action: 'playing with their pet using', extraInstruction: '귀여운 강아지/고양이와 제품이 주인공.' },
    '골프 (가방/공/클럽)': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'playing golf with', extraInstruction: '골프장/연습장. 스윙 또는 어드레스 자세.' },
    '헬스/운동기구 (러닝/자전거/헬스용품)': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'working out with', extraInstruction: '운동 동작 중. 활기찬 무드.' },
    '다이어트/헬스 식품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '쉐이커/용기와 함께. 스포티한 무드.' },
    '캠핑 (의자/텐트/침낭/조리도구)': { leadFraming: F.lifestyleWide, part: '전신 + 야외', shot: '와이드', crop: '전신', action: 'camping with', extraInstruction: '캠핑장 셋업. 자연광, 제품이 화면 중심.' },
    '등산': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'hiking with', extraInstruction: '산/트레일 배경. 장비 착용/사용 또렷이.' },
    '아웃도어 스포츠': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'playing outdoor sports with', extraInstruction: '야외 활동 장면. 활기찬 무드.' },
    '수상스포츠': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'at the water with', extraInstruction: '수영장/해변. 스포티하고 건전한 무드.' },
    '가제보/스크린 하우스/그린 하우스': { leadFraming: F.lifestyleWide, part: '전신 + 야외', shot: '와이드', crop: '전신', action: 'relaxing in', extraInstruction: '마당/정원 설치 모습. 구조물 전체 형태.' },
    '정원 가구 (다이닝/소파/벤치)': { leadFraming: F.lifestyleWide, part: '전신 + 야외', shot: '와이드', crop: '전신', action: 'relaxing on', extraInstruction: '테라스/정원 야외 연출. 자연광.' },
    '그릴/액세서리': { leadFraming: F.lifestyleWide, part: '전신 + 야외', shot: '와이드', crop: '전신', action: 'grilling with', extraInstruction: '야외 바비큐 장면. 그릴과 음식 또렷이.' },
    '가든 전기용품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'working with', extraInstruction: '정원 작업 장면. 제품 기능 강조.' },
    '꽃/식물': { leadFraming: F.handsProduct, part: '손 + 화분', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '화분/꽃 클로즈업. 싱그러운 무드.' },
    '원예용품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'gardening with', extraInstruction: '정원 손질 장면. 자연광.' },
    '여성의류 (니트/셔츠/바지/아우터)': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '여성 의류 핏이 잘 보이는 전신 카탈로그 컷.' },
    '남성의류': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '남성 의류 핏이 잘 보이는 전신 카탈로그 컷.' },
    '여성 속옷/양말': { leadFraming: F.ankle, part: '발목/발', shot: '클로즈업', crop: '종아리~발', action: 'wearing', extraInstruction: '양말은 발목 클로즈업. 이너웨어는 라운지웨어 위 건전하게.' },
    '남성 속옷/양말': { leadFraming: F.ankle, part: '발목/발', shot: '클로즈업', crop: '종아리~발', action: 'wearing', extraInstruction: '양말은 발목 클로즈업. 이너웨어는 라운지웨어 위 건전하게.' },
    '유아동 의류/속옷': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '아이 옷 핏 전신. 밝고 사랑스러운 무드.' },
    '여성신발': { leadFraming: F.fullBody, part: '전신 (발 강조)', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '전신 풀샷이되 신발이 또렷이 보이는 스타일링.' },
    '남성신발': { leadFraming: F.fullBody, part: '전신 (발 강조)', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '전신 풀샷이되 신발이 또렷이 보이는 스타일링.' },
    '아동신발': { leadFraming: F.fullBody, part: '전신 (발 강조)', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '아이 전신 풀샷, 신발 또렷이.' },
    '가방': { leadFraming: F.bagShot, part: '어깨/손/등', shot: '미디엄', crop: '상반신 + 가방', action: 'carrying', extraInstruction: '가방 강조, 다리 아래 X.' },
    '여행가방': { leadFraming: F.fullBody, part: '전신 + 캐리어', shot: '풀샷', crop: '전신', action: 'pulling', extraInstruction: '캐리어 끌고 걷는 공항/여행 무드.' },
    '패션잡화': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing/using', extraInstruction: '착용 부위가 잘 보이게.' },
    'One & Only 보석': { leadFraming: F.neckCloseup, part: '목/쇄골', shot: '클로즈업', crop: '턱~가슴', action: 'wearing', extraInstruction: '하이엔드 주얼리 클로즈업. 고급스러운 조명.' },
    '팔찌': { leadFraming: F.wrist, part: '손목', shot: '클로즈업', crop: '손목만', action: 'wearing on wrist', extraInstruction: '손목과 팔찌 중심. 얼굴/몸 X.' },
    '여성시계': { leadFraming: F.wrist, part: '손목', shot: '클로즈업', crop: '손목만', action: 'wearing on wrist', extraInstruction: '손목의 시계 정밀 클로즈업. 다이얼 또렷이.' },
    '남성시계': { leadFraming: F.wrist, part: '손목', shot: '클로즈업', crop: '손목만', action: 'wearing on wrist', extraInstruction: '손목의 시계 정밀 클로즈업. 다이얼 또렷이.' },
    '패션주얼리': { leadFraming: F.chestUp, part: '얼굴~가슴', shot: '미디엄 클로즈업', crop: '얼굴 하부~가슴', action: 'wearing', extraInstruction: '착용 부위가 잘 보이게.' },
    '바디/구강케어 (샤워/로션/핸드케어)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'applying', extraInstruction: '로션/케어 제품 사용 클로즈업. 청결 무드.' },
    '헤어케어 (샴푸/영양)': { leadFraming: F.headShoulders, part: '머리카락', shot: '미디엄 클로즈업', crop: '머리~어깨', action: 'with sleek glossy hair', extraInstruction: '윤기 머릿결 강조.' },
    '유아동 바디/구강케어 (미용)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '아이 케어 용품. 청결하고 부드러운 무드.' },
    '화장품/향수 (스킨케어/메이크업/클렌징/팩)': { leadFraming: F.faceOnly, part: '얼굴', shot: '클로즈업', crop: '얼굴만', action: 'with flawless skin/makeup', extraInstruction: '제품 특성에 맞는 얼굴 클로즈업. 신체 X.' },
    '화장지 (티슈/키친타월)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '패키지가 주인공. 청결한 무드.' },
    '홍삼제품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '홍삼 패키지/스틱. 프리미엄 무드.' },
    '다이어트/뷰티 식품 (콜라겐)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '용기 중심. 가볍고 산뜻한 무드.' },
    '헬스 보충식품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '쉐이커/용기와 함께. 스포티한 무드.' },
    '관절 보조식품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '용기 중심. 신뢰감 있는 클린 무드.' },
    '홈케어/구급용품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '구급함/케어용품. 깨끗하고 안심되는 무드.' },
    '기타 건강식품': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '용기 중심. 클린 무드.' },
    '선반/수납': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'organizing with', extraInstruction: '창고/거실 수납 정리 장면.' },
    '작업용 공구/설비 (전동공구/사다리)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'working with', extraInstruction: '작업 장면 클로즈업. 장갑 낀 손, 제품 기능 강조.' },
    '전구/야외조명': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'installing', extraInstruction: '전구 교체/설치 장면. 제품 또렷이.' },
    '건전지': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '제품 패키지 클로즈업.' },
    '보안 (금고/도어락/카메라)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '현관/도어 사용 장면. 제품 조작부 또렷이.' },
    '생활/주거 설비 (욕실/바닥재)': { leadFraming: F.lifestyleWide, part: '전신 + 실내', shot: '와이드', crop: '전신', action: 'installing', extraInstruction: '설치/시공 완성 공간 연출.' },
    '자동차용품 (세차/오일/액세서리)': { leadFraming: F.handsProduct, part: '손 + 제품 + 차량', shot: '클로즈업', crop: '손~제품', action: 'using on the car', extraInstruction: '차량 옆/내부 사용 장면. 제품 또렷이.' },
    '쌀/잡곡 (시리얼)': { leadFraming: F.handsProduct, part: '손 + 곡물', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '곡물 질감이 보이게. 패키지와 내용물 함께.' },
    '커피/차 (원두/드립백)': { leadFraming: F.tableScene, part: '상반신 + 컵', shot: '미디엄', crop: '허리 위 + 테이블', action: 'enjoying a cup of', extraInstruction: '따뜻한 카페 무드. 김 오르는 컵과 패키지.' },
    '음료 (생수/주스/우유)': { leadFraming: F.handsProduct, part: '손 + 병', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '시원한 느낌 — 물방울 맺힌 병/캔. 라벨 또렷이.' },
    '가공식품 (통조림/라면/오일/빵)': { leadFraming: F.tableScene, part: '상반신 + 식탁', shot: '미디엄', crop: '허리 위 + 테이블', action: 'preparing a meal with', extraInstruction: '조리/차림 장면. 패키지 또렷이.' },
    '건식품 (건과일/건어물/김)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '내용물과 패키지 함께. 먹음직스러운 스타일링.' },
    '과자/간식 (캔디/견과/초콜릿)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'holding', extraInstruction: '제품과 내용물 함께. 밝고 맛있어 보이게.' },
    '냉장식품 (햄/치즈)': { leadFraming: F.tableScene, part: '상반신 + 식탁', shot: '미디엄', crop: '허리 위 + 테이블', action: 'serving', extraInstruction: '플레이팅과 패키지 함께.' },
    '냉동식품': { leadFraming: F.tableScene, part: '상반신 + 식탁', shot: '미디엄', crop: '허리 위 + 테이블', action: 'serving', extraInstruction: '조리 완성 접시와 패키지 함께.' },
    '문구 (펜/연필/마커/노트)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'writing with', extraInstruction: '깔끔한 데스크 위 필기 클로즈업.' },
    '사무기기 (계산기/코팅기/세단기)': { leadFraming: F.tableScene, part: '상반신 + 데스크', shot: '미디엄', crop: '허리 위 + 책상', action: 'using', extraInstruction: '사무실 데스크. 제품 조작 장면.' },
    '사무용품 (풀/테이프/스테이플러)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '사무실 데스크 사용 장면.' },
    '사무정리용품 (파일/서류보관함)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'organizing with', extraInstruction: '서류 정리 장면. 깔끔한 무드.' },
    '오피스 종이용품 (복사지/포스트잇)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'using', extraInstruction: '데스크 위 사용 클로즈업.' },
    '선물세트 (식품)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '선물세트 패키지가 주인공. 고급스러운 무드.' },
    '선물세트 (비식품)': { leadFraming: F.handsProduct, part: '손 + 제품', shot: '클로즈업', crop: '손~제품', action: 'presenting', extraInstruction: '선물세트 패키지가 주인공. 정갈한 무드.' },
  }

  if (byExactCategory[category]) return byExactCategory[category]

  // ── 2) 상품명 키워드 (매우 구체적인 아이템) ──────────────────────────
  const name = (productName || '').toLowerCase()
  const earringPattern = /귀걸이|이어링|earring/
  const necklacePattern = /목걸이|넥클리스|necklace|펜던트/
  const braceletPattern = /팔찌|브레이슬릿|bracelet|뱅글/
  const ringPattern = /반지|링|ring/
  const glassesPattern = /안경|선글라스|glasses|sunglasses/
  const beltPattern = /벨트|belt/
  const sockPattern = /양말|sock/
  const lipPattern = /립스틱|틴트|립글로스|lipstick|lip tint|lip gloss|립밤/
  const mascaraPattern = /마스카라|아이라이너|아이섀도|mascara|eyeliner|eyeshadow/
  const tonerPattern = /토너|세럼|에센스|크림|로션|앰플|toner|serum|essence|cream|ampoule/

  // 상품명 키워드용 leadFraming 인라인
  const FN = {
    sideHead: 'a tight close-up of the side profile of the head (ear area), NO body visible',
    chestUp: 'a medium close-up showing only the chest and head area (NO lower body)',
    wrist: 'a tight close-up of a wrist and hand only (NO body, NO face visible)',
    finger: 'a macro close-up of fingers and hand only (NO body, NO face visible)',
    faceOnly: 'an extreme close-up of the face only (cropped at the neck, NO body visible)',
    waistMid: 'a medium shot of the waist and torso, focused on the belt (NO face, NO legs)',
    ankle: 'a close-up of ankles and feet from calf down (NO upper body)',
    lipsMacro: 'a macro close-up of the lips only (NO eyes, NO body)',
    eyeMacro: 'a macro close-up of one eye and surrounding area (NO mouth, NO body)',
    hatHead: 'a medium close-up of the head and shoulders, framed tight on the hat being worn (NO body below the shoulders visible)',
    bagShot: 'a medium shot showing the upper body and the bag clearly, cropped at the hip (NO legs visible)',
    feet: 'a low-angle close-up of the legs and feet only from knees to feet (NO upper body or face visible)',
    upperBody: 'a medium shot showing only the upper body from head to waist (NO legs or lower body visible)',
    fullBody: 'a full-body fashion shot from head to feet',
  }

  // 액세서리 (가장 구체적)
  if (earringPattern.test(name)) return { leadFraming: FN.sideHead, part: '귀', shot: '클로즈업', crop: '얼굴 측면', action: 'wearing', extraInstruction: '귀걸이 강조.' }
  if (necklacePattern.test(name)) return { leadFraming: FN.chestUp, part: '목/쇄골', shot: '미디엄 클로즈업', crop: '얼굴 하부~가슴', action: 'wearing', extraInstruction: '목걸이 강조. 하체 X.' }
  if (braceletPattern.test(name)) return { leadFraming: FN.wrist, part: '손목', shot: '클로즈업', crop: '손목', action: 'wearing', extraInstruction: '손목 클로즈업.' }
  if (ringPattern.test(name)) return { leadFraming: FN.finger, part: '손가락', shot: '매크로', crop: '손 클로즈업', action: 'wearing', extraInstruction: '반지 낀 손 매크로.' }
  if (glassesPattern.test(name)) return { leadFraming: FN.faceOnly, part: '얼굴', shot: '미디엄 클로즈업', crop: '얼굴만', action: 'wearing', extraInstruction: '안경 쓴 얼굴.' }
  if (beltPattern.test(name)) return { leadFraming: FN.waistMid, part: '허리', shot: '미디엄', crop: '가슴~허벅지 상부', action: 'wearing', extraInstruction: '벨트 강조.' }
  if (sockPattern.test(name)) return { leadFraming: FN.ankle, part: '발목', shot: '클로즈업', crop: '종아리~발', action: 'wearing' }
  if (lipPattern.test(name)) return { leadFraming: FN.lipsMacro, part: '입술', shot: '매크로', crop: '입술', action: 'with the lip product applied', extraInstruction: '입술 정밀 강조.' }
  if (mascaraPattern.test(name)) return { leadFraming: FN.eyeMacro, part: '눈', shot: '매크로', crop: '눈 주변', action: 'with the eye makeup applied', extraInstruction: '눈 정밀 강조.' }
  if (tonerPattern.test(name)) return { leadFraming: FN.faceOnly, part: '얼굴/볼', shot: '클로즈업', crop: '얼굴만', action: 'with smooth radiant skin', extraInstruction: '매끄러운 피부 클로즈업.' }

  // 의류·잡화 — 카테고리 미선택해도 상품명만으로 잡힘
  const hatPattern = /모자|hat|cap|beanie|버킷햇|페도라|볼캡/
  const shoePattern = /신발|구두|운동화|슈즈|shoe|sneaker|boot|샌들/
  const slipperPattern = /슬리퍼|slipper|쪼리/
  const scarfPattern = /스카프|머플러|scarf|muffler/
  const bagPattern = /가방|백|bag|clutch|tote|숄더백|크로스백|토트|배낭/
  const pantsPattern = /바지|팬츠|진|jean|pants|trouser|레깅스|슬랙스|반바지|숏츠|short/
  const topPattern = /티셔츠|맨투맨|후드|니트|셔츠|블라우스|탑|sweater|hoodie|tee|shirt/
  const dressPattern = /원피스|드레스|dress/
  const outerPattern = /자켓|코트|패딩|점퍼|아우터|jacket|coat|padding/

  if (hatPattern.test(name)) return { leadFraming: FN.hatHead, part: '머리/얼굴 상부', shot: '미디엄 클로즈업', crop: '머리~어깨', action: 'wearing on head', extraInstruction: '얼굴+모자 중심. 어깨 아래 절대 X.' }
  if (shoePattern.test(name)) return { leadFraming: FN.fullBody, part: '전신 (발 강조)', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '전신 풀샷이되 신발이 또렷이 보이는 스타일링.' }
  if (slipperPattern.test(name)) return { leadFraming: FN.fullBody, part: '전신 (발 강조)', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '전신 풀샷이되 슬리퍼/샌들이 또렷이 보이는 스타일링.' }
  if (scarfPattern.test(name)) return { leadFraming: FN.chestUp, part: '목/어깨', shot: '미디엄 클로즈업', crop: '얼굴 하부~가슴', action: 'wearing around neck', extraInstruction: '스카프 두른 모습. 허리 아래 X.' }
  if (bagPattern.test(name)) return { leadFraming: FN.bagShot, part: '어깨/손/등', shot: '미디엄', crop: '상반신+가방', action: 'carrying', extraInstruction: '가방 강조, 다리 아래 X.' }
  if (pantsPattern.test(name)) return { leadFraming: FN.fullBody, part: '하체 중심 전신', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '전신 풀샷이되 하의가 잘 보이게.' }
  if (topPattern.test(name)) return { leadFraming: FN.upperBody, part: '상반신', shot: '미디엄', crop: '머리~허리', action: 'wearing', extraInstruction: '상반신만. 하체 X.' }
  if (dressPattern.test(name)) return { leadFraming: 'a full-body fashion shot from head to feet', part: '전신', shot: '풀샷', crop: '전신', action: 'wearing' }
  if (outerPattern.test(name)) return { leadFraming: 'a medium-long shot from head to knees (cropped at knees)', part: '상반신~허벅지', shot: '미디엄~풀샷', crop: '머리~무릎', action: 'wearing', extraInstruction: '아우터 핏 강조.' }

  // ── 3) 카테고리 부분 매칭 (legacy / 자유 입력 대응) ──────────────────
  const catLower = (category || '').toLowerCase()
  if (/상의|티셔츠|셔츠|블라우스|니트|탑/.test(catLower))
    return { leadFraming: 'a medium shot showing only the upper body from head to waist (NO legs visible)', part: '상체', shot: '미디엄', crop: '머리~허리', action: 'wearing', extraInstruction: '상반신만. 하체 X.' }
  if (/하의|팬츠|바지|스커트|치마|신발|구두|슈즈|샌들|슬리퍼/.test(catLower))
    return { leadFraming: 'a full-body fashion shot from head to feet', part: '하체 중심 전신', shot: '풀샷', crop: '전신', action: 'wearing', extraInstruction: '전신 풀샷이되 하의/신발이 잘 보이게.' }
  if (/원피스|드레스/.test(catLower))
    return { leadFraming: 'a full-body fashion shot from head to feet', part: '전신', shot: '풀샷', crop: '전신', action: 'wearing' }
  if (/아우터|자켓|코트/.test(catLower))
    return { leadFraming: 'a medium-long shot from head to knees (cropped at knees)', part: '상반신~허벅지', shot: '미디엄', crop: '머리~무릎', action: 'wearing', extraInstruction: '아우터 핏 강조.' }
  if (/스킨|토너|세럼|크림|로션|마스크|선크림|클렌징|메이크업|화장품|뷰티/.test(catLower))
    return { leadFraming: 'an extreme close-up of the face only (cropped at the neck, NO body visible)', part: '얼굴', shot: '클로즈업', crop: '얼굴만', action: 'with the beauty product applied', extraInstruction: '얼굴 중심.' }

  // ── 4) 디폴트 ─────────────────────────────────────────────────────
  return { leadFraming: 'a full-body fashion shot from head to feet', part: '전신', shot: '풀샷', crop: '전신', action: 'wearing/using' }
}

// Replicate 클라이언트 싱글톤 (서버 체험 모드 배경제거용 — REPLICATE_API_TOKEN)
let replicateClient: Replicate | null = null
function getReplicate(): Replicate {
  if (replicateClient) return replicateClient
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN 환경변수가 설정되지 않았습니다.')
  replicateClient = new Replicate({ auth: token })
  return replicateClient
}

/**
 * Recraft 배경 제거 (via Replicate) — 무료 체험(서버 키) 경로 전용
 * - 픽셀 마스크 기반 진짜 배경 제거(투명 PNG → 흰 배경에 자연스럽게)
 * - 품질/비용 모두 Gemini보다 우수($0.01/건). 우리 서버 비용이라 이걸 씀.
 * - BYOK 사용자는 Replicate 토큰이 없으니 removeBackground(Gemini)를 씀.
 */
export async function removeBackgroundRecraft(imageDataUrl: string): Promise<string> {
  const replicate = getReplicate()
  const MAX_RETRIES = 3
  let output: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      output = await replicate.run('recraft-ai/recraft-remove-background', { input: { image: imageDataUrl } })
      break
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status !== 429 || attempt === MAX_RETRIES) throw err
      const headers = (err as { response?: { headers?: Headers } })?.response?.headers
      const retryAfterSec = Number(headers?.get?.('retry-after')) || 6
      await new Promise((r) => setTimeout(r, retryAfterSec * 1000 + 1000))
    }
  }
  if (output === undefined) throw new Error('Recraft 응답을 받지 못했습니다.')

  let resultUrl: string
  if (typeof output === 'string') resultUrl = output
  else if (Array.isArray(output) && typeof output[0] === 'string') resultUrl = output[0]
  else if (output && typeof output === 'object' && 'url' in output) {
    const urlValue = (output as { url: () => URL | string }).url.call(output)
    resultUrl = typeof urlValue === 'string' ? urlValue : urlValue.toString()
  } else throw new Error('Recraft 응답 형식을 인식하지 못했습니다.')

  const imageRes = await fetch(resultUrl)
  if (!imageRes.ok) throw new Error(`Recraft 결과 다운로드 실패: ${imageRes.status}`)
  const buffer = await imageRes.arrayBuffer()
  return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`
}

/**
 * Gemini 기반 배경 제거 — BYOK(본인 키) 경로 전용
 *
 * BYOK 사용자는 Gemini 키만 있어 Replicate를 못 씀 → 어쩔 수 없이 Gemini로.
 * Gemini는 "생성" 모델이라 흰 배경 근사로 출력됨(Recraft보다 품질 낮을 수 있음).
 */
export async function removeBackground(imageDataUrl: string): Promise<string> {
  const apiKey = getApiKey()
  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '')

  const prompt = `TASK: Replace the ENTIRE background of this image with a solid pure white color (#FFFFFF, RGB 255,255,255). Keep the product(s) identical to the original.

OUTPUT BACKGROUND MUST BE: Plain white only. No table, no floor, no wall, no shelves, no store, no furniture, no other products in background, no gradients, no textures, no shadows on ground. Just solid white everywhere except the product.

PRODUCT PRESERVATION:
- Keep ALL products visible in original image. If 2 shoes, output 2 shoes. If 3 items, output 3 items.
- Keep their exact pose, angle, position, proportions, colors, logos, and textures identical to original.
- Do not move, rotate, or reorient anything.

WHAT TO REMOVE:
- All background scenery (store, shelves, tables, floors, walls)
- All supporting objects (boxes the product sits on, stands, pedestals, hands, mannequins)
- Shadows cast on the ground
- Any text, labels, or tags not on the product itself

Final result: exact same product(s) in same position, floating on pure solid white (#FFFFFF). Absolutely no other visual elements in the background.`

  const body = {
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: base64 } },
      ],
    }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  }

  const res = await geminiRequest(
    `${GEMINI_BASE}/${getImageModel()}:generateContent?key=${apiKey}`,
    body,
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini 배경제거 오류: ${res.status} ${err}`)
  }
  const data = await res.json()
  const responseParts = data.candidates?.[0]?.content?.parts || []
  const imagePart = responseParts.find(
    (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith('image/'),
  )
  if (!imagePart?.inlineData) {
    const { reason } = extractGeminiImageFailureReason(data)
    throw new Error(`배경 제거 실패: ${reason}`)
  }
  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
}

/**
 * 이미지 비전 검출 — Gemini Flash 에게 reference 이미지를 보여주고 카테고리 추론
 *
 * 카테고리 미선택 + 상품명 키워드도 매칭 안 될 때만 호출 (fallback).
 * Gemini Flash 1회 호출 ≈ $0.001, 1~2s 추가 latency.
 *
 * 반환값은 CATEGORY_GROUPS의 정확 카테고리명 또는 빈 문자열 (검출 실패).
 */
async function detectProductCategoryFromImages(images: string[]): Promise<string> {
  if (images.length === 0) return ''
  try {
    const apiKey = getApiKey()
    const allowedCategories = [
      '패딩/점퍼', '집업/후리스', '티셔츠/맨투맨', '바지/하의', '가방/배낭',
      '모자/액세서리', '신발/부츠', '슬리퍼/샌들', '스카프/머플러', '기타 의류/잡화',
      '스킨케어 (토너/세럼/크림)', '클렌징', '마스크팩/패드', '선케어',
      '메이크업 베이스 (쿠션/파운데이션)', '메이크업 색조 (립/아이/치크)',
      '향수/바디', '헤어케어', '기타 뷰티',
    ]
    const prompt = `Look at the product in the reference image(s). Identify what type of product it is.

Return ONLY one of these exact category strings (no quotes, no extra text):
${allowedCategories.map((c) => `- ${c}`).join('\n')}

If you cannot determine clearly, return: 기타 의류/잡화

Respond with ONLY the category name, nothing else.`

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }]
    for (const img of images.slice(0, 2)) {
      const base64 = img.replace(/^data:image\/\w+;base64,/, '')
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } })
    }
    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 50 },
    }
    const res = await geminiRequest(
      `${GEMINI_BASE}/${getTextModel()}:generateContent?key=${apiKey}`,
      body,
    )
    if (!res.ok) return ''
    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const trimmed = text.trim()
    // 응답이 카테고리 정확 일치 / 부분 포함 여부 검증
    const matched = allowedCategories.find((c) => trimmed === c || trimmed.includes(c))
    return matched || ''
  } catch {
    return ''
  }
}

/**
 * 사은품 이미지 → 담백한 사은품 안내 문구 생성 (vision)
 *
 * 톤: 과장 X, 담백하게. "어떤 물품인지" 확인 + 간단 설명 + "증정" 강조.
 * 예) "구매 시 GG 패턴 버킷햇을 함께 드립니다. 데일리 코디에 포인트로 활용하기 좋습니다."
 *
 * 주의: gemini-2.5-flash는 thinking 토큰을 기본 사용 → maxOutputTokens가 작으면
 *      추론에 다 쓰이고 본문이 잘림. thinkingBudget: 0 으로 끄고 토큰도 넉넉히.
 */
export async function describeGiftImage(image: string, productName?: string): Promise<string> {
  const apiKey = getApiKey()
  const productLine = productName?.trim()
    ? `참고: 이 사은품은 "${productName.trim()}" 상품 구매 시 증정합니다. (사은품 자체를 설명하되, 자연스러우면 어떤 상품 구매 시 주는지 언급해도 좋음)`
    : ''

  const prompt = `이미지는 상품 구매 시 함께 증정하는 "사은품"입니다.
사은품이 무엇인지 구체적으로 파악하고(브랜드/패턴/형태 등 보이는 특징 포함), 상세페이지에 넣을 담백한 안내 문구를 완성된 문장으로 작성하세요.
${productLine}

규칙:
- 정확히 2문장. 총 50~80자. 과장/감탄사 없이 담백하게.
- 첫 문장: 무엇을 증정하는지 — "구매 시 OOO를 함께 드립니다." 형태로 끝까지 완성.
- 둘째 문장: 사은품의 용도/활용 팁 한 줄, 끝까지 완성.
- 문장은 반드시 마침표로 끝맺을 것 (중간에 끊지 말 것).
- 가격/한정수량 등 임의 정보 지어내지 말 것. 보이는 것만.
- JSON·따옴표·머리말 없이 안내 문구 텍스트만 출력.`

  const base64 = image.replace(/^data:image\/\w+;base64,/, '')
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64 } }],
      },
    ],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 400,
      // thinking 끄기 — 짧은 카피라 추론 불필요. 안 끄면 토큰이 추론에 소진돼 본문 잘림.
      thinkingConfig: { thinkingBudget: 0 },
    },
  }
  const res = await geminiRequest(
    `${GEMINI_BASE}/${getTextModel()}:generateContent?key=${apiKey}`,
    body,
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`사은품 설명 생성 오류: ${res.status} ${err}`)
  }
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts || []
  const text: string = parts.map((p: { text?: string }) => p.text || '').join('').trim()
  const cleaned = text.replace(/^["']|["']$/g, '').trim()
  if (!cleaned) throw new Error('사은품 설명 생성에 실패했습니다.')
  return cleaned
}

export async function generateModelImage(
  req: AIModelImageRequest,
): Promise<string> {
  // 제품만 모드 — 사람 없이 정면 히어로 제품컷 (각도컷 파이프라인 재사용)
  if (req.subject === 'product') {
    return generateAngleShot({ productName: req.productName, images: req.images }, ANGLE_VARIANTS[0])
  }

  const apiKey = getApiKey()
  let focus = getCameraFocus(req.category, req.productName)

  // 연령대별 모델 묘사 — 아동/유아는 카탈로그풍 + 건전성 명시 (Gemini 안전필터 대응)
  const age = req.age || 'adult'
  const genderKo = req.gender === 'male' ? '남성' : '여성'
  const subjectDesc =
    age === 'baby'
      ? `Korean toddler (baby ${req.gender === 'male' ? 'boy' : 'girl'}, around 1-3 years old)`
      : age === 'child'
        ? `Korean ${req.gender === 'male' ? 'boy' : 'girl'} child model (elementary school age, around 6-9 years old)`
        : `Korean ${req.gender} model`
  const styleDesc =
    age === 'baby'
      ? `- Korean toddler, cute and natural (sitting or standing), cheerful expression
- Fully clothed, wholesome family-friendly baby clothing catalog photo
- Reference quality: department store baby/kids catalog photography`
      : age === 'child'
        ? `- Korean child (${genderKo === '남성' ? '남자아이' : '여자아이'}), bright cheerful natural pose facing the camera
- Fully clothed, wholesome family-friendly kids clothing catalog photo
- Reference quality: department store kids catalog photography`
        : `- Korean ${genderKo}, natural confident pose facing the camera straight on
- Reference quality: Olive Young / Musinsa / Zara product photography`

  // 디폴트 결과로 떨어졌으면 (= 카테고리 + 상품명 모두 단서 약함)
  // 이미지에서 직접 제품 타입 추론 → 더 정확한 framing 적용
  const isDefaultFraming = focus.crop === '전신' && focus.shot === '풀샷' && !req.category
  if (isDefaultFraming && req.images.length > 0) {
    const detected = await detectProductCategoryFromImages(req.images)
    if (detected) {
      focus = getCameraFocus(detected, req.productName)
    }
  }

  // Gemini Image는 첫 문장의 framing 지시를 가장 강하게 따름.
  // "Generate a photo..." 같은 일반 도입부를 쓰면 모델 기본값(full body)으로 흐름.
  // → 첫 문장 = 명시적 프레임 지시 + 영문 표준 촬영 용어
  const prompt = `Photograph: ${focus.leadFraming}.

Subject: a ${subjectDesc} ${focus.action} "${req.productName}" (the product shown in the reference images).

COMPOSITION (CRITICAL):
- The model/subject MUST be perfectly centered in the frame, both horizontally and vertically.
- Symmetric framing — equal negative space on left and right sides.
- Do NOT use rule-of-thirds offset; the subject sits dead-center.

CROP RULES (must obey):
- Shot type: ${focus.shot}
- Visible area: ${focus.crop} ONLY
- The frame must crop at the boundary above. Any body part outside this range MUST NOT appear in the image.
${focus.extraInstruction ? `- Extra: ${focus.extraInstruction}` : ''}

Style:
${styleDesc}
- Background: clean white or light gray studio sweep, uniform
- Lighting: soft professional studio, gentle shadows

CRITICAL:
- The product is the unmistakable focal point of the frame.
- This is a tightly-framed product shot, NOT a fashion lookbook full-body shot (unless the crop rule explicitly says full body).
- No text, watermark, logo, or AI artifacts.
- Must look like a real photograph taken on set, not AI-generated.`

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }]

  for (const img of req.images.slice(0, 5)) {
    const base64 = img.replace(/^data:image\/\w+;base64,/, '')
    parts.push({
      inlineData: { mimeType: 'image/jpeg', data: base64 },
    })
  }

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  }

  const res = await geminiRequest(
    `${GEMINI_BASE}/${getImageModel()}:generateContent?key=${apiKey}`,
    body,
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini Image API 오류: ${res.status} ${err}`)
  }

  const data = await res.json()
  const responseParts = data.candidates?.[0]?.content?.parts || []
  const imagePart = responseParts.find(
    (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith('image/'),
  )

  if (!imagePart?.inlineData) {
    const { reason } = extractGeminiImageFailureReason(data)
    console.error(`[model-shot] no image returned:`, reason)
    throw new Error(`AI 모델 이미지 실패: ${reason}`)
  }

  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
}

/* ────────────────────────────────────────────────────────────
 * AI 이미지 풀세트 — 모델 시착 컷 1장 + 다양한 각도 제품 컷 N-1장
 *
 * 흐름:
 *   1. 첫 장: generateModelImage 재사용 (카테고리별 framing 자동)
 *   2. 나머지: 정면/3-4/측면/뒷면/탑다운/디테일 각도 순환
 *   3. 병렬 호출 — 전체 latency ≈ 단일 이미지 생성과 비슷
 * ──────────────────────────────────────────────────────────── */

// "EXACT SAME product" 강하게 박으면 Gemini가 reference에 없는 각도(예: 모자 뒷면)는
// 만들지 못하고 safety/empty로 빠짐. 살짝 완화해서 "based on the product in the references" 톤으로.
const ANGLE_VARIANTS = [
  {
    label: 'front',
    framing: 'A studio product photograph of the product shown in the reference images, captured from the FRONT VIEW (centered, eye level). Pure product shot — NO model, NO hands. White or light gray studio background.',
  },
  {
    label: 'three-quarter',
    framing: 'A studio product photograph of the product shown in the reference images, captured from a THREE-QUARTER ANGLE (about 45 degrees, slight rotation showing depth). Pure product shot — NO model. White or light gray studio background.',
  },
  {
    label: 'side',
    framing: 'A studio product photograph of the product shown in the reference images, captured from the SIDE PROFILE. Pure product shot — NO model. White or light gray studio background.',
  },
  {
    label: 'back',
    framing: 'A studio product photograph showing the BACK SIDE of the product from the reference images. Imagine and render the back of this product consistent with the front shown. Pure product shot — NO model. White or light gray studio background.',
  },
  {
    label: 'top-down',
    framing: 'A flat-lay TOP-DOWN photograph of the product from the reference images, neatly arranged on a clean light gray or beige surface. Pure product shot — NO model.',
  },
  {
    label: 'macro-detail',
    framing: 'A macro close-up photograph showing the texture, material, and fine details of the product from the reference images. Sharp focused detail of the surface and craftsmanship. NO model, NO human skin in frame.',
  },
]

/**
 * Gemini Image 응답에서 차단/실패 사유 추출 + 사람이 읽을 수 있는 메시지로 변환
 * — 응답이 HTTP 200이지만 image 파트 없는 경우 호출 (safety 차단 / finishReason 비정상 등)
 */
function extractGeminiImageFailureReason(data: unknown): {
  reason: string
  isDeterministic: boolean // safety 등 재시도해도 동일한 결과 = true
} {
  type GeminiData = {
    candidates?: Array<{
      finishReason?: string
      safetyRatings?: unknown
      content?: { parts?: Array<{ text?: string }> }
    }>
    promptFeedback?: { blockReason?: string }
  }
  const d = data as GeminiData
  const finish = d.candidates?.[0]?.finishReason
  const block = d.promptFeedback?.blockReason
  const textPart = d.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text

  const SAFETY_REASONS = ['SAFETY', 'IMAGE_SAFETY', 'PROHIBITED_CONTENT', 'RECITATION', 'BLOCKLIST']
  const isSafety = (s?: string) => !!s && SAFETY_REASONS.includes(s)
  const isDeterministic = isSafety(finish) || isSafety(block)

  const parts: string[] = []
  if (block) parts.push(`promptBlock=${block}`)
  if (finish) parts.push(`finish=${finish}`)
  if (textPart) parts.push(`note="${textPart.slice(0, 120)}"`)
  if (parts.length === 0) parts.push('empty-response')
  return { reason: parts.join(' / '), isDeterministic }
}

/**
 * 1회 재시도 헬퍼 — 일시 에러(rate limit / 5xx / 네트워크 흔들림) 흡수
 * 단 safety 차단(deterministic) 에러는 재시도 안 함 — 어차피 같은 결과
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  retries = 1,
  baseDelayMs = 1500,
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      // safety 차단 같은 deterministic 에러는 재시도 무의미
      const msg = err instanceof Error ? err.message : String(err)
      if (/SAFETY|PROHIBITED|RECITATION|BLOCKLIST|IMAGE_SAFETY/i.test(msg)) {
        console.warn(`[${label}] deterministic 차단, 재시도 스킵:`, msg)
        break
      }
      if (attempt < retries) {
        // 지수 백오프 + 약간의 jitter
        const delay = baseDelayMs * (attempt + 1) + Math.random() * 500
        console.warn(`[${label}] 실패, ${Math.round(delay)}ms 후 재시도:`, err)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastErr
}

/**
 * 제품 단독 각도 컷 1장 생성 (모델 없음)
 */
async function generateAngleShot(
  product: { productName: string; images: string[] },
  variant: (typeof ANGLE_VARIANTS)[number],
): Promise<string> {
  const apiKey = getApiKey()

  const prompt = `Photograph: ${variant.framing}

Product: "${product.productName}"

RULES:
- Preserve the product's color, material, branding, and overall design as shown in the references.
- When the reference doesn't show this exact angle (e.g. back view of a hat), render a plausible, consistent extrapolation — keep style/materials matching.
- COMPOSITION: product perfectly centered in the frame, symmetric framing, equal margins on left and right. No rule-of-thirds offset.
- NO model, NO human hands, NO clothing context.
- Clean isolated product shot, high-end e-commerce catalog quality.
- Soft professional studio lighting with subtle shadows.
- No added text, watermark, or logo overlay.
- Photograph realism, NOT illustration or 3D render.`

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ]
  for (const img of product.images.slice(0, 5)) {
    const base64 = img.replace(/^data:image\/\w+;base64,/, '')
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } })
  }

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  }

  const res = await geminiRequest(
    `${GEMINI_BASE}/${getImageModel()}:generateContent?key=${apiKey}`,
    body,
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`각도 컷 생성 실패 (${variant.label}): ${res.status} ${err}`)
  }
  const data = await res.json()
  const responseParts = data.candidates?.[0]?.content?.parts || []
  const imagePart = responseParts.find(
    (p: { inlineData?: { mimeType: string; data: string } }) =>
      p.inlineData?.mimeType?.startsWith('image/'),
  )
  if (!imagePart?.inlineData) {
    const { reason } = extractGeminiImageFailureReason(data)
    console.error(`[angle-${variant.label}] no image returned:`, reason)
    throw new Error(`각도 컷 실패 (${variant.label}): ${reason}`)
  }
  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
}

interface AIImageSetRequest extends AIModelImageRequest {
  /** 생성할 총 매수 (모델 시착 1장 + 각도 컷 N-1장) — 1~6 */
  count: number
}

/**
 * AI 이미지 풀세트 생성
 * - 첫 장: 모델 시착 컷 (카테고리 framing 자동)
 * - 나머지: 다양한 각도 제품 컷 (병렬)
 */
export async function generateImageSet(req: AIImageSetRequest): Promise<string[]> {
  const count = Math.min(6, Math.max(1, Math.floor(req.count || 1)))
  if (req.images.length < 2) {
    throw new Error('이미지 풀세트 생성은 원본 사진 2장 이상이 필요합니다.')
  }

  // 1) 모델 시착 컷 + 각도 컷들 — 동시 발사하면 Gemini Image의 RPM 한도에 걸려서
  //    한 장씩 실패가 잦음. 살짝 stagger (250ms 간격) + 각 호출에 1회 재시도로 흡수.
  //    제품만(subject=product) 모드면 모델 컷 없이 각도 컷만 count장.
  const productOnly = req.subject === 'product'
  const angleCount = productOnly ? count : count - 1
  const anglesToUse = ANGLE_VARIANTS.slice(0, angleCount)

  // RPM 한도 회피용 stagger — 0.6s 간격이면 6장 풀세트도 ~3.6s 안에 발사 (10 RPM 안전)
  const STAGGER_MS = 600
  const promises: Array<Promise<string>> = []
  // 모델 시착 컷 — 제품만 모드에선 스킵
  if (!productOnly) {
    promises.push(withRetry(() => generateModelImage(req), 'model-shot'))
  }
  // 각도 컷들 — stagger 두며 발사
  for (let i = 0; i < anglesToUse.length; i++) {
    const variant = anglesToUse[i]
    const idx = i + (productOnly ? 0 : 1)
    const delayed = (async () => {
      await new Promise((r) => setTimeout(r, idx * STAGGER_MS))
      return withRetry(
        () => generateAngleShot({ productName: req.productName, images: req.images }, variant),
        `angle-${variant.label}`,
      )
    })()
    promises.push(delayed)
  }

  // Promise.allSettled 로 부분 실패 허용 — 4장 요청했는데 1장 실패면 3장이라도 반환
  const results = await Promise.allSettled(promises)
  const images: string[] = []
  const errors: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      images.push(r.value)
    } else {
      const angleIdx = productOnly ? i : i - 1
      const label = !productOnly && i === 0 ? '모델 시착 컷' : anglesToUse[angleIdx].label
      errors.push(`${label}: ${r.reason?.message || r.reason}`)
    }
  })
  if (images.length === 0) {
    throw new Error(`이미지 세트 생성 전체 실패: ${errors.join('; ')}`)
  }
  return images
}

/* ────────────────────────────────────────────────────────────
 * AI 부분 재생성 — 단일 필드만 새로 뽑기
 *
 * 전체 재생성은 한 번에 모든 필드(상품명/메인카피/셀링포인트/...)를 다시 만들어서
 * 마음에 들던 필드도 같이 날아감. regenerateField 는 컨텍스트(기존 콘텐츠 전체)는
 * 참고용으로만 보내고 지정된 필드 한 개만 새로 뽑음.
 * ──────────────────────────────────────────────────────────── */

const FIELD_INSTRUCTIONS: Record<RegenField, { ko: string; ja?: string; en?: string }> = {
  product_name: {
    ko: '새로운 상품명 1개 (30자 이내, SEO 검색 키워드 자연스럽게 포함, 기존과 다른 표현)',
    ja: '새로운 상품명 1개 (30자 이내, 일본어 쇼핑 검색 키워드 포함, 기존과 다른 표현)',
    en: '새로운 상품 title 1개 (English, 80 chars 이내, eBay SEO 키워드 포함)',
  },
  subtitle: { ko: '새로운 부제 1개 (40자 이내, 상품명을 보완하는 한 줄)' },
  main_copy: {
    ko: '새로운 메인 카피 1개 (50자 이내, 임팩트 있게 한 줄로)',
    ja: '새로운 メインコピー 1개 (40자 이내, 임팩트 있게)',
    en: '새로운 main copy 1개 (under 80 chars, punchy one-liner)',
  },
  selling_points: {
    ko: '새로운 셀링포인트 3개 (각 30~50자, 다른 관점/혜택 강조)',
    ja: '새로운 셀링포인트 3개 (일본어, 각 30~50자)',
    en: '새로운 selling points 3개 (English, each 30~60 chars)',
  },
  description: {
    ko: '새로운 상품 핵심 설명 (1-2문장, 50자 내외, 임팩트 한 줄 요약 — 절대 문단 X)',
    ja: '새로운 상품 설명 1-2 sentences in Japanese (총 60자 내외)',
    en: '새로운 product description (1-2 sentences in English, ~100 chars)',
  },
  keywords: {
    ko: '새로운 검색 키워드 10-15개 배열 (#없이 단어만)',
    ja: '새로운 検索키워드 10-15개 (일본어, # 없이)',
    en: '새로운 search keywords 10-15개 (English, no #)',
  },
  caution: {
    ko: '새로운 주의사항/안내 1-2문장 (배송/세탁/유의사항 등)',
    ja: '새로운 注意事項 1-2 sentences in Japanese',
    en: '새로운 cautions/notes 1-2 sentences in English',
  },
}

function buildRegenPrompt(req: AIRegenRequest): string {
  const platformMeta = PLATFORM_META[req.platform as Platform]
  const lang = platformMeta?.lang ?? 'ko'
  const instr = FIELD_INSTRUCTIONS[req.field]
  const fieldInstruction =
    instr[lang as keyof typeof instr] || instr.ko

  // 기존 콘텐츠를 컨텍스트로 보냄 — 다른 필드 톤/단어 일관성 유지
  const c = req.currentContent
  const ctx = [
    `상품명: ${c.product_name || '없음'}`,
    `부제: ${c.subtitle || '없음'}`,
    `메인카피: ${c.main_copy || '없음'}`,
    `셀링포인트: ${c.selling_points?.join(' / ') || '없음'}`,
    `설명: ${c.description?.slice(0, 100) || '없음'}`,
  ].join('\n')

  return `당신은 한국 이커머스 카피라이터입니다.
기존 콘텐츠 톤/일관성을 유지하면서 한 필드만 새로 작성하세요.

【상품】
- 브랜드: ${req.brand || '없음'}
- 상품명: ${req.productName}
- 가격: ${req.price}
- 카테고리: ${req.category}
- 플랫폼: ${req.platform}

【기존 콘텐츠 (참고용 — 톤 유지)】
${ctx}

【작성할 필드】 ${req.field}
${fieldInstruction}

기존 표현은 사용하지 말고 다른 단어/구조로 변형하세요. 그러나 의미·강조점·톤은 일관되게.

JSON으로만 응답 (다른 텍스트 X):
${jsonExampleFor(req.field)}`
}

function jsonExampleFor(field: RegenField): string {
  switch (field) {
    case 'selling_points':
      return '{"selling_points": ["...", "...", "..."]}'
    case 'keywords':
      return '{"keywords": ["...", "...", ...]}'
    default:
      return `{"${field}": "..."}`
  }
}

export async function regenerateField(req: AIRegenRequest): Promise<Partial<GeneratedContent>> {
  const apiKey = getApiKey()
  const prompt = buildRegenPrompt(req)

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9, // 다양성 ↑ — 기존과 다른 표현 유도
      responseMimeType: 'application/json',
    },
  }

  const res = await geminiRequest(
    `${GEMINI_BASE}/${getTextModel()}:generateContent?key=${apiKey}`,
    body,
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI 재생성 오류: ${res.status} ${err}`)
  }
  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  const parsed = safeParseJSON(text) as Partial<GeneratedContent>
  return parsed
}
