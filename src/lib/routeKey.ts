import { NextResponse } from 'next/server'

/**
 * BYOK — 요청 헤더(x-gemini-key)에서 사용자 Gemini 키를 추출.
 * 없으면 서버 env(셀프호스트/데모) 폴백. 둘 다 없으면 400.
 */
export function resolveUserKey(req: Request): { key: string } | { error: NextResponse } {
  const key = req.headers.get('x-gemini-key')?.trim() || process.env.GEMINI_API_KEY || ''
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
