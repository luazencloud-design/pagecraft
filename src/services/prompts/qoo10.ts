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
- 日本語ハッシュタグ (例: "#リップベース", "#密着ブラーリップ")
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
- ja 결과에는 mood_callout / hashtags / color_swatches / before_after 일본어 옵션 필드 채움
- ko 결과에는 그 옵션 필드들 비워둠 (한국 템플릿은 미사용)
- 어떤 출력에도 다른 언어 텍스트가 섞이지 않게 (브랜드·고유명사는 예외)

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
      "hashtags": ["#リップベース", "#密着リップ"],
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
      "selling_points": ["셀링포인트1", "셀링포인트2", "셀링포인트3"],
      "description": "상품 설명(3-4문단)",
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
 * 한국 쿠팡 콘텐츠 → 큐텐 일본어 톤으로 재작성
 * 단순 번역 X. SEO 키워드형 → 감성·무드 톤으로 변환
 */
export function buildQoo10RewritePrompt(source: GeneratedAll): string {
  return `당신은 한국 K-뷰티/K-패션 상품을 일본 큐텐(Qoo10) 시장에 맞게 재작성하는 전문 일본어 카피라이터입니다.
단순 번역이 아니라 일본 큐텐 스타일 (감성 무드보드, K-뷰티 공식몰 톤)으로 재구성하세요.

【재작성 규칙】
- 한국 키워드 폭격형 상품명 → 일본어 깔끔한 무드 카피로 변환
- 가격/할인 강조 → 라이프스타일 무드 강조로 전환 (큐텐은 메가포 배너 별도 운영)
- "당일발송", "무료배송" 같은 한국 특화 문구는 제거
- 색조 화장품이면 일본 큐텐식 BALLET PINK / BABY PINK 등 영문 색상명 + ブルベ/イエベ 추천 추가
- 해시태그는 일본어로 변환 (#립베이스 → #リップベース)
- specs 항목명도 일본어로 ("제품의 주소재" → "成分", "제조국" → "原産国" 등)

원본 (한국어):
${JSON.stringify(source, null, 2)}

반드시 아래 JSON 형식으로 응답 (모든 텍스트 일본어):
{
  "content": {
    "product_name": "...(日本語30字以内)",
    "subtitle": "...",
    "main_copy": "...",
    "mood_callout": "...(短い英文)",
    "selling_points": ["...", "...", "..."],
    "description": "...",
    "hashtags": ["#...", ...],
    "color_swatches": [...] (色商品の場合),
    "before_after": {"before": "...", "after": "..."} (該当時),
    "specs": [{"key":"成分","value":"..."}, ...],
    "keywords": ["..."],
    "caution": "..."
  },
  "titles": [{"rank":1,"strategy":"感性ムード","title":"...","used_keywords":["..."],"char_count":50}, ...計5個],
  "tags": ["#...", ...計20個]
}`
}
