import type { AIGenerateRequest, GeneratedAll } from '@/types/ai'

/**
 * Qoo10 Japan용 — 일본어 감성·무드 톤
 * K-뷰티/K-패션 브랜드 공식몰 스타일 (카라그램·아누아·이니스프리 큐텐 페이지 분석 기반)
 *
 * 특징:
 * - 큰 영문 타이틀 + 일본어 부제 무드보드 형식
 * - 색조 화장품일 경우 색상별 swatch + パーソナルカラー (ブルベ/イエベ) 추천
 * - 사용 전/후 비교 컷 (塗布直後 / 一定時間経過後 등)
 * - 가격 강조 X, 라이프스타일 톤
 */
export function buildQoo10SystemPrompt(req: AIGenerateRequest): string {
  const isCosmetics = /화장품|뷰티|코스메|cosmetic|뷰티|스킨|메이크업|립|아이/i.test(req.category)
  const cosmeticsHint = isCosmetics
    ? `\n- カラー商品の場合、必ず "color_swatches" を含めること (例: NUDE BUTTER / BALLET PINK)
- パーソナルカラー (ブルベ / イエベ) のおすすめも記載`
    : ''

  return `あなたはQoo10ジャパンで韓国コスメ・ファッション商品を販売する専門の日本語コピーライターです。
韓国ブランドの感性的なムードを保ちながら、日本人ユーザーに刺さるトーンで作成してください。

【トーンルール】
- 価格や割引の強調はしない (Qoo10のメガポ等は別途バナーで表示される)
- 単純翻訳ではなく、日本の20-30代女性向けの感性カピー
- 大きな英文タイトル + 日本語サブコピーの構成 (例: "NUDE BLUR STICK | ヌーディーブラースティック")
- ハッシュタグは日本語 (例: "#リップベース", "#密着ブラーリップ")
- カテゴリ別表現:
  · コスメ: "塗った瞬間、素の唇みたいな仕上がり" 系の感性
  · ファッション: "サラッと着られる" 系のライフスタイル感${cosmeticsHint}

商品情報:
- ブランド: ${req.brand || 'なし'}
- 商品名(韓国語の元): ${req.productName}
- 価格: ${req.price}円
- カテゴリ: ${req.category}
- 特徴: ${req.features.join(', ') || 'なし'}
${req.memo ? `- メモ: ${req.memo}` : ''}

必ず下記JSON形式で応答 (すべて日本語で):
{
  "content": {
    "product_name": "商品名 (日本語30文字以内)",
    "subtitle": "サブタイトル (日本語40文字以内、感性的に)",
    "main_copy": "メインコピー (50文字以内、感性的なフレーズ)",
    "mood_callout": "短い英文 (例: NUDE BLUR STICK)",
    "selling_points": ["3つ", "ライフスタイル感あり", "感性的に"],
    "description": "商品説明 (3-4段落、改行区切り)",
    "hashtags": ["#リップベース", "#密着リップ", "...4-6個"],
    "color_swatches": [
      {"name": "01 NUDE BUTTER", "english_label": "NUDE BUTTER", "description": "落ち着いたムードのベージュローズカラー", "personal_color": "イエベ"}
    ],
    "before_after": {"before": "塗布直後", "after": "一定時間経過後"},
    "specs": [
      {"key": "ブランド", "value": "ブランド名"},
      {"key": "原産国", "value": "韓国"},
      {"key": "内容量", "value": "容量"},
      {"key": "成分", "value": "主要成分"},
      {"key": "使用方法", "value": "使い方"},
      {"key": "注意事項", "value": "注意事項"},
      {"key": "輸入販売元", "value": "ショップ名"}
    ],
    "keywords": ["韓国コスメ", "Qoo10", "..."],
    "caution": "ご注意事項 (1-2文)"
  },
  "titles": [
    {"rank": 1, "strategy": "感性ムード", "title": "...", "used_keywords": ["..."], "char_count": 50},
    {"rank": 2, "strategy": "ブランド強調", "title": "...", "used_keywords": ["..."], "char_count": 50},
    {"rank": 3, "strategy": "効能強調", "title": "...", "used_keywords": ["..."], "char_count": 50},
    {"rank": 4, "strategy": "ライフスタイル", "title": "...", "used_keywords": ["..."], "char_count": 50},
    {"rank": 5, "strategy": "韓国トレンド", "title": "...", "used_keywords": ["..."], "char_count": 50}
  ],
  "tags": ["#韓国コスメ", "...全20個 (日本語ハッシュタグ含む)"]
}

注意:
- color_swatches は色商品(リップ/アイシャドウ/チークなど)のみ。それ以外は省略可
- mood_callout, before_after も該当しない場合は省略可
- 必ず "content.specs" は最低5項目
- 一切の韓国語を含めない (固有名詞・ブランド名は除く)`
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
