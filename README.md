# PageCraft (MagicOne)

쿠팡·스마트스토어·큐텐 재팬·이베이 셀러를 위한 **AI 상세페이지 자동 생성 도구**.
상품 사진만 올리면 AI가 카피·상품명·태그·상세페이지·모델 이미지까지 한 번에 만들어 줍니다.

> 이 문서 하나로 **처음 보는 사람도 세팅·실행·구조 파악**이 가능하도록 작성했습니다.
> 더 깊은 내용은 [`docs/`](docs/) 폴더 참고.

---

## 1. 이게 무슨 앱인가요?

- **입력**: 상품 사진 + 간단한 정보(상품명/카테고리/플랫폼)
- **출력**: AI가 생성한 상세페이지(HTML/이미지), 상품명 5개, 태그 20개, AI 모델 착용 이미지, 600×600 썸네일
- **플랫폼별 템플릿**: 쿠팡/스마트스토어(한국), 큐텐 재팬(일본어), 이베이(영어)
- **AI 엔진**: Google **Gemini** (텍스트 + 이미지 생성). 배경 제거는 경로별 분기 — 체험(서버)=**Recraft(Replicate)**, BYOK(본인 키)=Gemini

### 두 가지 사용 방식 (한 앱에 공존)

| 방식 | 설명 | 로그인 | 비용 |
|---|---|---|---|
| **무료 체험** | 관리자가 발급한 **초대 링크**로 입장 → 구글 로그인 → 30일/500크레딧 | 구글 | 운영자 부담(서버 키) |
| **BYOK** (Bring Your Own Key) | 본인 **Gemini API 키** 입력 → 무제한 | 불필요 | 사용자 부담 |

> **무제한(직원용) 초대**: 관리자가 초대를 '무제한'으로 발급하면 크레딧·기간 제한 없이 서버 키로 사용 (직원용). 삭제/재생성으로 즉시 회수.

---

## 2. 빠른 시작 (로컬 실행)

### 요구사항
- **Node.js 20+**, npm
- (선택) Upstash Redis — 초대/크레딧 영속화. 없으면 메모리 폴백(재시작 시 초기화)

### 설치 & 실행
```bash
git clone <repo>
cd pagecraft
npm install

# 환경변수 파일 생성
cp .env.example .env.local
# .env.local 을 열어 값 입력 (아래 3번 참고)

npm run dev
# http://localhost:3000 접속
```

### 로컬에서 최소로 돌리려면
- **BYOK만 테스트**: env 없이도 됨. 앱 우측 상단 ⚙️에 본인 Gemini 키 입력 → 바로 사용
- **무료 체험/관리자까지 테스트**: `.env.local`에 `AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `ADMIN_EMAILS`, `GEMINI_API_KEY`, `REPLICATE_API_TOKEN`(체험 배경제거용) 필요 (3번 참고)

---

## 3. 환경 변수 (.env.local)

`.env.example` 복사해서 채우세요. **각 변수가 뭔지, 어디서 받는지:**

| 변수 | 필수? | 용도 | 어디서 |
|---|---|---|---|
| `AUTH_SECRET` | ✅ | 로그인 세션·초대 토큰 JWT 서명 (16자+ 랜덤) | 직접 생성 ↓ |
| `GEMINI_API_KEY` | ✅(체험) | 무료 체험용 서버 AI 키 (텍스트·이미지) | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `REPLICATE_API_TOKEN` | ✅(체험) | 체험 경로 배경제거(Recraft). BYOK 전용이면 불필요 | [Replicate](https://replicate.com/account/api-tokens) |
| `GOOGLE_CLIENT_ID` | ✅ | 구글 로그인(관리자+사용자) | [Google Cloud Console](https://console.cloud.google.com) |
| `GOOGLE_CLIENT_SECRET` | ✅ | 〃 | 〃 |
| `ADMIN_EMAILS` | ✅ | 관리자 구글 이메일 (쉼표 구분) | 본인 지정 |
| `KV_REDIS_URL` | 운영필수 | 초대·크레딧 저장 (Upstash Redis) | [Upstash](https://upstash.com) |
| `NEXT_PUBLIC_APP_URL` | 운영권장 | 앱 공개 주소 (초대링크·OAuth 콜백 기준) | 배포 도메인 |
| `GEMINI_TEXT_MODEL` | 선택 | 기본 `gemini-2.5-flash` | — |
| `GEMINI_IMAGE_MODEL` | 선택 | 기본 `gemini-2.5-flash-image` | — |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | 선택 | 에러 모니터링 | [Sentry](https://sentry.io) |

**`AUTH_SECRET` 생성:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 구글 OAuth 세팅 (로그인용)
1. [Google Cloud Console](https://console.cloud.google.com) → API 및 서비스 → 사용자 인증 정보
2. OAuth 클라이언트 ID 생성 (없으면) → `GOOGLE_CLIENT_ID`/`SECRET` 복사
3. **승인된 리디렉션 URI**에 콜백 추가:
   - 로컬: `http://localhost:3000/api/oauth/google/callback`
   - 배포: `https://<도메인>/api/oauth/google/callback`

> ⚠️ 이 URI를 등록 안 하면 구글 로그인 시 `redirect_uri_mismatch` 에러가 납니다.

---

## 4. 사용 흐름

### 일반 사용자
```
초대 링크 클릭 → 구글 로그인 → 작업 화면(/product/new)
  → 사진 업로드 → 정보 입력 → "AI 상세페이지 생성"
  → 결과 편집 → HTML/이미지/썸네일 다운로드
```
또는 우측 상단 ⚙️에 **본인 Gemini 키** 입력 → 로그인 없이 무제한.

### 관리자
```
/admin → 구글 로그인(ADMIN_EMAILS 계정) → 초대 링크 관리
  생성(이름+유효기간) / 링크 복사 / 이름·기간 수정 / 재생성 / 삭제
```
- 링크 삭제·만료 시 그 링크로 들어온 사용자도 **즉시 이용 불가**

---

## 5. 배포 (Vercel 기준)

1. Vercel에 repo 연결
2. 환경변수 등록 (3번 표의 운영필수 항목 전부 + `NEXT_PUBLIC_APP_URL=https://실제도메인`)
3. 구글 콘솔에 **배포 도메인 콜백 URI** 추가
4. ⚠️ **Google AI Studio에서 `GEMINI_API_KEY` 사용량/결제 상한 설정** — 무료 체험은 운영자 비용이라 남용/버그 대비
5. 배포

---

## 6. 명령어

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드 (타입체크 포함)
npm run start        # 빌드 결과 실행
npm run lint         # ESLint
npm run type-check   # 타입 체크만
```

---

## 7. 더 읽을 문서

| 문서 | 내용 |
|---|---|
| [docs/architecture.md](docs/architecture.md) | 시스템 구조·인증 흐름·데이터 흐름 |
| [docs/onboarding.md](docs/onboarding.md) | **폴더·파일별 용도** + 개발자 인수인계 가이드 |
| [docs/api-spec.md](docs/api-spec.md) | API 라우트 명세 |
| [docs/api-keys.md](docs/api-keys.md) | 외부 서비스(Gemini/구글/Upstash) 발급 상세 |
| [docs/issues.md](docs/issues.md) | 해결한 주요 이슈 기록 |
| [docs/known-issues.md](docs/known-issues.md) | 남은 기술부채·주의점 |

---

## 8. 기술 스택

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Zustand · Tailwind ·
Gemini API · jose(JWT) · ioredis(Upstash) · IndexedDB(idb) · html-to-image · JSZip · Sentry
