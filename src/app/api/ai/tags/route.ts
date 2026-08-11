import { NextResponse } from 'next/server'
import { generateTags } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { authorizeAi, refundIfTrial } from '@/lib/aiGate'
import { reportError } from '@/lib/errorReport'
import type { AITagRequest } from '@/types/ai'

export async function POST(req: Request) {
  let body: AITagRequest
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }) }
  if (!body.productName) return NextResponse.json({ error: '상품명이 필요합니다.' }, { status: 400 })

  const gate = await authorizeAi(req, 'generate')
  if ('error' in gate) return gate.error

  return runWithKey(gate.auth.key, async () => {
    try {
      return NextResponse.json(await generateTags(body))
    } catch (err) {
      const info = reportError(err, { route: 'ai/tags', mode: gate.auth.mode })
      await refundIfTrial(gate.auth)
      return NextResponse.json({ error: info.message, code: info.code }, { status: 500 })
    }
  })
}
