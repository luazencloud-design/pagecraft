import { NextResponse } from 'next/server'
import { generateImageSet } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { authorizeAi, refundIfTrial } from '@/lib/aiGate'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { AIModelImageRequest } from '@/types/ai'

export const maxDuration = 60

/** AI 이미지 풀세트 — 모델 1장 + 각도 N-1장. 크레딧 image × count */
export async function POST(req: Request) {
  let body: AIModelImageRequest & { count?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }) }
  const count = Math.min(6, Math.max(1, Math.floor(body.count || 4)))
  if (!body.images || body.images.length < 2) {
    return NextResponse.json({ error: 'AI 풀세트 생성은 원본 사진 2장 이상이 필요합니다.' }, { status: 400 })
  }

  const gate = await authorizeAi(req, 'image', count)
  if ('error' in gate) return gate.error

  return runWithKey(gate.auth.key, async () => {
    try {
      const images = await generateImageSet({ ...body, count })
      // 부분 실패분 환불 (trial만) — 4 요청 → 3 성공이면 1장분 환불
      const failed = count - images.length
      if (failed > 0) await refundIfTrial(gate.auth, failed)
      return NextResponse.json({ images, generated: images.length, requested: count })
    } catch (err) {
      console.error('AI 이미지 풀세트 오류:', err)
      await refundIfTrial(gate.auth) // 전액 환불
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
