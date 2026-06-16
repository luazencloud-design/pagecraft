import { NextResponse } from 'next/server'
import { regenerateField } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { resolveUserKey } from '@/lib/routeKey'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { AIRegenRequest, RegenField } from '@/types/ai'

const ALLOWED_FIELDS: RegenField[] = [
  'product_name', 'subtitle', 'main_copy', 'selling_points', 'description', 'keywords', 'caution',
]

/** AI 부분 재생성 — 단일 필드만 새로 (BYOK) */
export async function POST(req: Request) {
  const r = resolveUserKey(req)
  if ('error' in r) return r.error

  return runWithKey(r.key, async () => {
    try {
      const body = (await req.json()) as AIRegenRequest
      if (!body.field || !ALLOWED_FIELDS.includes(body.field)) {
        return NextResponse.json({ error: '재생성 가능한 필드가 아닙니다.' }, { status: 400 })
      }
      if (!body.currentContent) {
        return NextResponse.json({ error: '기존 콘텐츠가 필요합니다.' }, { status: 400 })
      }
      const result = await regenerateField(body)
      return NextResponse.json(result)
    } catch (err) {
      console.error('AI 부분 재생성 오류:', err)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
