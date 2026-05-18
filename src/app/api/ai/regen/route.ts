import { NextResponse } from 'next/server'
import { regenerateField } from '@/services/ai.service'
import { requireAuth, refundOnFailure } from '@/lib/apiAuth'
import { friendlyErrorMessage } from '@/lib/errorMessage'
import type { AIRegenRequest, RegenField } from '@/types/ai'

const ALLOWED_FIELDS: RegenField[] = [
  'product_name',
  'subtitle',
  'main_copy',
  'selling_points',
  'description',
  'keywords',
  'caution',
]

/**
 * AI 부분 재생성 — 단일 필드만 새로 뽑기
 *
 * 전체 재생성보다 가볍고, 마음에 든 필드는 그대로 두면서
 * 한 필드만 다른 표현으로 바꿔보고 싶을 때 사용.
 */
export async function POST(req: Request) {
  const { session, error } = await requireAuth('regen')
  if (error) return error

  try {
    const body = (await req.json()) as AIRegenRequest

    if (!body.field || !ALLOWED_FIELDS.includes(body.field)) {
      await refundOnFailure(session!.user.id, 'regen', session!.user.email)
      return NextResponse.json(
        { error: '재생성 가능한 필드가 아닙니다.' },
        { status: 400 },
      )
    }
    if (!body.currentContent) {
      await refundOnFailure(session!.user.id, 'regen', session!.user.email)
      return NextResponse.json(
        { error: '기존 콘텐츠가 필요합니다.' },
        { status: 400 },
      )
    }

    const result = await regenerateField(body)
    return NextResponse.json(result)
  } catch (err) {
    console.error('AI 부분 재생성 오류:', err)
    if (session) {
      await refundOnFailure(session.user.id, 'regen', session.user.email)
    }
    return NextResponse.json(
      { error: friendlyErrorMessage(err) },
      { status: 500 },
    )
  }
}
