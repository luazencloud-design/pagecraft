import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { listInvites, createInvite, inviteLink } from '@/lib/invites'
import { getTrialStatus } from '@/lib/trial'

/** 초대 목록 + 각자 체험 상태 + 링크 */
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
  return NextResponse.json({ admin, invites: rows })
}

/** 초대 생성 */
export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const { name } = (await req.json().catch(() => ({}))) as { name?: string }
  const inv = await createInvite(name || '')
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  return NextResponse.json({ invite: { ...inv, link: await inviteLink(origin, inv) } })
}
