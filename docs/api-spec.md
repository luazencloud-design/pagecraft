# API 명세

모든 API는 `src/app/api/` 하위에 위치합니다.
인증이 필요한 엔드포인트는 Supabase Auth JWT를 `Authorization: Bearer <token>` 헤더로 전달합니다.

---

## AI 텍스트 생성

### POST /api/ai/copy

상품 정보 기반으로 상세페이지 카피를 생성합니다.

**Request:**
```json
{
  "productName": "여성 캐시미어 니트",
  "category": "상의/니트",
  "brand": "BRAND",
  "price": "39900",
  "features": ["캐시미어 혼방", "루즈핏"],
  "images": ["data:image/jpeg;base64,..."]
}
```

**Response:**
```json
{
  "product_name": "캐시미어 블렌드 라운드넥 니트",
  "subtitle": "부드러운 촉감, 매일 입고 싶은 니트",
  "main_copy": "...",
  "selling_points": ["...", "...", "..."],
  "description": "...",
  "specs": [{"key": "소재", "value": "캐시미어 10%, 울 90%"}, ...],
  "keywords": ["캐시미어니트", "여성니트", ...],
  "caution": "..."
}
```

**Service:** `ai.service.ts` → Claude Sonnet API

---

### POST /api/ai/titles

SEO 최적화 상품명 5개를 생성합니다.

**Request:**
```json
{
  "productName": "여성 캐시미어 니트",
  "category": "상의/니트",
  "platform": "쿠팡"
}
```

**Response:**
```json
{
  "titles": [
    {"strategy": "키워드형", "title": "[브랜드] 여성 캐시미어 니트 라운드넥 루즈핏"},
    {"strategy": "혜택형", "title": "..."},
    {"strategy": "감성형", "title": "..."},
    {"strategy": "스펙형", "title": "..."},
    {"strategy": "시즌형", "title": "..."}
  ]
}
```

---

### POST /api/ai/tags

쿠팡 검색 최적화 태그 20개를 생성합니다.

**Request:**
```json
{
  "productName": "여성 캐시미어 니트",
  "category": "상의/니트",
  "titles": ["선택된 상품명"]
}
```

**Response:**
```json
{
  "tags": ["캐시미어니트", "여성니트", "라운드넥", ...]
}
```

---

## AI 이미지

### POST /api/image/generate

원본 이미지 1장으로 상품 이미지 7장을 생성합니다.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "productName": "여성 캐시미어 니트",
  "category": "상의/니트",
  "styles": ["white_bg", "lifestyle", "detail", "infographic"]
}
```

**Response:**
```json
{
  "images": [
    {"type": "white_bg_front", "url": "data:image/png;base64,..."},
    {"type": "white_bg_45deg", "url": "..."},
    {"type": "lifestyle", "url": "..."},
    ...
  ]
}
```

**Service:** `image.service.ts` → GPT Image 1.5 API
**주의:** 7장 생성에 30초+ 소요. 클라이언트에서 폴링 또는 긴 타임아웃 필요.

---

### POST /api/image/inpaint

이미지에서 가격태그를 감지하고 인페인팅으로 제거합니다.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "mask": "data:image/png;base64,..."
}
```

`mask`는 선택사항. 없으면 자동 감지 시도.

**Response:**
```json
{
  "image": "data:image/png;base64,..."
}
```

**Service:** `image.service.ts` → Stability AI (Replicate)

---

## 상세페이지 렌더링

### POST /api/render

상품 데이터 + 이미지로 상세페이지 PNG를 생성합니다.

**Request:**
```json
{
  "data": {
    "product_name": "...",
    "subtitle": "...",
    "main_copy": "...",
    "selling_points": ["...", "...", "..."],
    "description": "...",
    "specs": [{"key": "...", "value": "..."}],
    "keywords": ["..."],
    "caution": "..."
  },
  "price": "39,900",
  "images": ["data:image/jpeg;base64,..."],
  "template": "fashion"
}
```

**Response:** Binary PNG (`Content-Type: image/png`)

**Service:** `render.service.ts` → `@napi-rs/canvas`
**주의:** 렌더링에 10~60초 소요. Vercel Pro 필요 (60초 타임아웃).

---

## 시장 데이터

### GET /api/market?keyword={keyword}

쿠팡에서 해당 키워드의 시장 데이터를 조회합니다.

**Response:**
```json
{
  "keyword": "캐시미어 니트",
  "sellerCount": 42,
  "lowestPrice": 19900,
  "averagePrice": 34500,
  "estimatedMonthlySales": 1200
}
```

---

### GET /api/market/suggest?keyword={keyword}

쿠팡 자동완성 키워드를 조회합니다.

**Response:**
```json
{
  "suggestions": ["캐시미어 니트 여성", "캐시미어 니트 남성", ...]
}
```

**Service:** `market.service.ts` → 쿠팡 자동완성 API 프록시
