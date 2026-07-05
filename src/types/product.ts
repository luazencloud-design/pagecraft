/**
 * 플랫폼 — 한국·일본·미국 쇼핑몰
 * 추후 영어권 추가 시 PLATFORM_META 확장으로 대응
 */
export type Platform = 'coupang' | 'smartstore' | 'qoo10-jp' | 'ebay-us' | 'multi-kr' | 'other'

/** AI 생성·번역 출력 언어 */
export type Lang = 'ko' | 'ja' | 'en'

/** 상세페이지 템플릿 */
export type Template = 'korean-default' | 'qoo10-modern' | 'qoo10-classic' | 'ebay-default'

/** 마켓별 통화 */
export type Currency = 'KRW' | 'JPY' | 'USD'

export interface PlatformMeta {
  label: string
  lang: Lang
  market: 'kr' | 'jp' | 'us'
  currency: Currency
  defaultTemplate: Template
  /** 검색어 자동완성(쿠팡 autocomplete 등) 사용 여부 */
  hasAutocomplete: boolean
  /** 동기화/번역 페어 (양 언어 동시 생성 마켓만) */
  langPair?: [Lang, Lang]
}

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  'coupang':    { label: '쿠팡',         lang: 'ko', market: 'kr', currency: 'KRW', defaultTemplate: 'korean-default', hasAutocomplete: true },
  'smartstore': { label: '스마트스토어',  lang: 'ko', market: 'kr', currency: 'KRW', defaultTemplate: 'korean-default', hasAutocomplete: false },
  'qoo10-jp':   { label: '큐텐 재팬',     lang: 'ja', market: 'jp', currency: 'JPY', defaultTemplate: 'qoo10-modern',   hasAutocomplete: false, langPair: ['ja', 'ko'] },
  'ebay-us':    { label: 'eBay (US)',    lang: 'en', market: 'us', currency: 'USD', defaultTemplate: 'ebay-default',   hasAutocomplete: false, langPair: ['en', 'ko'] },
  'multi-kr':   { label: '쿠팡 + 스마트스토어', lang: 'ko', market: 'kr', currency: 'KRW', defaultTemplate: 'korean-default', hasAutocomplete: true },
  'other':      { label: '기타',          lang: 'ko', market: 'kr', currency: 'KRW', defaultTemplate: 'korean-default', hasAutocomplete: false },
}

/** 통화 기호 매핑 */
export const CURRENCY_SYMBOL: Record<Currency, string> = {
  KRW: '₩',
  JPY: '¥',
  USD: '$',
}

/** 템플릿 메타 — 라벨/지원 언어 등 */
export const TEMPLATE_META: Record<Template, { label: string; lang: Lang; description: string }> = {
  'korean-default': { label: '한국 (기본)',         lang: 'ko', description: '쿠팡·스마트스토어용 800px 표준 레이아웃' },
  'qoo10-modern':   { label: '큐텐 재팬 (Modern)',  lang: 'ja', description: '미니멀 K-뷰티 무드 — 베이지/차콜' },
  'qoo10-classic':  { label: '큐텐 재팬 (Classic)', lang: 'ja', description: '카라그램 스타일 — 큰 영문 타이틀 + 색상 swatch' },
  'ebay-default':   { label: 'eBay (Default)',     lang: 'en', description: '텍스트 위주 정보 박스 스택 — Item Specifics + Shipping/Returns' },
}

/**
 * 카테고리 그룹화 — 코스트코 온라인몰 분류 1:1 미러링 (2026-06).
 * 카테고리는 AI 생성의 참고자료: 텍스트 톤 + 모델샷 프레이밍(getCameraFocus)이 여기 키에 매핑됨.
 * ⚠️ 항목 이름을 바꾸면 ai.service.ts의 byExactCategory 프레이밍 매핑도 같이 바꿀 것.
 * 제외: 기프트카드/사전주문/비즈니스 딜리버리/Costco Direct (상품이 아닌 판매방식)
 */
export const CATEGORY_GROUPS: Record<string, string[]> = {
  '디지털/TV/컴퓨터': [
    'Apple (아이폰/아이패드/워치/에어팟)',
    'TV',
    '오디오/영상기기 (스피커/사운드바/헤드폰)',
    '카메라',
    '모바일 (스마트기기/충전기/액세서리)',
    '보안 카메라',
    '노트북/데스크탑',
    '태블릿',
    '모니터/프린터',
    '게임 (게이밍 의자/PC 액세서리/콘솔)',
    '컴퓨터 액세서리 (키보드/마우스/저장장치/공유기)',
    '악기 (건반/현악기)',
  ],
  '대형/생활가전': [
    '냉장고 (김치냉장고/와인셀러/냉동고)',
    '세탁기/건조기/의류관리기',
    '가전세트',
    '커머셜 가전',
    '주방가전 (블렌더/커피메이커/전자레인지/밥솥)',
    '계절가전 (에어컨/선풍기/히터/제습기)',
    '공기청정가전',
    '생활가전 (청소기/전동칫솔)',
    '미용/건강가전 (마사지기/면도기/비데)',
  ],
  '가구/침구/인테리어': [
    '거실가구 (소파/TV장/테이블)',
    '침실가구 (매트리스/침대/서랍장)',
    '유아동 가구',
    '주방가구 (식탁/의자)',
    '사무가구 (의자/책상)',
    '조명 (램프/스탠드)',
    '침구 (이불/세트/베개/쿠션)',
    '홈인테리어 (커튼/블라인드/러그/타월/거울)',
  ],
  '홈/키친': [
    '조리용품 (프라이팬/쿡웨어)',
    '식탁용품 (그릇/수저/컵/와인잔)',
    '주방잡화 (조리도구/수납/보관용기)',
    '칼/도마',
    '세탁용품 (건조대/바구니)',
    '욕실용품',
    '세제/청소용품',
  ],
  '유아동/완구/반려동물': [
    '기저귀',
    '유아동 의류/잡화 (아우터/상의/하의/신발)',
    '유아동 바디/구강케어',
    '유아동용품',
    '완구 (블럭/교육용/인형/보드게임)',
    '반려동물용품 (강아지/고양이)',
  ],
  '스포츠/헬스/캠핑': [
    '골프 (가방/공/클럽)',
    '헬스/운동기구 (러닝/자전거/헬스용품)',
    '다이어트/헬스 식품',
    '캠핑 (의자/텐트/침낭/조리도구)',
    '등산',
    '아웃도어 스포츠',
    '자전거/보드',
    '겨울 스포츠',
    '수상스포츠',
  ],
  '파티오/정원/창고': [
    '가제보/스크린 하우스/그린 하우스',
    '창고/보관함',
    '정원 가구 (다이닝/소파/벤치)',
    '파라솔/차양막',
    '그릴/액세서리',
    '가든 전기용품',
    '정원용품/장식',
    '꽃/식물',
    '원예용품',
  ],
  '의류/가방/잡화': [
    '여성의류 (니트/셔츠/바지/아우터)',
    '남성의류',
    '여성 속옷/양말',
    '남성 속옷/양말',
    '유아동 의류/속옷',
    '여성신발',
    '남성신발',
    '아동신발',
    '가방',
    '여행가방',
    '패션잡화',
    '선글라스/안경테',
  ],
  '보석/시계/액세서리': [
    'One & Only 보석',
    '순금/순은 (골드바/실버바)',
    '목걸이',
    '팔찌',
    '반지',
    '귀걸이',
    '여성시계',
    '남성시계',
    '패션주얼리',
  ],
  '화장품/미용/제지': [
    '바디/구강케어 (샤워/로션/핸드케어)',
    '헤어케어 (샴푸/영양)',
    '유아동 바디/구강케어 (미용)',
    '화장품/향수 (스킨케어/메이크업/클렌징/팩)',
    '화장지 (티슈/키친타월)',
    '생리대/위생용품',
    '미용/건강가전',
  ],
  '건강/영양제': [
    '비타민/미네랄',
    '유산균',
    '오메가3/크릴오일',
    '홍삼제품',
    '어린이 영양제',
    '다이어트/뷰티 식품 (콜라겐)',
    '헬스 보충식품',
    '관절 보조식품',
    '홈케어/구급용품',
    '기타 건강식품',
  ],
  '공구/생활/자동차': [
    '선반/수납',
    '작업용 공구/설비 (전동공구/사다리)',
    '전구/야외조명',
    '건전지',
    '보안 (금고/도어락/카메라)',
    '생활/주거 설비 (욕실/바닥재)',
    '자동차용품 (세차/오일/액세서리)',
  ],
  '식품': [
    '쌀/잡곡 (시리얼)',
    '커피/차 (원두/드립백)',
    '음료 (생수/주스/우유)',
    '가공식품 (통조림/라면/오일/빵)',
    '건식품 (건과일/건어물/김)',
    '과자/간식 (캔디/견과/초콜릿)',
    '소스/양념',
    '신선식품 (과일/채소/정육/수산)',
    '냉장식품 (햄/치즈)',
    '냉동식품',
    '유기농식품',
  ],
  '문구/사무': [
    '문구 (펜/연필/마커/노트)',
    '사무기기 (계산기/코팅기/세단기)',
    '사무용품 (풀/테이프/스테이플러)',
    '사무정리용품 (파일/서류보관함)',
    '오피스 종이용품 (복사지/포스트잇)',
  ],
  '커클랜드 시그니처': [
    'KS 식품',
    'KS 건강/영양제',
    'KS 의류/잡화',
    'KS 미용',
    'KS 홈/생활용품/세제',
    'KS 공구',
    'KS 골프용품',
    'KS 반려동물용품',
  ],
  '기타': [
    '선물세트 (식품)',
    '선물세트 (비식품)',
  ],
}

/** 카테고리 문자열 → 어울리는 AI 모델 연령대 (유아→baby, 아동·어린이→child, 그 외 adult) */
export function modelAgeForCategory(category: string): 'adult' | 'child' | 'baby' {
  if (/유아/.test(category)) return 'baby'
  if (/아동|키즈|주니어|어린이/.test(category)) return 'child'
  return 'adult'
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
  /**
   * 출처 — 사용자 업로드 vs AI 생성.
   * AI 전용 모드 토글 시 source === 'ai' 만 템플릿에 포함.
   * 마이그레이션 호환: undefined 면 'original' 로 간주.
   */
  source?: 'original' | 'ai'
}

export interface CropState {
  imageIndex: number
  x: number
  y: number
  width: number
  height: number
}
