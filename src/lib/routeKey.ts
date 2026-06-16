import { NextResponse } from 'next/server'

/**
 * BYOK — 요청 헤더(x-gemini-key)에서 사용자 Gemini 키를 추출.
 * 엄격 BYOK: 사용자 키가 없으면 작동하지 않음 (서버 env 폴백 X).
 */
export function resolveUserKey(req: Request): { key: string } | { error: NextResponse } {
  const key = req.headers.get('x-gemini-key')?.trim() || ''
  if (!key) {
    return {
      error: NextResponse.json(
        { error: 'Gemini API 키가 필요합니다. 우측 상단 설정에서 본인 API 키를 입력해주세요.' },
        { status: 400 },
      ),
    }
  }
  return { key }
}
