# 온보딩 / 인수인계 가이드

> 이 프로젝트를 처음 받는 개발자가 **이 문서만 보고 바로 손댈 수 있게** 작성.
> 먼저 [README.md](../README.md)로 세팅·실행 → 이 문서로 구조 파악.

---

## 1. 30초 요약

- **Next.js 16 풀스택** 앱. 프론트(React)와 API(라우트 핸들러)가 한 repo.
- **DB 없음.** 데이터는 Redis(초대/크레딧) + 브라우저(localStorage/IndexedDB).
- **AI는 Gemini** (텍스트/이미지). 단 배경제거는 경로별 분기 — 체험=Recraft(Replicate), BYOK=Gemini.
- **두 사용 모드**: 무료 체험(초대링크+구글로그인+크레딧) / BYOK(본인 키). 직원용 **무제한 초대**도 있음(크레딧·기간 제한 없음).
- 인가 핵심 파일: `src/lib/aiGate.ts`.

---

## 2. 폴더 구조 한눈에

```
pagecraft/
├─ src/
│  ├─ app/            ← 페이지 + API 라우트 (Next App Router)
│  ├─ components/     ← React 컴포넌트
│  ├─ hooks/          ← 클라이언트 훅 (AI 호출 등)
│  ├─ stores/         ← Zustand 전역 상태
│  ├─ services/       ← 서버 비즈니스 로직 (AI 호출 + 프롬프트)
│  ├─ lib/            ← 유틸 (인증/세션/크레딧/내보내기/이미지 등)
│  ├─ types/          ← TypeScript 타입
│  └─ templates/      ← 템플릿 메타
├─ docs/              ← 문서 (이 폴더)
├─ public/            ← 정적 파일
└─ .env.example       ← 환경변수 템플릿
```

---

## 3. 파일별 용도 (전체)

### `src/app/` — 페이지 + API

**페이지**
| 경로 | 용도 |
|---|---|
| `app/page.tsx` | 랜딩 — `/product/new`로 리다이렉트 |
| `app/product/new/page.tsx` | **메인 작업 화면** (좌:입력 / 중:미리보기·다운로드 / 우:결과탭) |
| `app/admin/page.tsx` | **관리자** — 구글 로그인 + 초대 CRUD UI |
| `app/layout.tsx` | 루트 레이아웃 (폰트·테마·Toast·Analytics) |
| `app/sentry-test/` | Sentry 동작 테스트용 (운영 무관) |

**API 라우트** (`app/api/*/route.ts`)
| 경로 | 용도 | 인가 |
|---|---|---|
| `ai/copy` | 상세페이지 통합 생성 | aiGate(generate) |
| `ai/titles` `ai/tags` | 상품명/태그 | aiGate(generate) |
| `ai/regen` | 단일 필드 재생성 | aiGate(regen) |
| `ai/gift-describe` | 사은품 설명 | aiGate(gift) |
| `image/generate` | 모델 시착 이미지 1장 | aiGate(image) |
| `image/generate-set` | 이미지 풀세트 N장 | aiGate(image × N) |
| `image/bg-remove` | 배경 제거 | aiGate(bg-remove) |
| `translate` | 한↔일/영 재작성 | aiGate(generate) |
| `market/suggest` | 쿠팡 인기검색어 (AI 아님, 키 불필요) | 없음 |
| `auth/invite` | 초대 링크 클릭 → 구글 OAuth로 | — |
| `auth/me` | 현재 체험 로그인 상태 + 크레딧 | — |
| `auth/logout` | 체험 로그아웃 | — |
| `oauth/google/start` | 구글 로그인 시작 (관리자) | — |
| `oauth/google/callback` | 구글 OAuth 콜백 (관리자/사용자 분기) | — |
| `admin/invites` | 초대 목록(GET)/생성(POST) | requireAdmin |
| `admin/invites/[id]` | 수정(PATCH:rename/regenerate/expiry)/삭제(DELETE) | requireAdmin |
| `admin/logout` | 관리자 로그아웃 | — |

### `src/lib/` — 유틸·인프라

| 파일 | 용도 |
|---|---|
| `aiGate.ts` | **AI 인가 핵심** — BYOK vs 체험 판단 + 크레딧 차감/환불 |
| `apiKeyContext.ts` | AsyncLocalStorage로 요청별 Gemini 키 주입 |
| `session.ts` | jose JWT — 체험세션/관리자세션/초대토큰/OAuth state 서명·검증 |
| `trial.ts` | 무료 체험 크레딧 (이메일당 1회 30일, Redis) |
| `invites.ts` | 초대 CRUD (Redis) + 토큰 + 유효기간 만료 |
| `adminAuth.ts` | `requireAdmin()` — 관리자 세션 + ADMIN_EMAILS 확인 |
| `googleOAuth.ts` | 구글 OAuth 공용 (인증 URL 생성 + code→이메일 교환) |
| `api.ts` | 클라이언트 fetch 래퍼 (x-gemini-key 헤더 자동) |
| `image.ts` | 이미지 압축 (AI 전송용/이미지생성용) |
| `imageDB.ts` | IndexedDB 저장 (드래프트별 네임스페이스) |
| `htmlExport.ts` | 상세페이지 HTML 다운로드 |
| `qoo10Export.ts` | 큐텐 ZIP (Hybrid/Sliced) |
| `ebayHtml.ts` | 이베이 클립보드 HTML |
| `errorMessage.ts` | Gemini 에러 → 친절한 한글 메시지 |

### `src/services/` — 서버 비즈니스 로직

| 파일 | 용도 |
|---|---|
| `ai.service.ts` | Gemini 호출(생성/이미지) + `getCameraFocus` 프레이밍. 배경제거 2종: `removeBackgroundRecraft`(체험/Replicate), `removeBackground`(BYOK/Gemini) |
| `translate.service.ts` | 한↔일/영 재작성 |
| `market.service.ts` | 쿠팡 인기검색어 스크랩 |
| `prompts/coupang.ts` | 쿠팡·스마트스토어 프롬프트 |
| `prompts/qoo10.ts` | 큐텐 재팬 프롬프트 |
| `prompts/ebay.ts` | 이베이 프롬프트 |

### `src/stores/` — Zustand 상태 (자세히는 architecture.md 5번)

`productStore` / `imageStore` / `editorStore` / `draftsStore` / `apiKeyStore` / `authStore`

### `src/components/`

| 폴더 | 내용 |
|---|---|
| `layout/` | `Header`(키설정·체험크레딧), `ProductForm`, `DraftSelector`, `StatusBar` |
| `image/` | `ImageUploader`, `ImageGrid`, `AiModelToggle`(이미지생성/풀세트), `BgRemovalToggle`, `CropEditor`, `SingleImageUpload` |
| `editor/` | 템플릿 미리보기(`KoreanDefaultPreview`/`Qoo10Modern`/`Qoo10Classic`/`EbayPreview` + 라우터 `DetailPagePreview`), `CopyPanel`/`TitlePanel`/`TagPanel`/`ResultTabs`, `ExportPanel`(썸네일), `GiftBlock` |
| `ui/` | `Button`/`Card`/`Input`/`Modal`/`Toast` |

### `src/hooks/`

`useAIGenerate`(통합생성) / `useFieldRegen`(부분재생성) / `useBgRemoval` / `useTranslate` / `useImageUpload`(붙여넣기·드롭) / `useMarketData`

### `src/types/`

`product.ts`(상품/플랫폼/카테고리/템플릿) / `ai.ts`(생성결과·요청) / `market.ts`

---

## 4. "이거 어디서 고치지?" 빠른 안내

| 하고 싶은 것 | 파일 |
|---|---|
| AI 프롬프트 톤·내용 수정 | `src/services/prompts/*.ts` |
| 모델 이미지 컷(얼굴/전신 등) 규칙 | `src/services/ai.service.ts` → `getCameraFocus` |
| 크레딧 비용·체험 기간·총량 | `src/lib/trial.ts` (`CREDIT_COST`, `TRIAL_CREDITS`, `TRIAL_DAYS`) |
| 상세페이지 템플릿 디자인 | `src/components/editor/*Preview.tsx` |
| 다운로드 용량 제한(쿠팡 10MB 등) | `src/app/product/new/page.tsx` → `handleDownload` |
| 관리자 권한 이메일 | env `ADMIN_EMAILS` |
| 인가 로직(BYOK/체험 판단) | `src/lib/aiGate.ts` |
| 초대 만료/삭제 동작 | `src/lib/invites.ts` |
| 새 플랫폼/카테고리 추가 | `src/types/product.ts` (`PLATFORM_META`, `CATEGORY_GROUPS`) |

---

## 5. 작업 규칙 (이 repo 컨벤션)

- **커밋/PR 메시지: 한글.** push와 PR 생성은 함께.
- **패키지 매니저: npm** (pnpm 아님).
- 수정 중에는 push 금지, **작업 완료 후 한 번에**.
- push 전 **기존 PR 머지 여부 확인** → 머지됐으면 새 브랜치/PR.
- 브랜치: 작업 끝나면 정리(머지된 브랜치 삭제).
- 빌드 검증: `npm run build` (타입체크 포함) 통과 확인 후 커밋.

---

## 6. 자주 막히는 것

| 증상 | 원인 / 해결 |
|---|---|
| `/admin?error=config` | `AUTH_SECRET` 또는 `GOOGLE_CLIENT_ID` env 누락 |
| 구글 로그인 `redirect_uri_mismatch` | 구글 콘솔에 콜백 URI 미등록 (`/api/oauth/google/callback`) |
| `error=not_admin` | 로그인 이메일이 `ADMIN_EMAILS`에 없음 |
| 초대/크레딧이 사라짐 | `KV_REDIS_URL` 없음 → 메모리 폴백(서버리스/재시작 시 소실). 운영은 Redis 필수 |
| `ChunkLoadError` (개발 중) | 코드 수정 후 stale 청크 — 하드 리프레시(Ctrl+Shift+R) |
| AI가 키 없이 작동 | (구버전) 현재는 BYOK 헤더 없으면 로그인+크레딧 필수 |
