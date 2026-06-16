import { NextResponse } from 'next/server'
import { removeBackground } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { resolveUserKey } from '@/lib/routeKey'
import { friendlyErrorMessage } from '@/lib/errorMessage'

export const maxDuration = 60

/** 배경 제거 (BYOK — Gemini Image) */
export async function POST(req: Request) {
  const r = resolveUserKey(req)
  if ('error' in r) return r.error

  return runWithKey(r.key, async () => {
    try {
      const body = (await req.json()) as { image: string }
      if (!body.image) {
        return NextResponse.json({ error: '이미지가 필요합니다.' }, { status: 400 })
      }
      const result = await removeBackground(body.image)
      return NextResponse.json({ image: result })
    } catch (err) {
      console.error('배경 제거 오류:', err)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
