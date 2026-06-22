import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { listInvites, createInvite, inviteLink, getEvents } from '@/lib/invites'
import { getTrialStatus } from '@/lib/trial'

/** 초대 목록 + 각자 체험 상태 + 링크 + 최근 활동 로그 */
export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  const invites = await listInvites()
  const rows = await Promise.all(
    invites.map(async (inv) => ({
      ...inv,
      link: await inviteLink(origin, inv),
      trial: await getTrialStatus(inv.id),
    })),
  )
  const events = await getEvents(30)
  return NextResponse.json({ admin, invites: rows, events })
}

/** 초대 생성 — name + 선택적 startsAt/expiresAt(ms) */
export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const { name, startsAt, expiresAt, unlimited } = (await req.json().catch(() => ({}))) as {
    name?: string; startsAt?: number; expiresAt?: number; unlimited?: boolean
  }
  const inv = await createInvite(name || '', {
    startsAt: startsAt || undefined,
    expiresAt: expiresAt && expiresAt > Date.now() ? expiresAt : undefined,
    unlimited: !!unlimited,
  })
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  return NextResponse.json({ invite: { ...inv, link: await inviteLink(origin, inv) } })
}
