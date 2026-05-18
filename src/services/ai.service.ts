import Replicate from 'replicate'
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
import type { Platform } from '@/types/product'
import { PLATFORM_META } from '@/types/product'
import { buildCoupangSystemPrompt, buildCoupangTitlePrompt, buildCoupangTagPrompt } from './prompts/coupang'
import { buildQoo10SystemPrompt } from './prompts/qoo10'
import { buildEbaySystemPrompt } from './prompts/ebay'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Replicate 클라이언트 싱글톤 (서버리스 cold-start 대응)
let replicateClient: Replicate | null = null
function getReplicate(): Replicate {
  if (replicateClient) return replicateClient
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) throw new Error('REPLICATE_API_TOKEN 환경변수가 설정되지 않았습니다.')
  replicateClient = new Replicate({ auth: token })
  return replicateClient
}

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
 * Gemini API fetch with auto-retry (503 대응)
 * 최대 3회 재시도, 간격 2초/4초
 */
async function geminiRequest(url: string, body: object): Promise<Response> {
  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.status !== 503 || attempt === MAX_RETRIES) return res
    // 503이면 재시도 전 대기
    await new Promise((r) => setTimeout(r, attempt * 2000))
  }
  // unreachable but TS needs it
  throw new Error('Gemini API 재시도 실패')
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.')
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
  }

  const byExactCategory: Record<string, CameraFocus> = {
    // 의류·잡화
    '패딩/점퍼': { leadFraming: F.midToKnee, part: '상반신~허벅지', shot: '미디엄', crop: '머리~무릎', action: 'wearing', extraInstruction: '겉옷 핏 강조. 무릎 아래 자르기.' },
    '집업/후리스': { leadFraming: F.upperBody, part: '상반신', shot: '미디엄', crop: '머리~허리', action: 'wearing', extraInstruction: '허리 아래 보이지 않게 잘라야 합니다.' },
    '티셔츠/맨투맨': { leadFraming: F.upperBody, part: '상반신', shot: '미디엄', crop: '머리~허리', action: 'wearing', extraInstruction: '허리 아래 보이지 않게 잘라야 합니다.' },
    '바지/하의': { leadFraming: F.lowerBody, part: '하반신', shot: '미디엄', crop: '허리~발', action: 'wearing', extraInstruction: '하체만. 얼굴 X.' },
    '가방/배낭': { leadFraming: F.bagShot, part: '어깨/손/등', shot: '미디엄', crop: '상반신 + 가방', action: 'carrying', extraInstruction: '가방 강조, 다리 아래 X.' },
    '모자/액세서리': { leadFraming: F.hatHead, part: '머리/얼굴 상부', shot: '미디엄 클로즈업', crop: '머리~어깨', action: 'wearing on head', extraInstruction: '얼굴+모자 중심. 어깨 아래 절대 X.' },
    '신발/부츠': { leadFraming: F.feet, part: '발', shot: '미디엄 로우앵글', crop: '무릎~발끝', action: 'wearing', extraInstruction: '신발 강조.' },
    '슬리퍼/샌들': { leadFraming: F.feet, part: '발', shot: '미디엄 로우앵글', crop: '무릎~발끝', action: 'wearing', extraInstruction: '슬리퍼/샌들 + 발 강조.' },
    '스카프/머플러': { leadFraming: F.chestUp, part: '목/어깨', shot: '미디엄 클로즈업', crop: '얼굴 하부~가슴', action: 'wearing around neck', extraInstruction: '스카프 두른 모습. 허리 아래 X.' },
    '기타 의류/잡화': { leadFraming: F.fullBody, part: '전신', shot: '풀샷', crop: '전신', action: 'wearing/using' },

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
  if (shoePattern.test(name)) return { leadFraming: FN.feet, part: '발', shot: '미디엄 로우앵글', crop: '무릎~발끝', action: 'wearing', extraInstruction: '신발 강조.' }
  if (slipperPattern.test(name)) return { leadFraming: FN.feet, part: '발', shot: '미디엄 로우앵글', crop: '무릎~발끝', action: 'wearing', extraInstruction: '슬리퍼/샌들 강조.' }
  if (scarfPattern.test(name)) return { leadFraming: FN.chestUp, part: '목/어깨', shot: '미디엄 클로즈업', crop: '얼굴 하부~가슴', action: 'wearing around neck', extraInstruction: '스카프 두른 모습. 허리 아래 X.' }
  if (bagPattern.test(name)) return { leadFraming: FN.bagShot, part: '어깨/손/등', shot: '미디엄', crop: '상반신+가방', action: 'carrying', extraInstruction: '가방 강조, 다리 아래 X.' }
  if (pantsPattern.test(name)) return { leadFraming: 'a low-angle medium shot of the lower body from waist to feet (NO face visible)', part: '하체', shot: '미디엄', crop: '허리~발', action: 'wearing', extraInstruction: '하체 강조.' }
  if (topPattern.test(name)) return { leadFraming: FN.upperBody, part: '상반신', shot: '미디엄', crop: '머리~허리', action: 'wearing', extraInstruction: '상반신만. 하체 X.' }
  if (dressPattern.test(name)) return { leadFraming: 'a full-body fashion shot from head to feet', part: '전신', shot: '풀샷', crop: '전신', action: 'wearing' }
  if (outerPattern.test(name)) return { leadFraming: 'a medium-long shot from head to knees (cropped at knees)', part: '상반신~허벅지', shot: '미디엄~풀샷', crop: '머리~무릎', action: 'wearing', extraInstruction: '아우터 핏 강조.' }

  // ── 3) 카테고리 부분 매칭 (legacy / 자유 입력 대응) ──────────────────
  const catLower = (category || '').toLowerCase()
  if (/상의|티셔츠|셔츠|블라우스|니트|탑/.test(catLower))
    return { leadFraming: 'a medium shot showing only the upper body from head to waist (NO legs visible)', part: '상체', shot: '미디엄', crop: '머리~허리', action: 'wearing', extraInstruction: '상반신만. 하체 X.' }
  if (/하의|팬츠|바지|스커트|치마/.test(catLower))
    return { leadFraming: 'a low-angle medium shot of the lower body from waist to feet (NO face visible)', part: '하체', shot: '미디엄', crop: '허리~발', action: 'wearing', extraInstruction: '하체 강조.' }
  if (/원피스|드레스/.test(catLower))
    return { leadFraming: 'a full-body fashion shot from head to feet', part: '전신', shot: '풀샷', crop: '전신', action: 'wearing' }
  if (/아우터|자켓|코트/.test(catLower))
    return { leadFraming: 'a medium-long shot from head to knees (cropped at knees)', part: '상반신~허벅지', shot: '미디엄', crop: '머리~무릎', action: 'wearing', extraInstruction: '아우터 핏 강조.' }
  if (/스킨|토너|세럼|크림|로션|마스크|선크림|클렌징|메이크업|화장품|뷰티/.test(catLower))
    return { leadFraming: 'an extreme close-up of the face only (cropped at the neck, NO body visible)', part: '얼굴', shot: '클로즈업', crop: '얼굴만', action: 'with the beauty product applied', extraInstruction: '얼굴 중심.' }

  // ── 4) 디폴트 ─────────────────────────────────────────────────────
  return { leadFraming: 'a full-body fashion shot from head to feet', part: '전신', shot: '풀샷', crop: '전신', action: 'wearing/using' }
}

/**
 * Recraft 배경 제거 (via Replicate)
 * - 모델: recraft-ai/recraft-remove-background
 * - 입력: 256~4096px, max 5MB (PNG/JPG/WEBP). data URL 직접 전달 OK
 * - 출력: 완전 투명 PNG (alpha channel) — 상세페이지 흰 배경에 자연스럽게 올려짐
 * - 비용: $0.01/호출 (Gemini $0.04 대비 약 75% 절감)
 * - 처리 시간: 평균 3~10초 → maxDuration=60 안전
 * - 429 재시도: Replicate 신규 계정 burst=1 제한 또는 일시적 throttle 흡수
 */
export async function removeBackgroundRecraft(imageDataUrl: string): Promise<string> {
  const replicate = getReplicate()

  // 429 재시도 루프 — retry-after 헤더 존중, 최대 3회
  const MAX_RETRIES = 3
  let output: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      output = await replicate.run(
        'recraft-ai/recraft-remove-background',
        { input: { image: imageDataUrl } },
      )
      break
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const isRateLimit = status === 429
      if (!isRateLimit || attempt === MAX_RETRIES) throw err

      // retry-after 헤더 읽어서 해당 초 + 1초 여유 후 재시도
      const headers = (err as { response?: { headers?: Headers } })?.response?.headers
      const retryAfterRaw = headers?.get?.('retry-after')
      const retryAfterSec = retryAfterRaw ? Number(retryAfterRaw) : 6
      const waitMs = (Number.isFinite(retryAfterSec) ? retryAfterSec : 6) * 1000 + 1000
      console.warn(`[Recraft] 429 throttle → ${waitMs}ms 후 재시도 (${attempt + 1}/${MAX_RETRIES})`)
      await new Promise((r) => setTimeout(r, waitMs))
    }
  }

  if (output === undefined) {
    throw new Error('Recraft 응답을 받지 못했습니다.')
  }

  // SDK 버전에 따라 결과가 FileOutput 객체 / 문자열 / 배열일 수 있음 — 방어적 처리
  let resultUrl: string
  if (typeof output === 'string') {
    resultUrl = output
  } else if (Array.isArray(output) && typeof output[0] === 'string') {
    resultUrl = output[0]
  } else if (output && typeof output === 'object' && 'url' in output) {
    const urlFn = (output as { url: () => URL | string }).url
    const urlValue = urlFn.call(output)
    resultUrl = typeof urlValue === 'string' ? urlValue : urlValue.toString()
  } else {
    throw new Error('Recraft 응답 형식을 인식하지 못했습니다.')
  }

  // 결과 URL → 서버 fetch → base64 변환
  // 이유: (1) 기존 클라 API 계약 유지 (2) CORS 우회 (3) 서버→Replicate 단일 네트워크 경로
  const imageRes = await fetch(resultUrl)
  if (!imageRes.ok) {
    throw new Error(`Recraft 결과 이미지 다운로드 실패: ${imageRes.status}`)
  }
  const buffer = await imageRes.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  return `data:image/png;base64,${base64}`
}

/* ============================================================================
 * [보류] Gemini 기반 배경 제거 — 향후 재활용 가능성으로 주석 보존
 * ----------------------------------------------------------------------------
 * 전환 사유:
 *   - 품질: Gemini는 "생성" 모델이라 상품 pose/개수 변형되는 경우 존재
 *   - 비용: Gemini 약 $0.04/건 vs Recraft $0.01/건 (75% 절감)
 *   - 출력: Gemini는 흰색 근사 배경 → whitenNearWhite 후처리 필요.
 *           Recraft는 진짜 픽셀 마스크 기반 투명 PNG → 후처리 불필요
 * 복귀 조건:
 *   - Replicate/Recraft 장애 또는 정책 변경
 *   - Gemini가 pro 플랜에서 별도 배경제거 전용 모델 지원 시
 * ============================================================================
 *
 * export async function removeBackgroundGemini(imageDataUrl: string): Promise<string> {
 *   const apiKey = getApiKey()
 *   const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '')
 *
 *   const prompt = `TASK: Replace the ENTIRE background of this image with a solid pure white color (#FFFFFF, RGB 255,255,255). Keep the product(s) identical to the original.
 *
 * OUTPUT BACKGROUND MUST BE: Plain white only. No table, no floor, no wall, no shelves, no store, no furniture, no other products in background, no gradients, no textures, no shadows on ground. Just solid white everywhere except the product.
 *
 * PRODUCT PRESERVATION:
 * - Keep ALL products visible in original image. If 2 shoes, output 2 shoes. If 3 items, output 3 items.
 * - Keep their exact pose, angle, position, proportions, colors, logos, and textures identical to original.
 * - Do not move, rotate, or reorient anything.
 *
 * WHAT TO REMOVE:
 * - All background scenery (store, shelves, tables, floors, walls)
 * - All supporting objects (boxes the product sits on, stands, pedestals, hands, mannequins)
 * - Shadows cast on the ground
 * - Any text, labels, or tags not on the product itself
 *
 * Final result: exact same product(s) in same position, floating on pure solid white (#FFFFFF). Absolutely no other visual elements in the background.`
 *
 *   const body = {
 *     contents: [{
 *       role: 'user',
 *       parts: [
 *         { text: prompt },
 *         { inlineData: { mimeType: 'image/jpeg', data: base64 } },
 *       ],
 *     }],
 *     generationConfig: {
 *       responseModalities: ['IMAGE', 'TEXT'],
 *     },
 *   }
 *
 *   const res = await geminiRequest(
 *     `${GEMINI_BASE}/${getImageModel()}:generateContent?key=${apiKey}`,
 *     body,
 *   )
 *
 *   if (!res.ok) {
 *     const err = await res.text()
 *     throw new Error(`Gemini 배경제거 오류: ${res.status} ${err}`)
 *   }
 *
 *   const data = await res.json()
 *   const responseParts = data.candidates?.[0]?.content?.parts || []
 *   const imagePart = responseParts.find(
 *     (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith('image/'),
 *   )
 *
 *   if (!imagePart?.inlineData) {
 *     throw new Error('배경 제거에 실패했습니다.')
 *   }
 *
 *   return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
 * }
 */

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

export async function generateModelImage(
  req: AIModelImageRequest,
): Promise<string> {
  const apiKey = getApiKey()
  let focus = getCameraFocus(req.category, req.productName)
  const genderKo = req.gender === 'male' ? '남성' : '여성'

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

Subject: a Korean ${req.gender} model ${focus.action} "${req.productName}" (the product shown in the reference images).

CROP RULES (must obey):
- Shot type: ${focus.shot}
- Visible area: ${focus.crop} ONLY
- The frame must crop at the boundary above. Any body part outside this range MUST NOT appear in the image.
${focus.extraInstruction ? `- Extra: ${focus.extraInstruction}` : ''}

Style:
- Korean ${genderKo}, natural confident pose, editorial e-commerce vibe
- Background: clean white or light gray studio sweep
- Lighting: soft professional studio, gentle shadows
- Reference quality: Olive Young / Musinsa / Zara product photography

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
    throw new Error('AI 모델 이미지 생성에 실패했습니다.')
  }

  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
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
