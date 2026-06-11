interface GiftBlockProps {
  giftImage?: string | null
  giftDescription?: string | null
  /** 템플릿 팔레트에 맞춘 색 — accent(라벨/포인트), bg(블록 배경), border */
  accent?: string
  bg?: string
  border?: string
  fontFamily?: string
}

/**
 * 사은품 안내 블록 — 스토어 소개 이미지 바로 아래에 표시
 *
 * 담백한 톤: 작은 'GIFT' 라벨 + 사은품 이미지 + 안내 문구.
 * giftImage 가 없으면 아무것도 렌더하지 않음 (호출부에서 가드해도 안전망).
 */
export default function GiftBlock({
  giftImage,
  giftDescription,
  accent = '#c8a050',
  bg = '#faf9f6',
  border = '#ece9e2',
  fontFamily = "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif",
}: GiftBlockProps) {
  if (!giftImage) return null

  return (
    <div
      style={{
        background: bg,
        borderTop: `1px solid ${border}`,
        borderBottom: `1px solid ${border}`,
        padding: '34px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        fontFamily,
      }}
    >
      {/* 사은품 이미지 — 정사각 썸네일 */}
      <div
        style={{
          width: 130,
          height: 130,
          flexShrink: 0,
          borderRadius: 10,
          overflow: 'hidden',
          border: `1px solid ${border}`,
          background: '#fff',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={giftImage}
          alt="사은품"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* 라벨 + 문구 */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 4,
            background: accent,
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.08em',
            marginBottom: 12,
          }}
        >
          GIFT · 사은품 증정
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            lineHeight: 1.65,
            color: '#3d3d3d',
            fontWeight: 500,
            wordBreak: 'keep-all',
          }}
        >
          {giftDescription || '구매 시 사은품을 함께 드립니다.'}
        </p>
      </div>
    </div>
  )
}
