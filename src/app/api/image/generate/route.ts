import { NextResponse } from 'next/server'
import { generateModelImage } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { authorizeAi, refundIfTrial } from '@/lib/aiGate'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { AIModelImageRequest } from '@/types/ai'

export const maxDuration = 60

export async function POST(req: Request) {
  let body: AIModelImageRequest
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }) }
  if (!body.productName && !body.category) {
    return NextResponse.json({ error: '상품명 또는 카테고리가 필요합니다.' }, { status: 400 })
  }

  const gate = await authorizeAi(req, 'image')
  if ('error' in gate) return gate.error

  return runWithKey(gate.auth.key, async () => {
    try {
      const image = await generateModelImage(body)
      return NextResponse.json({ image })
    } catch (err) {
      console.error('AI 모델 이미지 생성 오류:', err)
      await refundIfTrial(gate.auth)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
