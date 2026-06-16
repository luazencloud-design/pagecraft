import { NextResponse } from 'next/server'
import { describeGiftImage } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { resolveUserKey } from '@/lib/routeKey'
import { friendlyErrorMessage } from '@/lib/errorMessage'

/** 사은품 설명 생성 (BYOK) */
export async function POST(req: Request) {
  const r = resolveUserKey(req)
  if ('error' in r) return r.error

  return runWithKey(r.key, async () => {
    try {
      const body = (await req.json()) as { image?: string; productName?: string }
      if (!body.image || !body.image.startsWith('data:')) {
        return NextResponse.json({ error: '사은품 이미지가 필요합니다.' }, { status: 400 })
      }
      const description = await describeGiftImage(body.image, body.productName)
      return NextResponse.json({ description })
    } catch (err) {
      console.error('사은품 설명 생성 오류:', err)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
