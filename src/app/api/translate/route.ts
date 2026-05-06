import { NextResponse } from 'next/server'
import { translateContent } from '@/services/translate.service'
import { requireAuth, refundOnFailure } from '@/lib/apiAuth'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { TranslateRequest } from '@/types/ai'

/**
 * 한↔일 양방향 재작성 (단순 번역 X — 톤까지 변환)
 * - 크레딧: 'generate' 동일 차감
 * - 입력: 기존 GeneratedAll + fromLang/toLang/targetPlatform
 * - 출력: 재작성된 GeneratedAll
 */
export async function POST(req: Request) {
  const { session, error } = await requireAuth('generate')
  if (error) return error

  try {
    const body = (await req.json()) as TranslateRequest
    if (!body.current || !body.fromLang || !body.toLang) {
      await refundOnFailure(session!.user.id, 'generate', session!.user.email)
      return NextResponse.json(
        { error: '번역에 필요한 필드(current, fromLang, toLang)가 누락되었습니다.' },
        { status: 400 },
      )
    }

    const result = await translateContent(body)
    return NextResponse.json(result)
  } catch (err) {
    console.error('AI 번역 오류:', err)
    if (session) {
      await refundOnFailure(session.user.id, 'generate', session.user.email)
    }
    return NextResponse.json(
      { error: friendlyErrorMessage(err) },
      { status: 500 },
    )
  }
}
