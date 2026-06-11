interface GiftBlockProps {
  giftImage?: string | null
  giftDescription?: string | null
  /** 한글 헤드라인 강조색 — 기본 블루(레퍼런스 톤). 템플릿별 오버라이드 가능 */
  headlineColor?: string
  /** 블록 배경 */
  bg?: string
  fontFamily?: string
}

/**
 * 사은품 안내 — 풀와이드 히어로 배너 (스토어 소개 이미지 바로 아래)
 *
 * 구성: eyebrow(라인) → GIFT FOR YOU(블랙) → 사은품 증정 이벤트(블루)
 *      → FREE GIFT EVENT(라인) → 사은품 이미지 크게 → 안내 문구
 *
 * giftImage 없으면 렌더 X.
 */
export default function GiftBlock({
  giftImage,
  giftDescription,
  headlineColor = '#3d7bf0',
  bg = '#ffffff',
  fontFamily = "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif",
}: GiftBlockProps) {
  if (!giftImage) return null

  return (
    <div
      style={{
        background: bg,
        padding: '64px 50px 60px',
        textAlign: 'center',
        fontFamily,
      }}
    >
      {/* eyebrow — 짧은 라인 + 라벨 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: '#2b2b2b',
            letterSpacing: '0.02em',
          }}
        >
          Special Gift
        </span>
        <span style={{ width: 90, height: 1, background: '#cdcdcd' }} />
      </div>

      {/* GIFT FOR YOU — 블랙 */}
      <p
        style={{
          margin: 0,
          fontSize: 50,
          fontWeight: 900,
          color: '#1a1a1a',
          letterSpacing: '0.01em',
          lineHeight: 1.1,
        }}
      >
        GIFT FOR YOU
      </p>

      {/* 사은품 증정 이벤트 — 블루 */}
      <p
        style={{
          margin: '6px 0 0',
          fontSize: 44,
          fontWeight: 900,
          color: headlineColor,
          letterSpacing: '0.01em',
          lineHeight: 1.15,
          wordBreak: 'keep-all',
        }}
      >
        사은품 증정 이벤트
      </p>

      {/* FREE GIFT EVENT — 라인 + 라벨 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          margin: '18px 0 0',
        }}
      >
        <span style={{ width: 60, height: 1, background: '#cdcdcd' }} />
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#6a6a6a',
            letterSpacing: '0.12em',
          }}
        >
          FREE GIFT EVENT
        </span>
      </div>

      {/* 사은품 이미지 — 크게, 전체가 보이도록 contain */}
      <div style={{ marginTop: 40 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={giftImage}
          alt="사은품"
          style={{
            display: 'block',
            margin: '0 auto',
            maxWidth: 480,
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>

      {/* 안내 문구 — 사은품 정보 (담백하게, 읽기 좋은 크기) */}
      {giftDescription && (
        <p
          style={{
            margin: '34px auto 0',
            maxWidth: 560,
            fontSize: 19,
            lineHeight: 1.7,
            color: '#444444',
            fontWeight: 500,
            wordBreak: 'keep-all',
          }}
        >
          {giftDescription}
        </p>
      )}
    </div>
  )
}
