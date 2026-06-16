import { NextResponse } from 'next/server'
import { generateTags } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { resolveUserKey } from '@/lib/routeKey'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { AITagRequest } from '@/types/ai'

export async function POST(req: Request) {
  const r = resolveUserKey(req)
  if ('error' in r) return r.error

  return runWithKey(r.key, async () => {
    try {
      const body = (await req.json()) as AITagRequest
      if (!body.productName) {
        return NextResponse.json({ error: '상품명이 필요합니다.' }, { status: 400 })
      }
      const result = await generateTags(body)
      return NextResponse.json(result)
    } catch (err) {
      console.error('태그 생성 오류:', err)
      return NextResponse.json({ error: friendlyErrorMessage(err) }, { status: 500 })
    }
  })
}
