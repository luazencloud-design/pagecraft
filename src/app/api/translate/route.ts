import { NextResponse } from 'next/server'
import { translateContent } from '@/services/translate.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { authorizeAi, refundIfTrial } from '@/lib/aiGate'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { TranslateRequest } from '@/types/ai'

/** 한↔일/영 양방향 재작성. BYOK 또는 무료 체험(generate 크레딧) */
export async function POST(req: Request) {
  let body: TranslateRequest
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }) }
  if (!body.current || !body.fromLang || !body.toLang) {
    return NextResponse.json(
      { error: '번역에 필요한 필드(current, fromLang, toLang)가 누락되었습니다.' },
      { status: 400 },
    )
  }

  const gate = await authorizeAi(req, 'generate')
  if ('error' in gate) return gate.error

  return runWithKey(gate.auth.key, async () => {
    try {
      return NextResponse.json(await translateContent(body))
    } catch (err) {
      console.error('AI 번역 오류:', err)
      await refundIfTrial(gate.auth)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
