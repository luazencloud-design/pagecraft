# API 명세

모든 API는 `src/app/api/` 하위. 인가는 `lib/aiGate.ts`(AI) / `lib/adminAuth.ts`(관리자).

## 공통

- AI 라우트는 **클라이언트가 `x-gemini-key` 헤더를 자동 첨부**(`lib/api.ts`).
  - 헤더 있으면 → **BYOK**(그 키, 크레딧 X)
  - 없으면 → **무료 체험**(세션 쿠키 + 서버 키 + 크레딧 차감)
- 에러 응답: `{ "error": "메시지" }` + HTTP status
  - `401` 로그인/키 필요 · `402` 크레딧 부족/만료 · `403` 초대 만료·삭제 / 관리자 아님 · `400` 입력 오류 · `500` 서버 오류

---

## AI 라우트

### `POST /api/ai/copy`
상세페이지 통합 생성 (content + titles + tags). 크레딧 `generate`(1).
- req: `{ images[], brand, productName, price, category, platform, memo, features[], coupangSuggestions? }`
- res: `GeneratedByLang` (한국 `{ko}`, 큐텐 `{ja,ko}`, 이베이 `{en,ko}`)

### `POST /api/ai/titles` · `POST /api/ai/tags`
상품명 5개 / 태그 20개. 크레딧 `generate`(1).

### `POST /api/ai/regen`
단일 필드 재생성. 크레딧 `regen`(1).
- req: `{ field, brand, productName, price, category, platform, currentContent }`
- field ∈ `product_name|subtitle|main_copy|selling_points|description|keywords|caution`
- res: `{ [field]: ... }`

### `POST /api/ai/gift-describe`
사은품 설명. 크레딧 `gift`(1).
- req: `{ image(dataURL), productName? }` → res: `{ description }`

### `POST /api/image/generate`
모델 시착 이미지 1장. 크레딧 `image`(5). maxDuration 60.
- req: `{ productName, category, gender, images[] }` → res: `{ image(dataURL) }`

### `POST /api/image/generate-set`
풀세트(모델 1 + 각도 N-1). 크레딧 `image × count`. 부분 실패분 환불.
- req: `{ productName, category, gender, images[], count(1~6) }`
- res: `{ images[], generated, requested }`

### `POST /api/image/bg-remove`
배경 제거. 크레딧 `bg-remove`(5). 모드별 모델 분기 — 체험=Recraft(Replicate), BYOK=Gemini.
- req: `{ image(dataURL) }` → res: `{ image(dataURL) }`

### `POST /api/translate`
한↔일/영 톤 재작성. 크레딧 `generate`(1).
- req: `{ current(GeneratedAll), fromLang, toLang, targetPlatform }` → res: `GeneratedAll`

### `GET /api/market/suggest?keyword=`
쿠팡 인기검색어 (AI 아님, 키 불필요). res: `{ suggestions[] }`

---

## 인증/세션 라우트

### `GET /api/auth/invite?token=`
초대 링크 진입점. 토큰 검증(서명+버전+유효기간) → 구글 OAuth로 리다이렉트.

### `GET /api/auth/me`
현재 체험 로그인 상태. res: `{ loggedIn, name?, email?, trial? }` (초대 삭제/만료면 `loggedIn:false`)

### `POST /api/auth/logout`
체험 세션 쿠키 제거.

### `GET /api/oauth/google/start?admin=1`
관리자 구글 로그인 시작. (사용자 로그인은 `/api/auth/invite`에서 시작)

### `GET /api/oauth/google/callback?code=&state=`
구글 콜백. `state.purpose`로 분기:
- `admin` → ADMIN_EMAILS 확인 → 관리자 세션 → `/admin`
- `invite` → 초대 재확인 → 체험 활성화 → 체험 세션 → `/product/new`

---

## 관리자 라우트 (전부 `requireAdmin`)

### `GET /api/admin/invites`
초대 목록 + 각자 체험 상태 + 링크. res: `{ admin, invites[] }`

### `POST /api/admin/invites`
초대 생성. req: `{ name, expiresAt?(ms) }` → res: `{ invite }`

### `PATCH /api/admin/invites/[id]`
수정. req: `{ action: 'rename'|'regenerate'|'expiry', name?, expiresAt? }`

### `DELETE /api/admin/invites/[id]`
삭제 (그 링크 사용자도 즉시 차단됨).

### `POST /api/admin/logout`
관리자 세션 제거.
