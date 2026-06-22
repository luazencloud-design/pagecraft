# PageCraft 아키텍처

> 현재 구현 기준. 시스템 구조 · 인증 흐름 · 데이터 흐름.

---

## 1. 전체 그림

```
┌─────────────────────────────────────────────────────────┐
│  브라우저 (Next.js App Router, React 19, Zustand)         │
│   - /product/new : 메인 작업 화면                          │
│   - /admin       : 관리자 (초대 링크 관리)                 │
│   - 상태: zustand 스토어 + localStorage + IndexedDB        │
└───────────────┬─────────────────────────────────────────┘
                │ fetch (lib/api.ts) — x-gemini-key 헤더 자동 첨부
┌───────────────▼─────────────────────────────────────────┐
│  Next.js API Routes (src/app/api/*)                       │
│   - AI 라우트: aiGate 로 인가 → ai.service 호출            │
│   - auth/oauth/admin 라우트: 세션·초대·구글 OAuth          │
└──────┬───────────────────────┬────────────────┬──────────┘
       │                       │                │
   Gemini API            Upstash Redis      구글 OAuth
   (텍스트/이미지)        (초대·크레딧)      (로그인)
```

- **프론트/백엔드 한 몸** (Next.js 풀스택). 별도 서버 없음.
- **DB 없음.** 영속 데이터는 Redis(초대/크레딧) + 클라이언트(localStorage/IndexedDB).

---

## 2. 인증·사용 인가 (핵심)

AI 호출은 **둘 중 하나**로 인가됨. `src/lib/aiGate.ts`가 판단:

```
AI 요청 → aiGate.authorizeAi(req, creditType, multiplier)
  ├─ 헤더에 x-gemini-key 있음?  → BYOK 모드 (그 키 사용, 크레딧 차감 X)
  └─ 없음 → 체험 세션 쿠키 확인
       ├─ 세션 없음 → 401 (로그인 또는 키 필요)
       ├─ 초대 삭제/만료됨 → 403 (호출마다 재확인)
       ├─ 크레딧 부족/만료 → 402
       └─ OK → 서버 GEMINI_API_KEY + 크레딧 차감
```

키는 **AsyncLocalStorage**(`lib/apiKeyContext.ts`)로 주입 → `ai.service`의 `getApiKey()`가 요청별 키를 읽음 (함수 시그니처 불변 + 동시요청 격리).

### 무료 체험 흐름 (초대 + 구글)

```
관리자가 /admin 에서 초대 생성 (이름 + 유효기간)
  → 초대 = { id, name, version, expiresAt } (Redis 저장)
  → 링크 = /api/auth/invite?token=<jose JWT: id+version>

사용자가 링크 클릭
  → /api/auth/invite : 토큰 검증(서명+버전+유효기간)
  → 구글 OAuth (state에 invite id 서명해서 전달)
  → /api/oauth/google/callback : 구글 이메일 획득
       → 초대 재확인 → activateTrial(이메일) → 세션 쿠키 발급
  → /product/new

세션 쿠키 pc_session = { sub: 구글이메일, inv: 초대id, name }
  - 크레딧은 이메일별 추적 (1인 1체험, ever 마커)
  - inv 로 매 호출마다 초대 유효성 재확인 → 삭제/만료 시 즉시 차단
```

### 관리자 흐름

```
/admin → "Google 로그인" → /api/oauth/google/start?admin=1
  → 구글 OAuth → /callback (state.purpose=admin)
  → 이메일이 ADMIN_EMAILS 에 있으면 → 관리자 세션 쿠키(pc_admin)
  → /admin 초대 CRUD (모든 /api/admin/* 는 requireAdmin 검사)
```

### 토큰/쿠키 종류 (`lib/session.ts`, jose JWT, AUTH_SECRET 서명)

| 토큰 | 쿠키 | 만료 | 내용 |
|---|---|---|---|
| 체험 세션 | `pc_session` | 30일 | 구글이메일 + 초대id + 이름 |
| 관리자 세션 | `pc_admin` | 7일 | 관리자 이메일 |
| 초대 토큰 | (URL 토큰) | 무기한 | 초대id + version (재생성 시 version++로 무효화) |
| OAuth state | (1회성) | 15분 | purpose(admin/invite) + 초대id |

---

## 3. 크레딧 (무료 체험)

`src/lib/trial.ts` — 이메일당 1회, 30일 한정.

- **키**(Redis): `trial:{email}:ever`(영구 마커) / `:start`(TTL 30일) / `:used`(TTL 30일)
- `ever`가 있으면 만료 후 재활성 불가 → **무한 체험 방지**
- 비용: `generate 1 / image 5 / bg-remove 5 / regen 1 / gift 1`, 총 `TRIAL_CREDITS=500`
- 차감은 `aiGate`에서, 실패 시 `refundIfTrial`로 환불 (풀세트는 부분 실패 부분 환불)
- 관리자(`ADMIN_EMAILS`)는 무제한

---

## 4. AI 파이프라인 (`services/ai.service.ts`)

| 기능 | 함수 | 모델 |
|---|---|---|
| 상세페이지 통합 생성 | `generateAll` | text |
| 상품명/태그 | `generateTitles` / `generateTags` | text |
| 부분 재생성 | `regenerateField` | text |
| 사은품 설명 | `describeGiftImage` | text(vision) |
| 모델 시착 이미지 | `generateModelImage` | image |
| 이미지 풀세트 | `generateImageSet` (모델 1 + 각도 N-1) | image |
| 배경 제거 | `removeBackground` | image |
| 카테고리 자동 검출 | `detectProductCategoryFromImages` | text(vision) |

- **프롬프트는 플랫폼별 분리**: `services/prompts/{coupang,qoo10,ebay}.ts`
- **카메라 프레이밍**: `getCameraFocus(category, productName)` — 카테고리/상품명별로 얼굴/상체/하체/전신 컷 결정 (프롬프트 첫 문장에 영문 표준 촬영용어 박음)

---

## 5. 클라이언트 상태 (Zustand 스토어)

| 스토어 | 영속화 | 역할 |
|---|---|---|
| `productStore` | localStorage | 상품 정보(브랜드/상품명/카테고리/플랫폼/템플릿) |
| `imageStore` | IndexedDB + localStorage | 상품 이미지·스토어소개·약관·사은품·썸네일 |
| `editorStore` | localStorage | AI 생성 결과(언어별 캐시), 로딩/에러 상태 |
| `draftsStore` | localStorage | 다중 드래프트(병렬 작업) 스냅샷 |
| `apiKeyStore` | localStorage | BYOK Gemini 키 |
| `authStore` | (조회) | 무료 체험 로그인 상태 + 크레딧 (/api/auth/me) |

- **다중 드래프트**: 라이브 작업본 + 드래프트별 스냅샷. 이미지는 드래프트 ID로 IndexedDB 네임스페이스 분리.

---

## 6. 출력 (다운로드)

| 출력 | 구현 |
|---|---|
| 상세페이지 PNG/JPEG | `html-to-image`로 미리보기 DOM 캡처. **쿠팡은 10MB 이하 JPEG 자동 압축** |
| 상세페이지 HTML | `lib/htmlExport.ts` — outerHTML standalone 문서 |
| 큐텐 ZIP | `lib/qoo10Export.ts` — Hybrid(HTML+이미지) / Sliced(통째 슬라이스) 2종 |
| 이베이 | `lib/ebayHtml.ts` — 클립보드 rich HTML |
| 600×600 썸네일 | `ExportPanel.tsx` — 캔버스 크롭 + 사은품 배지 |

---

## 7. 의도적으로 안 쓰는 것

- **DB**: Redis + 클라이언트 저장으로 충분 (단순성)
- **NextAuth**: 경량 jose JWT 직접 구현 (관리자/사용자 OAuth)
- **이메일 발송**: 초대 링크는 관리자가 URL 직접 배포 (메일 서비스 불필요)
- **Replicate**: 배경 제거를 Gemini로 통합 (키 하나로 전 기능)
