import { NextResponse } from 'next/server'
import { generateImageSet } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { resolveUserKey } from '@/lib/routeKey'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { AIModelImageRequest } from '@/types/ai'

export const maxDuration = 60

/**
 * AI 이미지 풀세트 (BYOK) — 모델 시착 1장 + 각도 컷 N-1장
 */
export async function POST(req: Request) {
  const r = resolveUserKey(req)
  if ('error' in r) return r.error

  return runWithKey(r.key, async () => {
    let body: AIModelImageRequest & { count?: number }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
    }

    const count = Math.min(6, Math.max(1, Math.floor(body.count || 4)))
    if (!body.images || body.images.length < 2) {
      return NextResponse.json(
        { error: 'AI 풀세트 생성은 원본 사진 2장 이상이 필요합니다.' },
        { status: 400 },
      )
    }

    try {
      const images = await generateImageSet({ ...body, count })
      return NextResponse.json({ images, generated: images.length, requested: count })
    } catch (err) {
      console.error('AI 이미지 풀세트 오류:', err)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
