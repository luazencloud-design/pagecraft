'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, ApiError } from '@/lib/api'

interface InviteRow {
  id: string
  name: string
  version: number
  createdAt: number
  link: string
  trial: { active: boolean; everStarted: boolean; used: number; remaining: number; limit: number; daysLeft: number }
}

export default function AdminPage() {
  const [state, setState] = useState<'loading' | 'unauth' | 'ready'>('loading')
  const [admin, setAdmin] = useState<string>('')
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ admin: string; invites: InviteRow[] }>('/api/admin/invites')
      setAdmin(res.admin)
      setInvites(res.invites)
      setState('ready')
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setState('unauth')
      else setState('unauth')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    setBusy(true)
    try {
      await api.post('/api/admin/invites', { name: newName })
      setNewName('')
      await load()
    } finally { setBusy(false) }
  }

  const rename = async (id: string, current: string) => {
    const name = window.prompt('새 이름(용도)', current)
    if (name == null) return
    await api.patch(`/api/admin/invites/${id}`, { action: 'rename', name })
    await load()
  }

  const regenerate = async (id: string) => {
    if (!window.confirm('링크를 재생성하면 기존 링크는 즉시 무효화됩니다. (크레딧/기간은 유지)')) return
    await api.patch(`/api/admin/invites/${id}`, { action: 'regenerate' })
    await load()
  }

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" 초대를 삭제할까요? 이 링크와 체험 기록이 제거됩니다.`)) return
    await api.del(`/api/admin/invites/${id}`)
    await load()
  }

  const copy = (link: string) => {
    navigator.clipboard.writeText(link)
  }

  if (state === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-bg"><p className="text-text3">로딩 중...</p></div>
  }

  if (state === 'unauth') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div style={{ textAlign: 'center', maxWidth: 360, padding: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>관리자</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, margin: '0 0 22px' }}>
            등록된 관리자 구글 계정으로 로그인하세요.
          </p>
          <a
            href="/api/admin/google/start"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '12px 24px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google로 로그인
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>초대 링크 관리</h1>
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: '4px 0 0' }}>{admin}</p>
          </div>
          <button
            onClick={async () => { await api.post('/api/admin/logout', {}); location.reload() }}
            style={{ padding: '8px 14px', borderRadius: 7, fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer' }}
          >
            로그아웃
          </button>
        </div>

        {/* 생성 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim() && !busy) create() }}
            placeholder="용도/이름 (예: 수강생 1기, 김철수)"
            style={{ flex: 1, padding: '10px 13px', borderRadius: 9, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', outline: 'none' }}
          />
          <button
            onClick={create}
            disabled={busy || !newName.trim()}
            style={{ padding: '0 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: busy || !newName.trim() ? 'var(--surface3)' : 'var(--accent)', border: 'none', color: busy || !newName.trim() ? 'var(--text3)' : '#0c0c10', cursor: busy || !newName.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
          >
            + 초대 생성
          </button>
        </div>

        {/* 목록 */}
        {invites.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '40px 0' }}>아직 초대가 없어요. 위에서 생성하세요.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {invites.map((inv) => (
              <div key={inv.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{inv.name}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--text3)', marginLeft: 8 }}>
                      {inv.trial.everStarted
                        ? inv.trial.active
                          ? `사용중 · ${inv.trial.remaining}/${inv.trial.limit} · ${inv.trial.daysLeft}일`
                          : '체험 종료'
                        : '미사용'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => copy(inv.link)} style={btn()}>링크 복사</button>
                    <button onClick={() => rename(inv.id, inv.name)} style={btn()}>이름</button>
                    <button onClick={() => regenerate(inv.id)} style={btn()}>재생성</button>
                    <button onClick={() => remove(inv.id, inv.name)} style={btn('var(--red)')}>삭제</button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono, monospace)', wordBreak: 'break-all', background: 'var(--surface2)', borderRadius: 6, padding: '7px 9px' }}>
                  {inv.link}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function btn(color?: string): React.CSSProperties {
  return {
    padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    color: color || 'var(--text2)', cursor: 'pointer', whiteSpace: 'nowrap',
  }
}
