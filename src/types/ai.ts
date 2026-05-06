import type { Lang, Platform } from './product'

export interface SpecItem {
  key: string
  value: string
}

/** Qoo10 — 색상 swatch (립/아이/치크 등) */
export interface ColorSwatch {
  /** "01 NUDE BUTTER" 같은 전체 라벨 */
  name: string
  /** 짧은 영문 라벨 — 큰 글자로 표시 (예: "BALLET PINK") */
  english_label?: string
  /** 짧은 한 줄 묘사 */
  description: string
  /** 추천 퍼스널컬러: "ブルベ" | "イエベ" | "둘 다" */
  personal_color?: string
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
  /** 일본어 해시태그 (예: ["#リップベース", "#密着リップ"]) */
  hashtags?: string[]
  /** 색상별 swatch 정보 — 화장품 색조 제품 전용 */
  color_swatches?: ColorSwatch[]
  /** 큰 영문 무드 카피 (예: "NUDE BLUR STICK") — 헤더 보조 */
  mood_callout?: string
  /** 사용 전/후 비교 문구 — { before: "塗布直後", after: "一定時間経過後" } */
  before_after?: { before: string; after: string }
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
 * 언어별 결과 — Qoo10 플랫폼은 한 번 호출로 양 언어를 받아 캐시에 동시 저장
 * 한국 마켓은 { ko: ... } 한쪽만 채워짐
 */
export type GeneratedByLang = Partial<Record<'ko' | 'ja', GeneratedAll>>

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

export interface RenderRequest {
  data: GeneratedContent
  price: string
  images: string[]
  storeIntroImage?: string
  termsImage?: string
}

/** 번역(재작성) 요청 */
export interface TranslateRequest {
  current: GeneratedAll
  fromLang: Lang
  toLang: Lang
  /** 재작성 톤 — 'coupang' | 'qoo10' 등 */
  targetPlatform: Platform
}
