'use client'

import { useState } from 'react'
import { api, ApiError } from '@/lib/api'

/**
 * 매직링크 로그인 모달 — 이메일 입력 → 링크 발송 → "메일 확인" 안내
 */
export default function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    setSending(true)
    try {
      await api.post('/api/auth/request', { email })
      setSent(true)
    } catch (err) {
      let msg = '메일 발송에 실패했어요.'
      if (err instanceof ApiError) {
        try { msg = JSON.parse(err.message).error || msg } catch { msg = err.message || msg }
      }
      setError(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 380, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <>
            <p style={{ fontSize: 40, textAlign: 'center', margin: '0 0 10px' }}>📬</p>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', textAlign: 'center', margin: '0 0 8px' }}>
              메일을 확인하세요
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.7, margin: '0 0 20px' }}>
              <b style={{ color: 'var(--text)' }}>{email}</b> 로<br />
              로그인 링크를 보냈어요. (15분 유효)<br />
              메일이 안 보이면 스팸함도 확인해주세요.
            </p>
            <button
              onClick={onClose}
              style={{ width: '100%', padding: '11px', borderRadius: 9, fontSize: 13, fontWeight: 700, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer' }}
            >
              닫기
            </button>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
              무료 체험 시작
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.6, margin: '0 0 18px' }}>
              이메일을 입력하면 로그인 링크를 보내드려요. 가입한 날부터 <b style={{ color: 'var(--text2)' }}>30일간 무료 크레딧</b>으로
              모든 기능을 사용할 수 있습니다.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !sending) submit() }}
              placeholder="your@email.com"
              autoFocus
              spellCheck={false}
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 9, fontSize: 14, color: 'var(--text)', background: 'var(--surface2)', border: '1px solid var(--border)', outline: 'none', marginBottom: 10 }}
            />
            {error && <p style={{ fontSize: 12, color: 'var(--red)', margin: '0 0 10px' }}>{error}</p>}
            <button
              onClick={submit}
              disabled={sending || !email.trim()}
              style={{ width: '100%', padding: '12px', borderRadius: 9, fontSize: 14, fontWeight: 700, background: sending || !email.trim() ? 'var(--surface3)' : 'var(--accent)', border: 'none', color: sending || !email.trim() ? 'var(--text3)' : '#0c0c10', cursor: sending || !email.trim() ? 'not-allowed' : 'pointer' }}
            >
              {sending ? '발송 중...' : '로그인 링크 받기'}
            </button>
            <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', margin: '14px 0 0', lineHeight: 1.6 }}>
              이미 본인 Gemini API 키가 있다면<br />⚙️ 설정에서 키를 입력해 무제한으로 쓸 수 있어요.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
