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
 * 일본어 콘텐츠 → 한국어로 충실히 번역 (동기화 흐름)
 *
 * 사용자가 일본어를 직접 편집한 후 한국어 동기화를 누른 시점에 호출됨.
 * 편집본을 충실히 번역해야 하고, 자체 판단으로 톤을 재구성하면 안 됨.
 */
export function buildCoupangRewritePrompt(source: GeneratedAll): string {
  return `당신은 일본어→한국어 전문 번역가입니다.
사용자가 직접 편집한 일본어 상세페이지 콘텐츠를 한국어로 **정확하게 번역**하세요.

【번역 원칙 — 매우 중요】
- 사용자 편집본의 의미·사실관계·셀링포인트·강조점을 그대로 유지
- 절대 자체 판단으로 내용을 추가/삭제/변경하지 말 것
- 단순 직역으로 한국어가 어색해질 때만 자연스러운 의역 (의미 등가 보장)
- 새로운 정보·새로운 카피·다른 마켓 톤 변환 금지

【언어/지역 처리】
- 일본 특화 표현은 한국 시장 등가물로:
  · "翌日発送" → "당일/익일 발송"
  · "Qoo10" 언급 자체는 제거 (한국 마켓이므로)
- 가격 표기 ₩로
- 한국어 자연스러운 어순/조사 사용
- 외래어/브랜드명은 한글 표기 또는 원어 (사용자 표기 따름)

【시각 필드 — 매우 중요】
다음 필드들은 **번역 대상이 아닌 시각 디자인 요소**입니다. 원본 값을 그대로 복사하세요:
- mood_callout: 원본의 영문 값 그대로 (예: "ROSE WATER TONER" → "ROSE WATER TONER")
  ※ 절대 번역/변경/삭제 금지. 원본에 있으면 출력에도 반드시 포함.
- color_swatches[].english_label: 원본 영문 그대로 (예: "BALLET PINK")
- color_swatches[].name/description: 한국어로 번역
- color_swatches[].personal_color: 일본어 ブルベ/イエベ → 한국어 쿨톤/웜톤
- before_after.before/after: 한국어 자연스러운 표현 (예: "바른 직후" / "시간 경과 후")
- specs[].key: 한국어로 (成分→제품의 주소재, 原産国→제조국 등)
- hashtags: 한국어로 번역 (#リップベース → #립베이스). 원본 개수 유지

【필수】 원본에 있는 모든 시각 필드는 출력에도 반드시 포함. 특히 mood_callout이 원본에 있으면
출력 JSON의 content.mood_callout 키를 빠뜨리면 안 됩니다.

원본 (日本語 — 사용자 편집본):
${JSON.stringify(source, null, 2)}

반드시 아래 JSON 형식으로 응답 (모든 텍스트 한국어, 단 시각 필드는 영문 그대로):
{
  "content": {
    "product_name": "...",
    "subtitle": "...",
    "main_copy": "...",
    "mood_callout": "${source.content.mood_callout || ''}",  ← 원본 값 그대로 복사 (있으면 필수)
    "selling_points": ["...", "...", "..."],
    "description": "...",
    "hashtags": ["#...", ...],  ← 원본에 있으면 한국어로 번역해서 포함
    "color_swatches": [...],  ← 원본에 있으면 반드시 포함, english_label 영문 그대로
    "before_after": {"before": "...", "after": "..."},  ← 원본에 있으면 반드시 포함
    "specs": [{"key":"제품의 주소재","value":"..."}, ...],
    "keywords": ["..."],
    "caution": "..."
  },
  "titles": [{"rank":1,"strategy":"키워드 밀도 최대화","title":"...","used_keywords":["..."],"char_count":50}, ...총 5개],
  "tags": ["...", ...총 20개]
}

※ titles/tags 도 일본어 원본의 의미·전략을 그대로 따라 한국어로 번역. strategy 라벨도 한국어로.`
}
