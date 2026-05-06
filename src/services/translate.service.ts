import type { GeneratedAll, TranslateRequest } from '@/types/ai'
import { PLATFORM_META } from '@/types/product'
import { buildCoupangRewritePrompt } from './prompts/coupang'
import { buildQoo10RewritePrompt } from './prompts/qoo10'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.')
  return key
}

function getTextModel(): string {
  return process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash'
}

/**
 * Gemini가 가끔 깨진 JSON을 반환함 — ai.service.ts의 safeParseJSON과 동일 로직
 * (모듈 분리 후 import 사이클 피하려고 복제)
 */
function safeParseJSON<T>(text: string): T {
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '')
  const startIdx = cleaned.search(/[\[{]/)
  const endIdx = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'))
  if (startIdx >= 0 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1)
  }
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')
  try {
    return JSON.parse(cleaned) as T
  } catch {
    cleaned = cleaned.replace(/"([^"]*?)"/g, (_match, inner: string) => {
      const escaped = inner
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
      return `"${escaped}"`
    })
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')
    try {
      return JSON.parse(cleaned) as T
    } catch (e) {
      console.error('JSON 파싱 최종 실패. 원본:', text.substring(0, 500))
      throw new Error(`JSON 파싱 실패: ${(e as Error).message}`)
    }
  }
}

async function geminiRequest(url: string, body: object): Promise<Response> {
  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.status !== 503 || attempt === MAX_RETRIES) return res
    await new Promise((r) => setTimeout(r, attempt * 2000))
  }
  throw new Error('Gemini API 재시도 실패')
}

/**
 * 콘텐츠 재작성 (단순 번역 X)
 * - ko → ja: 쿠팡 SEO 톤 → 큐텐 감성 무드 톤
 * - ja → ko: 큐텐 감성 무드 톤 → 쿠팡 SEO 톤
 *
 * 토큰 절약: 이미지 재첨부 없이 텍스트만 전송
 */
export async function translateContent(req: TranslateRequest): Promise<GeneratedAll> {
  if (req.fromLang === req.toLang) {
    return req.current  // 같은 언어면 그대로 반환
  }

  const targetMeta = PLATFORM_META[req.targetPlatform]
  const isToJa = req.toLang === 'ja' || targetMeta?.market === 'jp'

  const prompt = isToJa
    ? buildQoo10RewritePrompt(req.current)
    : buildCoupangRewritePrompt(req.current)

  const apiKey = getApiKey()
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 8192,
    },
  }

  const res = await geminiRequest(
    `${GEMINI_BASE}/${getTextModel()}:generateContent?key=${apiKey}`,
    body,
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini 번역 API 오류: ${res.status} ${err}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini 번역 응답에서 텍스트를 찾을 수 없습니다.')

  return safeParseJSON<GeneratedAll>(text)
}
