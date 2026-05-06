import type { AIGenerateRequest, GeneratedAll } from '@/types/ai'

/**
 * Qoo10 Japan용 — 일본어 + 한국어 동시 생성 (양 언어 1회 호출로 토큰 절약)
 *
 * 1차 출력은 일본어 (큐텐 셀러의 주 사용 언어). 같은 호출에 한국어 버전도 함께 반환 —
 * 양쪽이 같은 톤·사실관계를 공유하면서도 각 마켓에 맞게 카피 톤만 차이 (JP=감성/KR=SEO).
 *
 * 특징:
 * - 일본어: 큰 영문 타이틀 + 감성 무드 톤, 색조 swatch + パーソナルカラー
 * - 한국어: 쿠팡/스마트스토어용 SEO 키워드형 톤
 * - 단순 번역이 아니라 마켓별 톤으로 재구성 (사실 정보·스펙·셀링포인트는 동일)
 */
export function buildQoo10SystemPrompt(req: AIGenerateRequest): string {
  const isCosmetics = /화장품|뷰티|코스메|cosmetic|スキン|메이크업|립|アイ/i.test(req.category)
  const cosmeticsHint = isCosmetics
    ? `\n- 色商品の場合、"color_swatches" を含めること (例: NUDE BUTTER / BALLET PINK)
- パーソナルカラー (ブルベ / イエベ) のおすすめも記載`
    : ''

  return `あなたはQoo10ジャパンと韓国Coupangの両方でK-Beauty/K-Fashion商品を販売する専門コピーライターです。
今回は **同じ商品を日本語と韓国語の両方で同時に作成** してください — 1回の呼び出しで両言語を返すので、両方とも完全な独立した結果でなければなりません。

【トーンルール】

▼ 日本語 (Qoo10ジャパン用):
- 価格・割引の強調はしない (Qoo10メガポは別途バナーで表示)
- 日本の20-30代女性向けの感性カピー、ムードボード調
- 大きな英文タイトル + 日本語サブコピー (例: "NUDE BLUR STICK | ヌーディーブラースティック")
- カテゴリ別表現:
  · コスメ: "塗った瞬間、素の唇みたいな仕上がり" 系の感性
  · ファッション: "サラッと着られる" 系のライフスタイル感${cosmeticsHint}

▼ 한국어 (쿠팡/스마트스토어용):
- SEO 키워드 밀도 중시, 검색에 강한 상품명 (50자 목표)
- 가성비/혜택/기능 강조 가능 (당일발송 류 한국 특화 표현 OK)
- 카테고리·소재·핵심 키워드를 description에 자연스럽게 녹임
- 태그는 한국어 (해시 X, 일반 키워드)

【共通ルール】
- 사실관계 (성분, 원산지, 사이즈 등) 는 양쪽 동일
- 셀링포인트의 핵심 메시지도 동일하지만 톤만 다르게
- **ja와 ko 양쪽 모두 mood_callout / color_swatches / before_after 채울 것**
  · mood_callout: 양쪽 다 영문 그대로 (예: "NUDE BLUR STICK") — 시각 디자인 요소
  · color_swatches.english_label: 양쪽 다 영문 그대로 (예: "BALLET PINK")
  · color_swatches.name/description/personal_color: ja는 일본어, ko는 한국어
    (퍼스널컬러는 ja="ブルベ"/"イエベ", ko="쿨톤"/"웜톤")
  · before_after: ja={"塗布直後","一定時間経過後"}, ko={"바른 직후","시간 경과 후"}
- 양쪽 결과는 같은 큐텐 비주얼 템플릿에서 렌더링됨 → 어느 언어로 토글해도 시각 요소 유지되어야 함
- 다른 언어 텍스트가 섞이지 않게 (브랜드·고유명사·english_label·mood_callout은 예외)

商品情報 (商品情報):
- ブランド/브랜드: ${req.brand || 'なし'}
- 商品名 (元の韓国語) / 상품명: ${req.productName}
- 価格 / 가격: ${req.price}円 / ₩${req.price}
- カテゴリ / 카테고리: ${req.category}
- 特徴 / 특징: ${req.features.join(', ') || 'なし'}
${req.memo ? `- メモ / 메모: ${req.memo}` : ''}

必ず下記JSON形式で応答:
{
  "ja": {
    "content": {
      "product_name": "商品名(日本語30字)",
      "subtitle": "サブタイトル(40字)",
      "main_copy": "メインコピー(50字、感性的)",
      "mood_callout": "短い英文 (例: NUDE BLUR STICK)",
      "selling_points": ["3つ", "ライフスタイル感", "感性的"],
      "description": "商品説明(3-4段落、改行区切り)",
      "color_swatches": [{"name":"01 NUDE BUTTER","english_label":"NUDE BUTTER","description":"...","personal_color":"イエベ"}],
      "before_after": {"before":"塗布直後","after":"一定時間経過後"},
      "specs": [{"key":"ブランド","value":"..."}, {"key":"原産国","value":"韓国"}, ...最低5項目],
      "keywords": ["韓国コスメ", "..."],
      "caution": "ご注意事項"
    },
    "titles": [
      {"rank":1,"strategy":"感性ムード","title":"...","used_keywords":["..."],"char_count":50},
      {"rank":2,"strategy":"ブランド強調","title":"...","used_keywords":["..."],"char_count":50},
      {"rank":3,"strategy":"効能強調","title":"...","used_keywords":["..."],"char_count":50},
      {"rank":4,"strategy":"ライフスタイル","title":"...","used_keywords":["..."],"char_count":50},
      {"rank":5,"strategy":"韓国トレンド","title":"...","used_keywords":["..."],"char_count":50}
    ],
    "tags": ["#韓国コスメ", "...全20個"]
  },
  "ko": {
    "content": {
      "product_name": "상품명(한국어 30자)",
      "subtitle": "부제(40자)",
      "main_copy": "메인 카피(50자)",
      "mood_callout": "ja와 동일한 영문 (예: NUDE BLUR STICK) — 시각 요소",
      "selling_points": ["셀링포인트1", "셀링포인트2", "셀링포인트3"],
      "description": "상품 설명(3-4문단)",
      "color_swatches": [
        {"name":"01 누드 버터","english_label":"NUDE BUTTER","description":"차분한 무드의 베이지 로즈 컬러","personal_color":"웜톤"}
      ],
      "before_after": {"before":"바른 직후","after":"시간 경과 후"},
      "specs": [
        {"key":"제품의 주소재","value":"..."},
        {"key":"색상","value":"..."},
        {"key":"치수","value":"..."},
        {"key":"제조자(수입자)","value":"..."},
        {"key":"제조국","value":"..."},
        {"key":"취급시 주의사항","value":"..."},
        {"key":"품질보증기준","value":"..."},
        {"key":"A/S 책임자와 전화번호","value":"..."}
      ],
      "keywords": ["키워드1","키워드2"],
      "caution": "주의사항"
    },
    "titles": [
      {"rank":1,"strategy":"키워드 밀도 최대화","title":"...","used_keywords":["..."],"char_count":50},
      {"rank":2,"strategy":"브랜드 강조","title":"...","used_keywords":["..."],"char_count":50},
      {"rank":3,"strategy":"혜택/가성비 강조","title":"...","used_keywords":["..."],"char_count":50},
      {"rank":4,"strategy":"감성/라이프스타일","title":"...","used_keywords":["..."],"char_count":50},
      {"rank":5,"strategy":"스펙/기능 상세","title":"...","used_keywords":["..."],"char_count":50}
    ],
    "tags": ["태그1", "...총 20개"]
  }
}`
}

/**
 * 한국어 콘텐츠 → 일본어로 충실히 번역 (동기화 흐름)
 *
 * 사용자가 한국어를 직접 수정한 후 일본어 동기화를 누른 시점에 호출됨.
 * 따라서 **편집본을 충실히 번역**해야 하고, 자체 판단으로 톤을 재구성하면 안 됨.
 * 사용자 편집을 마음대로 다시 쓰면 동기화 의미가 없어짐.
 */
export function buildQoo10RewritePrompt(source: GeneratedAll): string {
  return `당신은 한국어→일본어 전문 번역가입니다.
사용자가 직접 편집한 한국어 상세페이지 콘텐츠를 일본어로 **정확하게 번역**하세요.

【번역 원칙 — 매우 중요】
- 사용자 편집본의 의미·사실관계·셀링포인트·강조점을 그대로 유지
- 절대 자체 판단으로 내용을 추가/삭제/변경하지 말 것
- 단순 직역으로 일본어가 어색해질 때만 자연스러운 의역 (의미 등가 보장)
- 새로운 정보·새로운 카피·다른 마켓 톤 변환 금지

【언어/지역 처리】
- 한국 특화 표현 (당일발송, 쿠팡, 무료배송 등) 은 일본 시장 등가물로 변환:
  · "당일발송" → "翌日発送可能" (실제 큐텐 환경에 맞게)
  · "쿠팡" 언급 자체는 제거 (자연스럽게 빼되 의미 유지)
- 가격 표기 ¥로 (이미 일본 마켓이므로)
- 일본어 자연스러운 어순/조사 사용
- 외래어/브랜드명은 가타카나 또는 원어 (사용자 표기 따름)

【시각 필드】
- mood_callout: 영문 그대로 유지 (NUDE BLUR STICK 등)
- color_swatches.english_label: 영문 그대로 유지 (BALLET PINK 등)
- color_swatches.name/description: 일본어로 번역
- color_swatches.personal_color: ブルベ/イエベ 로 변환 (한국어 쿨톤/웜톤 → 일본어)
- before_after: 일본어 자연스러운 표현 (예: "塗布直後" / "一定時間経過後")
- specs.key: 일본어로 (제품의 주소재→成分, 제조국→原産国 등)

원본 (한국어 — 사용자 편집본):
${JSON.stringify(source, null, 2)}

반드시 아래 JSON 형식으로 응답 (모든 텍스트 일본어):
{
  "content": {
    "product_name": "...",
    "subtitle": "...",
    "main_copy": "...",
    "mood_callout": "...(영문 유지)",
    "selling_points": ["...", "...", "..."],
    "description": "...",
    "color_swatches": [...] (있으면 유지, english_label 영문 유지),
    "before_after": {"before": "...", "after": "..."} (있으면 유지),
    "specs": [{"key":"成分","value":"..."}, ...],
    "keywords": ["..."],
    "caution": "..."
  },
  "titles": [{"rank":1,"strategy":"感性ムード","title":"...","used_keywords":["..."],"char_count":50}, ...計5個],
  "tags": ["...", ...計20個]
}

※ titles/tags 도 한국어 원본의 의미·전략을 그대로 따라 일본어로 번역. strategy 라벨도 일본어로.`
}
