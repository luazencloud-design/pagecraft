import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { listInvites, createInvite, inviteLink, getEvents, getBlocks } from '@/lib/invites'
import { reportError } from '@/lib/errorReport'

/** 초대 목록 + 링크 + 최근 활동 로그
 *  (크레딧은 (링크 × 계정) 단위라 초대당 단일 잔여를 표시하지 않음 — 입장 현황은 활동 로그 참고) */
export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  // 저장소 장애를 미처리 예외로 흘리지 않는다 — 예외가 되면 요청 컨텍스트가 통째로 오류 보고에
  // 실린다. 닫되 기록은 남긴다: 닫는 것과 숨기는 것은 다르다.
  try {
    const invites = await listInvites()
    const rows = await Promise.all(
      invites.map(async (inv) => ({
        ...inv,
        link: await inviteLink(origin, inv),
      })),
    )
    const events = await getEvents(300)
    const blocks = await getBlocks(300)
    return NextResponse.json({ admin, invites: rows, events, blocks })
  } catch (err) {
    const info = reportError(err, { route: 'admin/invites:list' })
    return NextResponse.json(
      { error: '초대 저장소에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', code: info.code },
      { status: 503 },
    )
  }
}

/** 초대 생성 — name + 선택적 startsAt/expiresAt(ms) */
export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const { name, startsAt, expiresAt, unlimited } = (await req.json().catch(() => ({}))) as {
    name?: string; startsAt?: number; expiresAt?: number; unlimited?: boolean
  }
  try {
    const inv = await createInvite(name || '', {
      startsAt: startsAt || undefined,
      expiresAt: expiresAt && expiresAt > Date.now() ? expiresAt : undefined,
      unlimited: !!unlimited,
    })
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
    return NextResponse.json({ invite: { ...inv, link: await inviteLink(origin, inv) } })
  } catch (err) {
    const info = reportError(err, { route: 'admin/invites:create' })
    return NextResponse.json(
      { error: '초대 저장소에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', code: info.code },
      { status: 503 },
    )
  }
}
