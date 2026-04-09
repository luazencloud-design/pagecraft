# 아키텍처

## 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                      Vercel                              │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │   Next.js App    │  │     API Routes               │  │
│  │                  │  │                              │  │
│  │  React 컴포넌트   │──│  /api/ai/*     → ai.service │  │
│  │  Zustand 스토어   │  │  /api/image/*  → image.svc  │  │
│  │  Canvas 미리보기  │  │  /api/render/* → render.svc │  │
│  │                  │  │  /api/market/* → market.svc │  │
│  └──────────────────┘  └──────────┬───────────────────┘  │
└───────────────────────────────────┼──────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────┐    ┌──────────┐    ┌──────────┐
            │ Supabase │    │  AI APIs  │    │  쿠팡    │
            │          │    │          │    │          │
            │ Postgres │    │ Claude   │    │ WING API │
            │ Storage  │    │ GPT Img  │    │ 크롤링   │
            │ Auth     │    │ Stab.AI  │    │          │
            └──────────┘    └──────────┘    └──────────┘
```

## 왜 이 구조인가?

### Next.js 단일 프로젝트 (프론트 + 백엔드 통합)

**결정:** 별도 Express 서버를 두지 않고 Next.js API Routes로 백엔드 통합.

**이유:**
- 현재 API 라우트가 10개 미만. 별도 서버는 오버스펙
- 배포 포인트 1개 (Vercel). 로컬에서도 서버 1개만 실행
- CORS 설정 불필요 (같은 origin)
- 환경 변수 관리 1곳

**리스크:**
- Vercel 서버리스 타임아웃 (무료 10초, Pro 60초). 렌더링이 오래 걸리면 문제
- WebSocket 미지원 (Vercel 서버리스 한계). 실시간 진행률은 폴링으로 대체

**탈출 전략:**
- `services/`에 비즈니스 로직이 분리되어 있으므로, Express로 옮길 때 서비스 코드 변경 없음
- API 라우트 문법만 변환 (`Response.json()` → `res.json()`)

### services/ 분리 (라우트 ↔ 로직)

```
[API Route]                        [Service]
app/api/ai/copy/route.ts    →     services/ai.service.ts
  - req 파싱                        - Claude API 호출
  - res 반환                        - 프롬프트 빌딩
  - 인증 체크                        - 응답 파싱
```

**이유:**
- API 라우트에 로직이 섞이면 테스트 불가, 재사용 불가
- 이후 Express 분리 시 services/를 그대로 가져감
- 같은 서비스를 여러 라우트에서 호출 가능

### Zustand (상태 관리)

**결정:** Redux, Context 대신 Zustand.

**이유:**
- 2KB, 보일러플레이트 제로
- 컴포넌트 외부에서 접근 가능 (`useStore.getState()`)
- TypeScript 네이티브
- `productStore`, `imageStore`, `editorStore`로 관심사 분리

**비교:**
- Redux → 이 규모에 액션/리듀서 구조가 과함
- Context → 상태 변경 시 모든 Consumer 리렌더링

### 렌더링 이중 전략

**결정:** 미리보기는 클라이언트, 다운로드는 서버.

**이유:**
- 클라이언트: 텍스트 수정 시 실시간 반영. UX 핵심
- 서버: 한글 폰트 보장, 6000px+ 세로 이미지 안정적 생성, 결과 일관성

**이전 방식의 문제:**
기존 pagecraft-pro는 서버 전용. 텍스트 한 글자 수정해도 API 왕복 필요.

### Supabase (DB + Storage + Auth)

**결정:** Firebase 대신 Supabase.

**이유:**
- 상품/가격 데이터는 관계형(SQL)이 적합. JOIN, 집계, 필터링
- Firebase는 NoSQL이라 복잡한 쿼리에 부적합
- 무료 500MB DB + 1GB 스토리지 (MVP 충분)
- S3 호환 스토리지 → 추후 AWS S3/Cloudflare R2로 이전 가능
- 표준 PostgreSQL → 벤더 종속 낮음

## 폴더별 책임

| 폴더 | 책임 | 의존 방향 |
|------|------|----------|
| `app/` | 페이지 라우팅, UI 조합 | components, hooks, stores 사용 |
| `app/api/` | HTTP 요청/응답 처리 | services만 호출 |
| `components/` | UI 렌더링 + 사용자 인터랙션 | hooks, stores 사용 |
| `services/` | 비즈니스 로직, 외부 API 호출 | lib, types 사용. **독립적** |
| `stores/` | 전역 상태 관리 | types만 사용 |
| `hooks/` | 컴포넌트 로직 재사용 | stores, lib 사용 |
| `lib/` | 순수 유틸리티 | **의존 없음** |
| `types/` | 타입 정의 | **의존 없음** |
| `templates/` | 렌더링 레이아웃 설정 | types만 사용 |

**핵심 규칙:** `services/`는 React에 의존하지 않습니다. Express로 옮겨도 그대로 동작해야 합니다.
