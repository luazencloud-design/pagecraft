import { NextResponse } from 'next/server'
import { generateModelImage } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { resolveUserKey } from '@/lib/routeKey'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { AIModelImageRequest } from '@/types/ai'

export const maxDuration = 60

/** AI 모델 시착 이미지 1장 (BYOK) */
export async function POST(req: Request) {
  const r = resolveUserKey(req)
  if ('error' in r) return r.error

  return runWithKey(r.key, async () => {
    try {
      const body = (await req.json()) as AIModelImageRequest
      if (!body.productName && !body.category) {
        return NextResponse.json({ error: '상품명 또는 카테고리가 필요합니다.' }, { status: 400 })
      }
      const image = await generateModelImage(body)
      return NextResponse.json({ image })
    } catch (err) {
      console.error('AI 모델 이미지 생성 오류:', err)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
