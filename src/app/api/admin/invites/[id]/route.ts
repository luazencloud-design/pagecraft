import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { renameInvite, regenerateInvite, deleteInvite, setInviteSchedule, setInviteUnlimited, inviteLink, getInvite } from '@/lib/invites'
import { reportError } from '@/lib/errorReport'

/** 수정 — 이름 / 링크 재생성 / 기간(schedule) / 무제한(unlimited) */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as {
    action?: 'rename' | 'regenerate' | 'schedule' | 'unlimited'
    name?: string
    startsAt?: number | null
    expiresAt?: number | null
    unlimited?: boolean
  }

  // 저장소 장애를 미처리 예외로 흘리지 않는다 (사유: 같은 폴더 route.ts 주석). 기록은 남긴다.
  try {
    let inv = await getInvite(id)
    if (!inv) return NextResponse.json({ error: '초대를 찾을 수 없습니다.' }, { status: 404 })

    if (body.action === 'regenerate') {
      inv = await regenerateInvite(id)
    } else if (body.action === 'schedule') {
      inv = await setInviteSchedule(id, body.startsAt ?? null, body.expiresAt ?? null)
    } else if (body.action === 'unlimited') {
      inv = await setInviteUnlimited(id, !!body.unlimited)
    } else {
      inv = await renameInvite(id, body.name || inv.name)
    }
    if (!inv) return NextResponse.json({ error: '수정 실패' }, { status: 500 })

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
    return NextResponse.json({ invite: { ...inv, link: await inviteLink(origin, inv) } })
  } catch (err) {
    const info = reportError(err, { route: 'admin/invites:update' })
    return NextResponse.json(
      { error: '초대 저장소에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', code: info.code },
      { status: 503 },
    )
  }
}

/** 삭제 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const { id } = await ctx.params
  try {
    await deleteInvite(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const info = reportError(err, { route: 'admin/invites:delete' })
    return NextResponse.json(
      { error: '초대 저장소에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.', code: info.code },
      { status: 503 },
    )
  }
}
