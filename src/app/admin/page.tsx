'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

interface Trial { active: boolean; everStarted: boolean; used: number; remaining: number; limit: number; daysLeft: number }
interface InviteRow {
  id: string; name: string; version: number; createdAt: number
  startsAt?: number; expiresAt?: number; unlimited?: boolean; link: string; trial: Trial
}
interface EventRow { ts: number; action: 'created' | 'regenerated' | 'deleted' | 'redeemed'; invite: string; detail?: string }

// ── 유틸 ──
const tsToDate = (ts?: number) => (ts ? new Date(ts).toISOString().slice(0, 10) : '')
const dateToStart = (d: string) => (d ? new Date(`${d}T00:00:00`).getTime() : null)
const dateToEnd = (d: string) => (d ? new Date(`${d}T23:59:59`).getTime() : null)
const fmtDate = (ts?: number) => (ts ? new Date(ts).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }) : '')

function period(inv: InviteRow): string {
  if (inv.unlimited) return '무제한'
  const s = inv.startsAt ? fmtDate(inv.startsAt) : ''
  const e = inv.expiresAt ? fmtDate(inv.expiresAt) : ''
  if (!s && !e) return '무기한'
  return `${s || '~'} → ${e || '~'}`
}
function statusOf(inv: InviteRow): { label: string; color: string } {
  if (inv.unlimited) return { label: '♾️ 무제한 (직원)', color: 'var(--green)' }
  const now = Date.now()
  if (inv.startsAt && now < inv.startsAt) return { label: '시작 전', color: 'var(--text3)' }
  if (inv.expiresAt && now > inv.expiresAt) return { label: '만료', color: 'var(--red)' }
  if (inv.trial.everStarted) {
    return inv.trial.active
      ? { label: `사용중 ${inv.trial.remaining}/${inv.trial.limit}`, color: 'var(--green)' }
      : { label: '체험 종료', color: 'var(--text3)' }
  }
  return { label: '대기', color: 'var(--accent)' }
}
function relTime(ts: number): string {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return new Date(ts).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}
const EVENT_LABEL: Record<EventRow['action'], string> = {
  created: '생성', regenerated: '링크 재생성', deleted: '삭제', redeemed: '입장',
}

export default function AdminPage() {
  const [state, setState] = useState<'loading' | 'unauth' | 'ready'>('loading')
  const [admin, setAdmin] = useState('')
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [events, setEvents] = useState<EventRow[]>([])
  const [busy, setBusy] = useState(false)

  // 생성 폼
  const [newName, setNewName] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [newUnlimited, setNewUnlimited] = useState(false)

  // 행 상태
  const [copiedId, setCopiedId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [edit, setEdit] = useState({ name: '', start: '', end: '' })

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ admin: string; invites: InviteRow[]; events: EventRow[] }>('/api/admin/invites')
      setAdmin(res.admin); setInvites(res.invites); setEvents(res.events || []); setState('ready')
    } catch {
      setState('unauth')
    }
  }, [])
  useEffect(() => { load() }, [load])

  const create = async () => {
    setBusy(true)
    try {
      await api.post('/api/admin/invites', {
        name: newName, startsAt: dateToStart(newStart), expiresAt: dateToEnd(newEnd), unlimited: newUnlimited,
      })
      setNewName(''); setNewStart(''); setNewEnd(''); setNewUnlimited(false)
      await load()
    } finally { setBusy(false) }
  }

  const toggleUnlimited = async (id: string, next: boolean) => {
    await api.patch(`/api/admin/invites/${id}`, { action: 'unlimited', unlimited: next }); await load()
  }

  const startEdit = (inv: InviteRow) => {
    setEditingId(inv.id)
    setEdit({ name: inv.name, start: tsToDate(inv.startsAt), end: tsToDate(inv.expiresAt) })
  }
  const saveEdit = async (id: string) => {
    setBusy(true)
    try {
      await api.patch(`/api/admin/invites/${id}`, { action: 'rename', name: edit.name })
      await api.patch(`/api/admin/invites/${id}`, { action: 'schedule', startsAt: dateToStart(edit.start), expiresAt: dateToEnd(edit.end) })
      setEditingId(''); await load()
    } finally { setBusy(false) }
  }
  const regenerate = async (id: string) => {
    if (!window.confirm('링크를 새로 만들면 기존 링크는 즉시 무효화됩니다. (크레딧/기간은 유지)')) return
    await api.patch(`/api/admin/invites/${id}`, { action: 'regenerate' }); await load()
  }
  const remove = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" 초대를 삭제할까요? 이 링크와 사용자 접근이 즉시 차단됩니다.`)) return
    await api.del(`/api/admin/invites/${id}`); setEditingId(''); await load()
  }
  const copy = (id: string, link: string) => {
    navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(''), 1500)
  }

  if (state === 'loading') return <Center>로딩 중...</Center>
  if (state === 'unauth') return (
    <Center>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>관리자</h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, margin: '0 0 22px' }}>등록된 관리자 구글 계정으로 로그인하세요.</p>
        <a href="/api/oauth/google/start?admin=1" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 24px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          <GoogleIcon /> Google로 로그인
        </a>
      </div>
    </Center>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>초대 링크 관리</h1>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 0' }}>{admin}</p>
          </div>
          <button onClick={async () => { await api.post('/api/admin/logout', {}); location.reload() }} style={ghostBtn}>로그아웃</button>
        </div>

        {/* 생성 */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="용도/이름" flex>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim() && !busy) create() }} placeholder="예: 수강생 1기" style={input} />
            </Field>
            <Field label="시작일 (선택)">
              <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} disabled={newUnlimited} style={{ ...input, width: 140, opacity: newUnlimited ? 0.4 : 1 }} />
            </Field>
            <Field label="종료일 (선택)">
              <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} disabled={newUnlimited} style={{ ...input, width: 140, opacity: newUnlimited ? 0.4 : 1 }} />
            </Field>
            <button onClick={create} disabled={busy || !newName.trim()} style={primaryBtn(busy || !newName.trim())}>+ 생성</button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, cursor: 'pointer', fontSize: 12, color: 'var(--text2)' }}>
            <input type="checkbox" checked={newUnlimited} onChange={(e) => setNewUnlimited(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
            <span><b>♾️ 무제한 </b> — 크레딧·기간 제한 없음</span>
          </label>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text3)', margin: '0 0 22px' }}>
          기간을 비우면 무기한. 시작일 전엔 입장 불가, 종료일 후엔 사용자 즉시 차단(목록엔 <b>만료</b>로 남으니 직접 삭제).
          무제한은 직원용 — 크레딧·기간 안 걸림.
        </p>

        {/* 목록 */}
        {invites.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '40px 0' }}>아직 초대가 없어요.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invites.map((inv) => {
              const st = statusOf(inv)
              const editing = editingId === inv.id
              const expired = !inv.unlimited && !!inv.expiresAt && Date.now() > inv.expiresAt
              const borderColor = editing ? 'var(--accent)' : expired ? 'var(--red)' : 'var(--border)'
              return (
                <div key={inv.id} style={{ background: expired ? 'color-mix(in srgb, var(--red) 6%, var(--surface))' : 'var(--surface)', border: `1px solid ${borderColor}`, borderRadius: 12, padding: 14, transition: 'border-color 0.15s' }}>
                  {/* 한 줄 요약 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{inv.name}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--text3)', marginLeft: 10 }}>🗓 {period(inv)}</span>
                      <span style={{ fontSize: 10.5, color: st.color, marginLeft: 8, fontWeight: 600 }}>· {st.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {!expired && (
                        <button onClick={() => copy(inv.id, inv.link)} style={smallBtn(copiedId === inv.id ? 'var(--green)' : undefined)}>
                          {copiedId === inv.id ? '✓ 복사됨' : '링크 복사'}
                        </button>
                      )}
                      <button onClick={() => (editing ? setEditingId('') : startEdit(inv))} style={smallBtn(editing ? 'var(--accent)' : undefined)}>
                        {editing ? '닫기' : '수정'}
                      </button>
                      <button onClick={() => remove(inv.id, inv.name)} style={smallBtn('var(--red)')}>🗑 삭제</button>
                    </div>
                  </div>

                  {/* 수정 패널 (펼침) */}
                  {editing && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <Field label="이름" flex>
                          <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} style={input} />
                        </Field>
                        <Field label="시작일">
                          <input type="date" value={edit.start} onChange={(e) => setEdit({ ...edit, start: e.target.value })} disabled={inv.unlimited} style={{ ...input, width: 140, opacity: inv.unlimited ? 0.4 : 1 }} />
                        </Field>
                        <Field label="종료일">
                          <input type="date" value={edit.end} onChange={(e) => setEdit({ ...edit, end: e.target.value })} disabled={inv.unlimited} style={{ ...input, width: 140, opacity: inv.unlimited ? 0.4 : 1 }} />
                        </Field>
                        <button onClick={() => saveEdit(inv.id)} disabled={busy} style={primaryBtn(busy)}>저장</button>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, color: 'var(--text2)' }}>
                        <input type="checkbox" checked={!!inv.unlimited} onChange={(e) => toggleUnlimited(inv.id, e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
                        <span><b>♾️ 무제한 (직원용)</b> — 크레딧·기간 제한 없음</span>
                      </label>
                      {/* 링크 + 재생성 (삭제는 행에 상시 노출) */}
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono, monospace)', wordBreak: 'break-all', background: 'var(--surface2)', borderRadius: 6, padding: '7px 9px' }}>{inv.link}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => regenerate(inv.id)} style={smallBtn()}>↻ 링크 재생성</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* 활동 로그 */}
        {events.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 10px' }}>최근 활동</p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {events.map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderTop: i ? '1px solid var(--border)' : 'none', fontSize: 12 }}>
                  <span style={{ width: 64, color: 'var(--text3)', flexShrink: 0 }}>{relTime(ev.ts)}</span>
                  <span style={{ width: 80, fontWeight: 600, color: ev.action === 'redeemed' ? 'var(--green)' : ev.action === 'deleted' ? 'var(--red)' : 'var(--text2)', flexShrink: 0 }}>{EVENT_LABEL[ev.action]}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{ev.invite}</span>
                  {ev.detail && <span style={{ color: 'var(--text3)' }}>· {ev.detail}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 작은 컴포넌트/스타일 ──
function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center bg-bg" style={{ padding: 24 }}><div className="text-text3" style={{ fontSize: 13 }}>{children}</div></div>
}
function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: flex ? 1 : undefined, minWidth: flex ? 160 : undefined }}>
      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{label}</span>
      {children}
    </div>
  )
}
function GoogleIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
}

const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, fontSize: 13, color: 'var(--text)', background: 'var(--surface2)', border: '1px solid var(--border)', outline: 'none' }
const ghostBtn: React.CSSProperties = { padding: '8px 14px', borderRadius: 7, fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer' }
function smallBtn(color?: string): React.CSSProperties {
  return { padding: '6px 11px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, background: 'var(--surface2)', border: `1px solid ${color || 'var(--border)'}`, color: color || 'var(--text2)', cursor: 'pointer', whiteSpace: 'nowrap' }
}
function primaryBtn(disabled: boolean): React.CSSProperties {
  return { padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: disabled ? 'var(--surface3)' : 'var(--accent)', border: 'none', color: disabled ? 'var(--text3)' : '#0c0c10', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }
}
