import type { AIGenerateRequest, AITitleRequest, AITagRequest, GeneratedAll } from '@/types/ai'

/**
 * 쿠팡·스마트스토어용 — 한국어 SEO 키워드 폭격형 카피
 * 쿠팡 인기 검색어 활용 + 키워드 밀도 + 가성비 강조
 */
export function buildCoupangSystemPrompt(req: AIGenerateRequest, coupangSuggestions: string[] = []): string {
  const suggestionsText = coupangSuggestions.length > 0
    ? `\n- 쿠팡 인기 검색어: ${coupangSuggestions.join(', ')}`
    : ''

  return `당신은 한국 이커머스(쿠팡, 네이버 스마트스토어 등) 상세페이지 전문 카피라이터이자 SEO 전문가입니다.
상품 이미지와 정보를 분석하여 상세페이지 콘텐츠, 최적화 상품명 5개, 검색 태그 20개를 한번에 JSON으로 생성하세요.

상품 정보:
- 브랜드: ${req.brand || '없음'}
- 상품명: ${req.productName}
- 가격: ${req.price}원
- 카테고리: ${req.category}
- 판매 플랫폼: ${req.platform}
- 특징: ${req.features.join(', ') || '없음'}${suggestionsText}
${req.memo ? `- 메모: ${req.memo}` : ''}

반드시 아래 JSON 형식으로 응답:
{
  "content": {
    "product_name": "상품명 (30자 이내)",
    "subtitle": "부제 (40자 이내)",
    "main_copy": "메인 카피 (50자 이내, 임팩트 있게)",
    "selling_points": ["셀링포인트1", "셀링포인트2", "셀링포인트3"],
    "description": "상품 설명 (3-4문단, 줄바꿈으로 구분)",
    "specs": [
      {"key": "제품의 주소재", "value": "라벨 및 상세이미지 참고하여 소재 기재"},
      {"key": "색상", "value": "상품 색상"},
      {"key": "치수", "value": "사이즈 정보"},
      {"key": "제조자(수입자)", "value": "브랜드명 또는 수입자"},
      {"key": "제조국", "value": "제조국가"},
      {"key": "취급시 주의사항", "value": "세탁/보관 주의사항"},
      {"key": "품질보증기준", "value": "제품 이상 시 공정거래위원회 고시 소비자분쟁해결기준에 의거 보상합니다."},
      {"key": "A/S 책임자와 전화번호", "value": "고객센터 번호"}
    ],
    "keywords": ["키워드1", "키워드2"],
    "caution": "주의사항/안내 (1-2문장)"
  },
  "titles": [
    {"rank": 1, "strategy": "키워드 밀도 최대화", "title": "상품명", "used_keywords": ["키워드"], "char_count": 50},
    {"rank": 2, "strategy": "브랜드 강조", "title": "상품명", "used_keywords": ["키워드"], "char_count": 50},
    {"rank": 3, "strategy": "혜택/가성비 강조", "title": "상품명", "used_keywords": ["키워드"], "char_count": 50},
    {"rank": 4, "strategy": "감성/라이프스타일", "title": "상품명", "used_keywords": ["키워드"], "char_count": 50},
    {"rank": 5, "strategy": "스펙/기능 상세", "title": "상품명", "used_keywords": ["키워드"], "char_count": 50}
  ],
  "tags": ["태그1", "태그2", "태그3", "... 총 20개"]
}`
}

export function buildCoupangTitlePrompt(req: AITitleRequest): string {
  return `당신은 쿠팡 상품명 SEO 최적화 전문가입니다.
아래 정보를 바탕으로 쿠팡 검색 최적화된 상품명 5개를 생성하세요.

상품: ${req.productName}
카테고리: ${req.category}
브랜드: ${req.brand || '없음'}
참고 키워드: ${req.keywords.join(', ')}
쿠팡 인기 검색어: ${req.coupangSuggestions.join(', ')}

각 상품명은 다른 전략을 사용:
1. 키워드 밀도 최대화
2. 브랜드 강조
3. 혜택/가성비 강조
4. 감성/라이프스타일
5. 스펙/기능 상세

반드시 아래 JSON 배열로 응답:
[{"rank":1,"strategy":"전략명","title":"상품명","used_keywords":["사용키워드"],"char_count":50}]`
}

export function buildCoupangTagPrompt(req: AITagRequest): string {
  return `당신은 쿠팡 태그 최적화 전문가입니다.
아래 정보를 바탕으로 쿠팡 검색에 최적화된 태그 20개를 생성하세요.

상품: ${req.productName}
카테고리: ${req.category}
브랜드: ${req.brand || '없음'}
쿠팡 인기 검색어: ${req.coupangSuggestions.join(', ')}

규칙:
- 쿠팡 인기 검색어를 최대한 활용
- 핵심 키워드 + 롱테일 키워드 혼합
- 중복 없이 20개

반드시 JSON 문자열 배열로 응답: ["태그1", "태그2", ...]`
}

/**
 * 일본어 큐텐 콘텐츠 → 쿠팡 한국어 톤으로 재작성
 * 단순 번역 X. 감성 카피 → 키워드 밀도/가성비 톤으로 변환
 */
export function buildCoupangRewritePrompt(source: GeneratedAll): string {
  return `あなたは韓国Eコマース専門のリライターです。日本のQoo10向けコピーを韓国の쿠팡(Coupang)向けに「再執筆」してください。
単純な翻訳ではなく、ターゲット市場のトーンに合わせて書き直すこと。

【再執筆ルール】
- 日本の感性カピー → 韓国のSEOキーワード密度型カピーに変換
- 雰囲気強調 → 価格/お得感/機能強調へ
- 短くおしゃれ → 検索に強い長めの商品名へ (50文字目安)
- ハッシュタグは韓国Coupang向けキーワードに変換 (例: "#リップベース" → "립베이스")
- 仕様・注意事項は韓国の表記基準に合わせる (예: 공정거래위원회 고시 등)

원본 (日本語):
${JSON.stringify(source, null, 2)}

반드시 아래 JSON 형식으로 응답하되 모든 텍스트는 한국어로:
{
  "content": {
    "product_name": "...",
    "subtitle": "...",
    "main_copy": "...",
    "selling_points": ["...", "...", "..."],
    "description": "...",
    "specs": [{"key":"제품의 주소재","value":"..."}, ...],
    "keywords": ["..."],
    "caution": "..."
  },
  "titles": [{"rank":1,"strategy":"키워드 밀도 최대화","title":"...","used_keywords":["..."],"char_count":50}, ...총 5개],
  "tags": ["태그1", ...총 20개]
}`
}
