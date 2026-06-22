import { NextResponse } from 'next/server'
import { generateAll } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { authorizeAi, refundIfTrial } from '@/lib/aiGate'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { AIGenerateRequest } from '@/types/ai'

/** 통합 AI 생성 — BYOK 또는 무료 체험 크레딧 */
export async function POST(req: Request) {
  let body: AIGenerateRequest & { coupangSuggestions?: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }) }
  if (!body.images || body.images.length === 0) {
    return NextResponse.json({ error: '상품 이미지가 필요합니다.' }, { status: 400 })
  }

  const gate = await authorizeAi(req, 'generate')
  if ('error' in gate) return gate.error

  return runWithKey(gate.auth.key, async () => {
    try {
      const result = await generateAll(body, body.coupangSuggestions || [])
      return NextResponse.json(result)
    } catch (err) {
      console.error('AI 통합 생성 오류:', err)
      await refundIfTrial(gate.auth)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
