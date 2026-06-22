import { NextResponse } from 'next/server'
import { regenerateField } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { authorizeAi, refundIfTrial } from '@/lib/aiGate'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { AIRegenRequest, RegenField } from '@/types/ai'

const ALLOWED_FIELDS: RegenField[] = [
  'product_name', 'subtitle', 'main_copy', 'selling_points', 'description', 'keywords', 'caution',
]

export async function POST(req: Request) {
  let body: AIRegenRequest
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }) }
  if (!body.field || !ALLOWED_FIELDS.includes(body.field)) {
    return NextResponse.json({ error: '재생성 가능한 필드가 아닙니다.' }, { status: 400 })
  }
  if (!body.currentContent) {
    return NextResponse.json({ error: '기존 콘텐츠가 필요합니다.' }, { status: 400 })
  }

  const gate = await authorizeAi(req, 'regen')
  if ('error' in gate) return gate.error

  return runWithKey(gate.auth.key, async () => {
    try {
      return NextResponse.json(await regenerateField(body))
    } catch (err) {
      console.error('AI 부분 재생성 오류:', err)
      await refundIfTrial(gate.auth)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
