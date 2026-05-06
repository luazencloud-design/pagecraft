import { NextResponse } from 'next/server'
import { generateAll } from '@/services/ai.service'
import { requireAuth, refundOnFailure } from '@/lib/apiAuth'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { AIGenerateRequest } from '@/types/ai'

/**
 * 통합 AI 생성
 * 반환 타입은 GeneratedByLang (= Partial<Record<'ko'|'ja', GeneratedAll>>)
 * - 한국 플랫폼: { ko: ... }
 * - 큐텐 재팬: { ja: ..., ko: ... } — 양 언어 동시 생성으로 토글 즉시 전환 가능
 */
export async function POST(req: Request) {
  const { session, error } = await requireAuth('generate')
  if (error) return error

  try {
    const body = (await req.json()) as AIGenerateRequest & { coupangSuggestions?: string[] }

    if (!body.images || body.images.length === 0) {
      // 크레딧 이미 차감됨 → 환불
      await refundOnFailure(session!.user.id, 'generate', session!.user.email)
      return NextResponse.json(
        { error: '상품 이미지가 필요합니다.' },
        { status: 400 },
      )
    }

    const result = await generateAll(body, body.coupangSuggestions || [])
    return NextResponse.json(result)
  } catch (err) {
    console.error('AI 통합 생성 오류:', err)
    // 실패 시 크레딧 환불
    if (session) {
      await refundOnFailure(session.user.id, 'generate', session.user.email)
    }
    return NextResponse.json(
      { error: friendlyErrorMessage(err) },
      { status: 500 },
    )
  }
}
