/**
 * 초대 링크 진입 실패 안내 — 사유별 메시지 (만료/존재안함/시작전/손상).
 * /api/auth/invite 와 OAuth 콜백에서 ?reason= 으로 보냄.
 */
import Link from 'next/link'

type Reason = 'expired' | 'gone' | 'not_started' | 'invalid' | 'error'

const MESSAGES: Record<Reason, { icon: string; title: string; body: string; tone: string }> = {
  expired: {
    icon: '⏳',
    title: '초대 기간이 만료되었어요',
    body: '이 초대 링크의 사용 기간이 끝났습니다.\n계속 이용하려면 관리자에게 새 링크를 요청해주세요.',
    tone: 'var(--red)',
  },
  gone: {
    icon: '🚫',
    title: '존재하지 않는 초대예요',
    body: '이미 삭제되었거나 더 이상 유효하지 않은 링크입니다.\n링크가 맞는지 확인하거나 관리자에게 문의해주세요.',
    tone: 'var(--text3)',
  },
  not_started: {
    icon: '🗓️',
    title: '아직 시작 전인 초대예요',
    body: '이 초대는 아직 시작되지 않았어요.\n시작일 이후에 다시 접속해주세요.',
    tone: 'var(--accent)',
  },
  invalid: {
    icon: '⚠️',
    title: '잘못된 초대 링크예요',
    body: '링크가 손상되었거나 올바르지 않습니다.\n링크 전체를 정확히 복사했는지 확인해주세요.',
    tone: 'var(--red)',
  },
  error: {
    icon: '⚠️',
    title: '문제가 발생했어요',
    body: '잠시 후 다시 시도해주세요.\n계속되면 관리자에게 문의해주세요.',
    tone: 'var(--red)',
  },
}

export default async function InviteErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  const m = MESSAGES[(reason as Reason) in MESSAGES ? (reason as Reason) : 'gone']

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '36px 28px',
          textAlign: 'center',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            margin: '0 auto 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            background: 'color-mix(in srgb, var(--surface3) 60%, transparent)',
            border: `1px solid ${m.tone}`,
          }}
        >
          {m.icon}
        </div>
        <h1 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', margin: '0 0 10px' }}>{m.title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.7, margin: '0 0 26px', whiteSpace: 'pre-line' }}>
          {m.body}
        </p>

        <Link
          href="/product/new"
          style={{
            display: 'block',
            padding: '12px 18px',
            borderRadius: 10,
            background: 'var(--accent)',
            color: '#0c0c10',
            fontSize: 13.5,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          본인 Gemini API 키로 바로 시작하기
        </Link>
        <p style={{ fontSize: 11, color: 'var(--text3)', margin: '12px 0 0', lineHeight: 1.6 }}>
          초대 없이도 ⚙️ 설정에서 본인 API 키를 입력하면 사용할 수 있어요.
        </p>
      </div>
    </div>
  )
}
