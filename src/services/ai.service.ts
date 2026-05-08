import Replicate from 'replicate'
import type {
  AIGenerateRequest,
  AITitleRequest,
  AITagRequest,
  AIModelImageRequest,
  GeneratedContent,
  GeneratedTitle,
  GeneratedAll,
  GeneratedByLang,
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
  const isJpMarket = PLATFORM_META[platform]?.market === 'jp'

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
      : '이 상품 이미지를 분석하고 상세페이지 콘텐츠, 최적화 상품명 5개, 검색 태그 20개를 한번에 생성해주세요.',
  })

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      // 양 언어 동시 생성하려면 토큰 한도 상향
      maxOutputTokens: isJpMarket ? 16384 : 8192,
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

  if (isJpMarket) {
    // 큐텐 — 바이링구얼 응답 { ja: {...}, ko: {...} }
    const parsed = safeParseJSON<{ ja?: GeneratedAll; ko?: GeneratedAll }>(text)
    const result: GeneratedByLang = {}
    if (parsed.ja) result.ja = parsed.ja
    if (parsed.ko) result.ko = parsed.ko
    if (!result.ja && !result.ko) {
      throw new Error('큐텐 응답에서 ja/ko 어느 언어도 추출하지 못했습니다.')
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

function getCameraFocus(
  category: string,
  productName: string,
): { part: string; shot: string; crop: string } {
  const name = (productName || '').toLowerCase()

  const earringPattern = /귀걸이|이어링|earring/
  const necklacePattern = /목걸이|넥클리스|necklace|펜던트/
  const braceletPattern = /팔찌|브레이슬릿|bracelet|뱅글/
  const ringPattern = /반지|링|ring/
  const glassesPattern = /안경|선글라스|glasses|sunglasses/
  const beltPattern = /벨트|belt/
  const sockPattern = /양말|sock/
  const bagPattern = /가방|백|bag|clutch|tote|숄더백|크로스백|토트/
  const hatPattern = /모자|hat|cap|beanie|버킷햇/
  const shoePattern = /신발|구두|운동화|슈즈|shoe|sneaker|boot|샌들/
  const scarfPattern = /스카프|머플러|scarf|muffler/

  if (earringPattern.test(name))
    return { part: '귀 주변', shot: '클로즈업', crop: '얼굴 측면 포커스' }
  if (necklacePattern.test(name))
    return { part: '목/쇄골', shot: '미디엄 클로즈업', crop: '상반신 상부' }
  if (braceletPattern.test(name))
    return { part: '손목', shot: '클로즈업', crop: '손목~손 포커스' }
  if (ringPattern.test(name))
    return { part: '손가락', shot: '매크로', crop: '손 클로즈업' }
  if (glassesPattern.test(name))
    return { part: '얼굴', shot: '미디엄', crop: '얼굴 정면' }
  if (beltPattern.test(name))
    return { part: '허리', shot: '미디엄', crop: '상반신~허리' }
  if (sockPattern.test(name))
    return { part: '발목~발', shot: '미디엄', crop: '하반신 하부' }
  if (bagPattern.test(name))
    return { part: '어깨/손', shot: '미디엄', crop: '상반신 + 가방 강조' }
  if (hatPattern.test(name))
    return { part: '머리', shot: '미디엄', crop: '상반신 상부' }
  if (shoePattern.test(name))
    return { part: '발', shot: '미디엄 로우앵글', crop: '하반신' }
  if (scarfPattern.test(name))
    return { part: '목/어깨', shot: '미디엄', crop: '상반신' }

  const catLower = (category || '').toLowerCase()
  if (/상의|티셔츠|셔츠|블라우스|니트|탑/.test(catLower))
    return { part: '상체', shot: '미디엄', crop: '상반신' }
  if (/하의|팬츠|바지|스커트|치마/.test(catLower))
    return { part: '하체', shot: '미디엄', crop: '전신 하반신 강조' }
  if (/원피스|드레스/.test(catLower))
    return { part: '전신', shot: '풀샷', crop: '전신' }
  if (/아우터|자켓|코트/.test(catLower))
    return { part: '전신', shot: '풀샷', crop: '전신' }

  return { part: '전신', shot: '풀샷', crop: '전신' }
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

export async function generateModelImage(
  req: AIModelImageRequest,
): Promise<string> {
  const apiKey = getApiKey()
  const focus = getCameraFocus(req.category, req.productName)
  const genderKo = req.gender === 'male' ? '남성' : '여성'

  const prompt = `Generate a photorealistic studio photograph of a Korean ${req.gender} model wearing/using "${req.productName}".

Camera: ${focus.shot} shot focusing on ${focus.part}
Crop: ${focus.crop}
Model: Korean ${genderKo}, natural pose, editorial style
Background: clean white or light gray studio
Lighting: professional studio, soft shadows
Style: high-end fashion e-commerce product photo

The product must be the clear focal point. No text, watermark, or logo.
Must look like a real photograph, not AI-generated.`

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
