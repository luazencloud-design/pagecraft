import { NextResponse } from 'next/server'
import { generateTitles } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { authorizeAi, refundIfTrial } from '@/lib/aiGate'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { AITitleRequest } from '@/types/ai'

export async function POST(req: Request) {
  let body: AITitleRequest
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }) }
  if (!body.productName) return NextResponse.json({ error: '상품명이 필요합니다.' }, { status: 400 })

  const gate = await authorizeAi(req, 'generate')
  if ('error' in gate) return gate.error

  return runWithKey(gate.auth.key, async () => {
    try {
      return NextResponse.json(await generateTitles(body))
    } catch (err) {
      console.error('타이틀 생성 오류:', err)
      await refundIfTrial(gate.auth)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
