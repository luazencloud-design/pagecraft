import { NextResponse } from 'next/server'
import { describeGiftImage } from '@/services/ai.service'
import { requireAuth, refundOnFailure } from '@/lib/apiAuth'
import { friendlyErrorMessage } from '@/lib/errorMessage'

/**
 * 사은품 설명 생성 — 사은품 이미지 1장을 vision으로 인식해 담백한 안내 문구 반환
 * 크레딧: gift (1개)
 */
export async function POST(req: Request) {
  let body: { image?: string; productName?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  if (!body.image || !body.image.startsWith('data:')) {
    return NextResponse.json({ error: '사은품 이미지가 필요합니다.' }, { status: 400 })
  }

  const { session, error } = await requireAuth('gift')
  if (error) return error

  try {
    const description = await describeGiftImage(body.image, body.productName)
    return NextResponse.json({ description })
  } catch (err) {
    console.error('사은품 설명 생성 오류:', err)
    if (session) {
      await refundOnFailure(session.user.id, 'gift', session.user.email)
    }
    return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
  }
}
