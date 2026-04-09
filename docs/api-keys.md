# 외부 API 키 발급 가이드

이 프로젝트는 여러 외부 API를 사용합니다. 아래 순서대로 키를 발급받으세요.

---

## 필수

### 1. Supabase (DB + Storage + Auth)

1. [supabase.com](https://supabase.com) 가입
2. "New Project" 생성 (Region: Northeast Asia 권장)
3. Settings → API 에서 아래 값 확인:
   - `NEXT_PUBLIC_SUPABASE_URL` → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` → service_role key (서버 전용, 절대 프론트에 노출 금지)

### 2. Anthropic (Claude API)

1. [console.anthropic.com](https://console.anthropic.com) 가입
2. API Keys → Create Key
3. `ANTHROPIC_API_KEY=sk-ant-...`

> 모델: claude-sonnet-4-20250514 사용. 과금: $3/1M input, $15/1M output.

### 3. OpenAI (GPT Image)

1. [platform.openai.com](https://platform.openai.com) 가입
2. API Keys → Create new secret key
3. `OPENAI_API_KEY=sk-...`

> 이미지 생성용. 과금: $0.04/장 (1024x1024 기준).

### 4. Replicate (Stability AI 인페인팅)

1. [replicate.com](https://replicate.com) 가입 (GitHub 로그인 가능)
2. Account → API tokens → Create token
3. `REPLICATE_API_TOKEN=r8_...`

> 인페인팅 모델 사용. 과금: ~$0.002/장.

---

## 선택

### 5. Google AI (Gemini)

벌크 처리, 비용 절감 시에만 사용. 없어도 Claude로 대체 가능.

1. [aistudio.google.com](https://aistudio.google.com) 가입
2. Get API Key → Create API Key
3. `GEMINI_API_KEY=AI...`

### 6. 쿠팡 파트너스 API

시장 데이터 조회용. 없으면 크롤링으로 대체.

1. [partners.coupang.com](https://partners.coupang.com) 가입
2. 사업자 인증 필요
3. API 관리 → Access Key / Secret Key 발급
4. `COUPANG_ACCESS_KEY=...`
5. `COUPANG_SECRET_KEY=...`

---

## .env.local 전체 예시

```env
# === 필수 ===
NEXT_PUBLIC_SUPABASE_URL=https://abcdefg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
REPLICATE_API_TOKEN=r8_...

# === 선택 ===
GEMINI_API_KEY=AIza...
COUPANG_ACCESS_KEY=...
COUPANG_SECRET_KEY=...
```

## 주의사항

- `NEXT_PUBLIC_` 접두사가 붙은 변수만 브라우저에 노출됩니다
- `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` 등은 서버 전용. 절대 `NEXT_PUBLIC_` 붙이지 마세요
- `.env.local`은 `.gitignore`에 포함되어 있어 git에 올라가지 않습니다
- Vercel 배포 시 Settings → Environment Variables에 동일하게 설정
