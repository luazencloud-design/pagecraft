import { NextResponse } from 'next/server'
import { translateContent } from '@/services/translate.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { resolveUserKey } from '@/lib/routeKey'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { TranslateRequest } from '@/types/ai'

/**
 * 한↔일/영 양방향 재작성 (단순 번역 X — 톤까지 변환). BYOK.
 */
export async function POST(req: Request) {
  const r = resolveUserKey(req)
  if ('error' in r) return r.error

  return runWithKey(r.key, async () => {
    try {
      const body = (await req.json()) as TranslateRequest
      if (!body.current || !body.fromLang || !body.toLang) {
        return NextResponse.json(
          { error: '번역에 필요한 필드(current, fromLang, toLang)가 누락되었습니다.' },
          { status: 400 },
        )
      }
      const result = await translateContent(body)
      return NextResponse.json(result)
    } catch (err) {
      console.error('AI 번역 오류:', err)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
