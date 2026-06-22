import { NextResponse } from 'next/server'
import { removeBackground } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { authorizeAi, refundIfTrial } from '@/lib/aiGate'
import { friendlyErrorMessage } from '@/lib/errorMessage'

export const maxDuration = 60

/** 배경 제거 (Gemini Image) — BYOK 또는 무료 체험 */
export async function POST(req: Request) {
  let body: { image?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }) }
  if (!body.image) return NextResponse.json({ error: '이미지가 필요합니다.' }, { status: 400 })

  const gate = await authorizeAi(req, 'bg-remove')
  if ('error' in gate) return gate.error

  return runWithKey(gate.auth.key, async () => {
    try {
      const result = await removeBackground(body.image!)
      return NextResponse.json({ image: result })
    } catch (err) {
      console.error('배경 제거 오류:', err)
      await refundIfTrial(gate.auth)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
