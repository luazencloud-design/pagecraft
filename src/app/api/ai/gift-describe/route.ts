import { NextResponse } from 'next/server'
import { describeGiftImage } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { authorizeAi, refundIfTrial } from '@/lib/aiGate'
import { friendlyErrorMessage } from '@/lib/errorMessage'

export async function POST(req: Request) {
  let body: { image?: string; productName?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }) }
  if (!body.image || !body.image.startsWith('data:')) {
    return NextResponse.json({ error: '사은품 이미지가 필요합니다.' }, { status: 400 })
  }

  const gate = await authorizeAi(req, 'gift')
  if ('error' in gate) return gate.error

  return runWithKey(gate.auth.key, async () => {
    try {
      const description = await describeGiftImage(body.image!, body.productName)
      return NextResponse.json({ description })
    } catch (err) {
      console.error('사은품 설명 생성 오류:', err)
      await refundIfTrial(gate.auth)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
