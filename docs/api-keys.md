# 외부 서비스 / 키 발급 가이드

PageCraft가 쓰는 외부 서비스는 **3개**: Gemini, 구글 OAuth, Upstash Redis.

---

## 1. Gemini API 키 (`GEMINI_API_KEY`)

무료 체험 사용자가 쓰는 **서버 AI 키**. (BYOK 사용자는 본인 키를 앱에 직접 입력)

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. "Create API key" → 키 복사 → `GEMINI_API_KEY`에 입력
3. ⚠️ **결제/사용량 상한 설정**: 무료 체험은 이 키로 돌아가 운영자 비용 발생.
   AI Studio / Google Cloud 결제에서 상한을 걸어 남용·버그 대비.

- 텍스트: `gemini-2.5-flash` (기본) / 이미지: `gemini-2.5-flash-image` (기본)
- 모델 변경은 `GEMINI_TEXT_MODEL` / `GEMINI_IMAGE_MODEL`로 오버라이드 가능
- 대략 비용: 이미지 생성 ~$0.04/장, 텍스트 매우 저렴

---

## 2. 구글 OAuth (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`)

관리자 + 무료 체험 사용자 로그인용.

1. [Google Cloud Console](https://console.cloud.google.com) → 프로젝트 선택/생성
2. **API 및 서비스 → OAuth 동의 화면** 구성 (외부, 앱 이름 등)
3. **사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 애플리케이션 유형: 웹 애플리케이션
   - **승인된 리디렉션 URI**:
     - 로컬: `http://localhost:3000/api/oauth/google/callback`
     - 배포: `https://<도메인>/api/oauth/google/callback`
4. 생성된 클라이언트 ID/시크릿을 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`에 입력

> ⚠️ 콜백 URI 오타·누락 시 로그인에서 `redirect_uri_mismatch` 에러.
> 로컬·배포 둘 다 쓰면 **둘 다 등록**.

---

## 3. Upstash Redis (`KV_REDIS_URL`)

초대 링크 + 체험 크레딧 저장소. **운영 필수** (없으면 메모리 폴백 → 서버리스/재시작 시 데이터 소실).

1. [Upstash](https://upstash.com) 가입 → Redis 데이터베이스 생성 (무료 플랜 OK)
2. 연결 정보에서 **Redis URL**(`rediss://...`) 복사 → `KV_REDIS_URL`에 입력
3. ioredis로 연결됨. 로컬 테스트는 없어도 메모리로 동작 (단, 인스턴스 간 공유 안 됨)

---

## 4. 인증 시크릿 (`AUTH_SECRET`)

외부 발급 아님 — **직접 생성**한 랜덤 문자열(16자+). JWT 서명용.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. (선택) Sentry

에러 모니터링. [Sentry](https://sentry.io)에서 프로젝트 생성 후 DSN을
`NEXT_PUBLIC_SENTRY_DSN`(클라) / `SENTRY_DSN`(서버)에 입력.

---

## 정리: 최소 구성

| 목적 | 필요 키 |
|---|---|
| BYOK만 (로컬 빠른 테스트) | 없음 (앱에서 키 직접 입력) |
| 무료 체험 + 관리자 (로컬) | `AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `ADMIN_EMAILS`, `GEMINI_API_KEY` |
| 운영 배포 | 위 + `KV_REDIS_URL`, `NEXT_PUBLIC_APP_URL` |
