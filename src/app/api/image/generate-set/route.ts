import { NextResponse } from 'next/server'
import { generateImageSet } from '@/services/ai.service'
import { requireAuth, refundOnFailure } from '@/lib/apiAuth'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { AIModelImageRequest } from '@/types/ai'

export const maxDuration = 60

/**
 * AI 이미지 풀세트 생성
 *
 * - 사용자가 N장 (1~6) 지정
 * - 1장: 모델 시착 컷 (generateModelImage 재사용)
 * - 나머지: 정면/3-4/측면/뒷면/탑다운/디테일 각도 컷 (병렬)
 * - 크레딧: image × N (예: 4장 = 20)
 *
 * 원본 사진은 reference로만 사용. 결과는 AI 이미지 N장.
 */
export async function POST(req: Request) {
  let body: AIModelImageRequest & { count?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const count = Math.min(6, Math.max(1, Math.floor(body.count || 4)))

  // 원본 2장 이상 검증
  if (!body.images || body.images.length < 2) {
    return NextResponse.json(
      { error: 'AI 풀세트 생성은 원본 사진 2장 이상이 필요합니다.' },
      { status: 400 },
    )
  }

  const { session, error } = await requireAuth('image', count)
  if (error) return error

  try {
    const images = await generateImageSet({ ...body, count })
    return NextResponse.json({ images, generated: images.length, requested: count })
  } catch (err) {
    console.error('AI 이미지 풀세트 오류:', err)
    if (session) {
      await refundOnFailure(session.user.id, 'image', session.user.email, count)
    }
    return NextResponse.json(
      { error: friendlyErrorMessage(err) },
      { status: 500 },
    )
  }
}
