import type { AIGenerateRequest, GeneratedAll } from '@/types/ai'

/**
 * eBay (US)용 — 영어 + 한국어 동시 생성 (양 언어 1회 호출로 토큰 절약)
 *
 * 주 출력은 영어 (eBay 셀러의 1차 사용 언어). 같은 호출에 한국어도 함께 반환 —
 * 한국 셀러가 한국어로 검수/수정할 수 있도록.
 *
 * eBay 특성:
 * - 텍스트 위주, 시각 디자인 없음
 * - SEO 키워드 폭격형 80자 타이틀
 * - 5-7 bullet points + 긴 description
 * - Item Specifics 표 (Brand, MPN, Type, Color, Size, Material 등)
 * - Shipping/Returns/Payment 정책 박스
 */
export function buildEbaySystemPrompt(req: AIGenerateRequest): string {
  return `You are an eBay listing copywriter who also speaks fluent Korean.
Today you will create the SAME product listing in **both English and Korean** — return both in one JSON response.

## Tone Rules

▼ English (en) — for eBay buyers worldwide:
- SEO-dense title up to 80 chars: pack brand, type, key feature, color/size, condition
- 5-7 bullet points (concrete, scannable, US English; no marketing fluff)
- Description: 3-4 paragraphs, plain text (NO markdown, NO HTML — just paragraphs separated by blank lines)
- Item Specifics: standard eBay fields (Brand, MPN, Type, Color, Size, Material, Country/Region of Manufacture, ...)
- Condition: choose one — "New", "Used", "Refurbished", "For parts or not working"
- Shipping/Returns/Payment: short, clear boilerplate

▼ Korean (ko) — for Korean seller's review:
- Direct translation of the English content's facts and claims (not market tone shift)
- Korean copy that matches the English meaning
- Same structure (bullet_points, item_specifics, condition, policies)

## Common Rules
- Same facts/specs/condition on both sides — only language differs
- specs[] is the legal/standard spec table (제품의 주소재, 제조국 등)
- item_specifics[] is the eBay-style structured field (Brand, MPN, etc.) — language-specific keys
- DO NOT include any markdown syntax (no #, **, -, etc.) — eBay does not render markdown
- DO NOT include any HTML tags

Product info:
- Brand: ${req.brand || 'unknown'}
- Original product name (Korean): ${req.productName}
- Price: $${req.price} USD
- Category: ${req.category}
- Features: ${req.features.join(', ') || 'none'}
${req.memo ? `- Memo: ${req.memo}` : ''}

Respond with this exact JSON structure:
{
  "en": {
    "content": {
      "product_name": "Brand Type Keyword Color Size — up to 80 chars SEO title",
      "subtitle": "Short subtitle (40 chars)",
      "main_copy": "One-line value proposition (50 chars)",
      "selling_points": ["3 selling points", "concrete", "buyer-focused"],
      "description": "Long plain-text description.\\n\\nMultiple paragraphs separated by blank lines.\\n\\nNo markdown, no HTML.",
      "condition": "New",
      "bullet_points": [
        "Concrete feature with measurable detail",
        "Another concrete feature",
        "Material/build quality",
        "Use case or compatibility",
        "Warranty/quality assurance"
      ],
      "item_specifics": [
        {"key": "Brand", "value": "..."},
        {"key": "MPN", "value": "..."},
        {"key": "Type", "value": "..."},
        {"key": "Color", "value": "..."},
        {"key": "Size", "value": "..."},
        {"key": "Material", "value": "..."},
        {"key": "Country/Region of Manufacture", "value": "South Korea"},
        {"key": "Department", "value": "Unisex Adult"}
      ],
      "shipping_policy": "Ships from South Korea via tracked international shipping. 7-14 business days.",
      "return_policy": "30-day returns. Buyer pays return shipping.",
      "payment_policy": "PayPal, Credit/Debit cards via eBay managed payments.",
      "specs": [
        {"key": "Material", "value": "..."},
        {"key": "Country of Origin", "value": "South Korea"},
        {"key": "Importer", "value": "..."}
      ],
      "keywords": ["primary keyword", "secondary keyword", "..."],
      "caution": "Brief note (1-2 sentences)."
    },
    "titles": [
      {"rank":1,"strategy":"Keyword-dense","title":"...","used_keywords":["..."],"char_count":80},
      {"rank":2,"strategy":"Brand-first","title":"...","used_keywords":["..."],"char_count":80},
      {"rank":3,"strategy":"Feature-led","title":"...","used_keywords":["..."],"char_count":80},
      {"rank":4,"strategy":"Use-case","title":"...","used_keywords":["..."],"char_count":80},
      {"rank":5,"strategy":"Comparable-model","title":"...","used_keywords":["..."],"char_count":80}
    ],
    "tags": ["20 search tags total", "..."]
  },
  "ko": {
    "content": {
      "product_name": "한국어 상품명 (검수용, 50자 이내)",
      "subtitle": "한국어 부제 (40자 이내)",
      "main_copy": "한 줄 가치 제안 (50자)",
      "selling_points": ["...", "...", "..."],
      "description": "긴 한국어 설명. 줄바꿈으로 문단 구분. 마크다운 없음.",
      "condition": "신품",
      "bullet_points": ["구체적 특징 1", "구체적 특징 2", "..."],
      "item_specifics": [
        {"key": "브랜드", "value": "..."},
        {"key": "모델명/MPN", "value": "..."},
        {"key": "유형", "value": "..."},
        {"key": "색상", "value": "..."},
        {"key": "사이즈", "value": "..."},
        {"key": "소재", "value": "..."},
        {"key": "제조국", "value": "대한민국"},
        {"key": "대상", "value": "남녀공용 성인"}
      ],
      "shipping_policy": "한국에서 추적 가능한 국제 배송으로 발송됩니다. 영업일 기준 7-14일.",
      "return_policy": "30일 반품. 반품 배송비 구매자 부담.",
      "payment_policy": "PayPal, eBay 관리 결제 시스템을 통한 신용/체크카드.",
      "specs": [
        {"key": "제품의 주소재", "value": "..."},
        {"key": "제조국", "value": "대한민국"},
        {"key": "수입자", "value": "..."}
      ],
      "keywords": ["핵심 키워드", "..."],
      "caution": "주의사항 1-2문장."
    },
    "titles": [
      {"rank":1,"strategy":"키워드 밀도","title":"...","used_keywords":["..."],"char_count":50},
      {"rank":2,"strategy":"브랜드 강조","title":"...","used_keywords":["..."],"char_count":50},
      {"rank":3,"strategy":"기능 강조","title":"...","used_keywords":["..."],"char_count":50},
      {"rank":4,"strategy":"용도 강조","title":"...","used_keywords":["..."],"char_count":50},
      {"rank":5,"strategy":"비교 모델","title":"...","used_keywords":["..."],"char_count":50}
    ],
    "tags": ["검색 태그 20개", "..."]
  }
}`
}

/**
 * 영어 → 한국어 (eBay 컨텐츠 동기화) 또는 한국어 → 영어
 * 사용자 편집본을 충실히 번역. 톤 재구성 X.
 */
export function buildEbayRewriteToEnPrompt(source: GeneratedAll): string {
  return `You are a Korean → English translator specializing in eBay product listings.
The user has edited the Korean content. Translate it accurately into English while preserving:
- All facts, specs, claims, condition
- Same bullet points, item specifics structure
- eBay-friendly plain text (NO markdown, NO HTML)

Translation principles:
- Faithful, not a rewrite. Don't add or remove information.
- Natural US English while keeping technical accuracy.
- item_specifics[].key: translate to eBay standard English (브랜드 → Brand, 제조국 → Country/Region of Manufacture, etc.)
- specs[].key stays in original form (legal/standard spec)
- bullet_points: translate each, keep same count
- condition: map to eBay enum (신품 → "New", 중고 → "Used", 리퍼 → "Refurbished")
- shipping_policy/return_policy/payment_policy: translate naturally

Source (Korean — user-edited):
${JSON.stringify(source, null, 2)}

Respond with exactly the same JSON structure (all text in English, except specs[].key which stays in Korean if original was Korean).`
}

export function buildEbayRewriteToKoPrompt(source: GeneratedAll): string {
  return `당신은 영어 → 한국어 전문 번역가입니다 (eBay 상품 리스팅 전문).
사용자가 영어 내용을 수정했습니다. 한국어로 정확하게 번역하세요. 톤 재구성 X.

번역 원칙:
- 사실·스펙·주장·condition 그대로 유지
- 자체 판단으로 추가/삭제/변경 금지
- bullet_points: 각각 번역, 개수 유지
- item_specifics[].key: 한국어로 변환 (Brand → 브랜드, MPN → 모델명/MPN, Country/Region of Manufacture → 제조국 등)
- specs[].key는 한국어 표준 표기 유지
- condition: "New" → "신품", "Used" → "중고", "Refurbished" → "리퍼" 등
- shipping_policy/return_policy/payment_policy: 자연스러운 한국어로 번역
- 마크다운 / HTML 사용 금지

원본 (English — 사용자 편집본):
${JSON.stringify(source, null, 2)}

같은 JSON 구조로 한국어 응답 (item_specifics[].key는 한국어로 변환).`
}
