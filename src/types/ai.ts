import type { Lang, Platform } from './product'

export interface SpecItem {
  key: string
  value: string
}

export interface GeneratedContent {
  product_name: string
  subtitle: string
  main_copy: string
  selling_points: string[]
  description: string
  specs: SpecItem[]
  keywords: string[]
  caution: string

  /* ─────────────── Qoo10 전용 옵션 필드 ─────────────── */
  /** 큰 영문 무드 카피 (예: "NUDE BLUR STICK") — 헤더 보조 */
  mood_callout?: string
  /** 해시태그 (예: ["#リップベース", "#密着リップ"]) */
  hashtags?: string[]

  /* ─────────────── eBay 전용 옵션 필드 ─────────────── */
  /** Condition: New / Used / Refurbished / For parts */
  condition?: string
  /** 5-7 핵심 불릿 — 미리보기는 <ul>, 텍스트 복사는 "• " 접두 */
  bullet_points?: string[]
  /** Item Specifics 표 (Brand, MPN, Color, Size, Material...) — eBay 표준 항목 */
  item_specifics?: SpecItem[]
  /** 배송 정책 — 짧은 안내 문구 */
  shipping_policy?: string
  /** 반품 정책 — 짧은 안내 문구 */
  return_policy?: string
  /** 결제 정책 — 짧은 안내 문구 */
  payment_policy?: string
}

export interface GeneratedTitle {
  rank: number
  strategy: string
  title: string
  used_keywords: string[]
  char_count: number
}

export interface GeneratedTag {
  text: string
  isTrending: boolean
}

/** 통합 AI 응답 — content + titles + tags 한번에 */
export interface GeneratedAll {
  content: GeneratedContent
  titles: GeneratedTitle[]
  tags: string[]
}

/**
 * 언어별 결과 — 큐텐(JA+KO), eBay(EN+KO)는 양 언어 동시 생성
 * 한국 마켓은 { ko: ... } 한쪽만 채워짐
 */
export type GeneratedByLang = Partial<Record<'ko' | 'ja' | 'en', GeneratedAll>>

export interface AIGenerateRequest {
  images: string[]
  brand: string
  productName: string
  price: string
  category: string
  platform: Platform | string  // 마이그레이션 호환을 위해 string도 허용
  memo: string
  features: string[]
}

export interface AITitleRequest {
  productName: string
  category: string
  brand: string
  keywords: string[]
  coupangSuggestions: string[]
}

export interface AITagRequest {
  productName: string
  category: string
  brand: string
  generatedContent?: GeneratedContent
  coupangSuggestions: string[]
}

export interface AIModelImageRequest {
  productName: string
  category: string
  gender: 'male' | 'female'
  images: string[]
}

/** 번역(재작성) 요청 */
export interface TranslateRequest {
  current: GeneratedAll
  fromLang: Lang
  toLang: Lang
  /** 재작성 톤 — 'coupang' | 'qoo10' 등 */
  targetPlatform: Platform
}

/** AI 부분 재생성 — 단일 필드만 새로 뽑기 */
export type RegenField =
  | 'product_name'
  | 'subtitle'
  | 'main_copy'
  | 'selling_points'
  | 'description'
  | 'keywords'
  | 'caution'

export interface AIRegenRequest {
  field: RegenField
  /** 컨텍스트 — 기존 카피 톤 유지 위해 같이 보냄 */
  brand: string
  productName: string
  price: string
  category: string
  platform: Platform | string
  /** 현재 콘텐츠 전체 — AI가 다른 필드 톤 참고용 */
  currentContent: GeneratedContent
}
