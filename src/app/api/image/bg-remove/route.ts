import { NextResponse } from 'next/server'
import { removeBackground, removeBackgroundRecraft } from '@/services/ai.service'
import { runWithKey } from '@/lib/apiKeyContext'
import { authorizeAi, refundIfTrial } from '@/lib/aiGate'
import { reportError } from '@/lib/errorReport'

export const maxDuration = 60

/**
 * 배경 제거 — 모드별 모델 분기:
 *  - 무료 체험(서버 키): Recraft(Replicate) — 품질·비용 우수, 우리 비용
 *  - BYOK(본인 키): Gemini — BYOK는 Replicate 토큰이 없어 어쩔 수 없이 Gemini
 */
export async function POST(req: Request) {
  let body: { image?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }) }
  if (!body.image) return NextResponse.json({ error: '이미지가 필요합니다.' }, { status: 400 })

  const gate = await authorizeAi(req, 'bg-remove')
  if ('error' in gate) return gate.error

  try {
    let result: string
    if (gate.auth.mode === 'byok') {
      // BYOK → Gemini (사용자 키 컨텍스트)
      result = await runWithKey(gate.auth.key, () => removeBackground(body.image!))
    } else {
      // 체험(서버) → Recraft (Replicate)
      result = await removeBackgroundRecraft(body.image!)
    }
    return NextResponse.json({ image: result })
  } catch (err) {
    // 체험=Recraft / BYOK=Gemini 로 갈리므로 어느 엔진에서 났는지 함께 남긴다
    const info = reportError(err, { route: 'image/bg-remove', mode: gate.auth.mode, extra: { engine: gate.auth.mode === 'byok' ? 'gemini' : 'recraft' } })
    await refundIfTrial(gate.auth)
    return NextResponse.json({ error: info.message, code: info.code }, { status: 500 })
  }
}
