import { NextResponse } from 'next/server'
import { generateAll } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { resolveUserKey } from '@/lib/routeKey'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { AIGenerateRequest } from '@/types/ai'

/**
 * 통합 AI 생성 (BYOK — 사용자 Gemini 키 사용)
 * 반환: GeneratedByLang (한국 { ko }, 큐텐 { ja, ko }, 이베이 { en, ko })
 */
export async function POST(req: Request) {
  const r = resolveUserKey(req)
  if ('error' in r) return r.error

  return runWithKey(r.key, async () => {
    try {
      const body = (await req.json()) as AIGenerateRequest & { coupangSuggestions?: string[] }
      if (!body.images || body.images.length === 0) {
        return NextResponse.json({ error: '상품 이미지가 필요합니다.' }, { status: 400 })
      }
      const result = await generateAll(body, body.coupangSuggestions || [])
      return NextResponse.json(result)
    } catch (err) {
      console.error('AI 통합 생성 오류:', err)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
