import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { renameInvite, regenerateInvite, deleteInvite, setInviteExpiry, inviteLink, getInvite } from '@/lib/invites'

/** 수정 — 이름(rename) / 링크 재생성(regenerate) / 유효기간(expiry) */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as {
    action?: 'rename' | 'regenerate' | 'expiry'
    name?: string
    expiresAt?: number | null
  }

  let inv = await getInvite(id)
  if (!inv) return NextResponse.json({ error: '초대를 찾을 수 없습니다.' }, { status: 404 })

  if (body.action === 'regenerate') {
    inv = await regenerateInvite(id)
  } else if (body.action === 'expiry') {
    inv = await setInviteExpiry(id, body.expiresAt ?? null)
  } else {
    inv = await renameInvite(id, body.name || inv.name)
  }
  if (!inv) return NextResponse.json({ error: '수정 실패' }, { status: 500 })

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  return NextResponse.json({ invite: { ...inv, link: await inviteLink(origin, inv) } })
}

/** 삭제 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const { id } = await ctx.params
  await deleteInvite(id)
  return NextResponse.json({ ok: true })
}
