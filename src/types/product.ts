/**
 * 플랫폼 — 한국·일본 쇼핑몰
 * 추후 영어권(예: 'amazon-us', 'shopee-sg') 추가 시 PLATFORM_META 확장만으로 대응
 */
export type Platform = 'coupang' | 'smartstore' | 'qoo10-jp' | 'multi-kr' | 'other'

/** AI 생성·번역 출력 언어 */
export type Lang = 'ko' | 'ja'

/** 상세페이지 템플릿 */
export type Template = 'korean-default' | 'qoo10-modern' | 'qoo10-classic'

export interface PlatformMeta {
  label: string
  lang: Lang
  market: 'kr' | 'jp'
  defaultTemplate: Template
  /** 검색어 자동완성(쿠팡 autocomplete 등) 사용 여부 */
  hasAutocomplete: boolean
}

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  'coupang':    { label: '쿠팡',         lang: 'ko', market: 'kr', defaultTemplate: 'korean-default', hasAutocomplete: true },
  'smartstore': { label: '스마트스토어',   lang: 'ko', market: 'kr', defaultTemplate: 'korean-default', hasAutocomplete: false },
  'qoo10-jp':   { label: '큐텐 재팬',     lang: 'ja', market: 'jp', defaultTemplate: 'qoo10-modern',   hasAutocomplete: false },
  'multi-kr':   { label: '쿠팡 + 스마트스토어', lang: 'ko', market: 'kr', defaultTemplate: 'korean-default', hasAutocomplete: true },
  'other':      { label: '기타',          lang: 'ko', market: 'kr', defaultTemplate: 'korean-default', hasAutocomplete: false },
}

/** 템플릿 메타 — 라벨/지원 언어 등 */
export const TEMPLATE_META: Record<Template, { label: string; lang: Lang; description: string }> = {
  'korean-default': { label: '한국 (기본)',         lang: 'ko', description: '쿠팡·스마트스토어용 800px 표준 레이아웃' },
  'qoo10-modern':   { label: '큐텐 재팬 (Modern)',  lang: 'ja', description: '미니멀 K-뷰티 무드 — 베이지/차콜' },
  'qoo10-classic':  { label: '큐텐 재팬 (Classic)', lang: 'ja', description: '카라그램 스타일 — 큰 영문 타이틀 + 색상 swatch' },
}

/** 카테고리 그룹화 — 의류/잡화 + 화장품/뷰티 */
export const CATEGORY_GROUPS: Record<string, string[]> = {
  '의류·잡화': [
    '패딩/점퍼', '집업/후리스', '티셔츠/맨투맨', '바지/하의', '가방/배낭',
    '모자/액세서리', '신발/부츠', '슬리퍼/샌들', '스카프/머플러', '기타 의류/잡화',
  ],
  '화장품·뷰티': [
    '스킨케어 (토너/세럼/크림)',
    '클렌징',
    '마스크팩/패드',
    '선케어',
    '메이크업 베이스 (쿠션/파운데이션)',
    '메이크업 색조 (립/아이/치크)',
    '향수/바디',
    '헤어케어',
    '기타 뷰티',
  ],
}

export interface Product {
  id?: string
  brand: string
  name: string
  price: string
  category: string
  platform: Platform
  template?: Template
  memo: string
  features: string[]
  createdAt?: string
  updatedAt?: string
}

export interface ProductImage {
  id: string
  dataUrl: string
  file?: File
  bgRemoved: boolean
  order: number
}

export interface CropState {
  imageIndex: number
  x: number
  y: number
  width: number
  height: number
}
