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
 * 카테고리 그룹화 — 코스트코 분류 기준으로 확장 (2026-06).
 * 카테고리는 AI 생성의 참고자료: 텍스트 톤 + 모델샷 프레이밍(getCameraFocus)이 여기 키에 매핑됨.
 * ⚠️ 항목 이름을 바꾸면 ai.service.ts의 byExactCategory 프레이밍 매핑도 같이 바꿀 것.
 */
export const CATEGORY_GROUPS: Record<string, string[]> = {
  // 코스트코 대분류 순서를 따름. 예외: 의류만 남성/여성 대신 아이템별 분류
  // (성별은 AI 모델 토글에 이미 있고, 프레이밍 엔진이 아이템 타입을 필요로 함)
  '디지털·TV·컴퓨터': [
    'TV',
    '노트북/태블릿',
    '모니터/프린터',
    '카메라',
    '음향기기 (헤드폰/스피커)',
    '모바일/충전 액세서리',
    '게임/게이밍',
    '키보드/마우스/저장장치',
    '악기',
    '기타 디지털',
  ],
  '가전': [
    '냉장고/김치냉장고',
    '세탁기/건조기/의류관리기',
    '주방가전 (블렌더/커피머신/밥솥)',
    '계절가전 (에어컨/선풍기/히터)',
    '공기청정기/제습기',
    '청소기/생활가전',
    '미용/건강가전 (드라이어/마사지기)',
    '기타 가전',
  ],
  '가구·침구·인테리어': [
    '거실가구 (소파/테이블)',
    '침실가구 (침대/매트리스)',
    '유아동 가구',
    '식탁/책상/의자',
    '조명',
    '침구 (이불/베개)',
    '커튼/블라인드/러그',
    '홈데코/거울/액자',
    '기타 가구/인테리어',
  ],
  '홈·키친': [
    '조리용품 (팬/냄비)',
    '식기/컵/테이블웨어',
    '주방잡화 (조리도구/보관용기)',
    '칼/도마',
    '세탁용품 (건조대/바구니)',
    '욕실용품',
    '세제/청소용품',
    '수납/정리',
    '기타 생활용품',
  ],
  '유아동·완구': [
    '기저귀/물티슈',
    '유아복 (0~3세)',
    '아동복 (4~10세)',
    '아동 신발/잡화',
    '유아동 바디/구강케어',
    '유아용품 (침구/식기/위생)',
    '장난감/완구',
    '기타 유아·아동',
  ],
  '반려동물': [
    '강아지용품',
    '고양이용품',
    '사료/간식 (반려동물)',
    '기타 반려동물',
  ],
  '스포츠·헬스·캠핑': [
    '헬스/운동용품',
    '골프',
    '캠핑용품',
    '등산/아웃도어',
    '자전거/보드',
    '겨울 스포츠',
    '수영/수상용품',
    '기타 스포츠/레저',
  ],
  '파티오·정원': [
    '정원 가구',
    '파라솔/차양막',
    '그릴/바비큐',
    '정원용품/장식',
    '꽃/식물/원예',
    '창고/보관함',
    '기타 정원',
  ],
  '의류': [
    '패딩/점퍼', '집업/후리스', '티셔츠/맨투맨', '셔츠/블라우스', '니트/스웨터',
    '바지/하의', '스커트/원피스', '스포츠웨어/애슬레저', '속옷/양말', '기타 의류',
  ],
  '가방·잡화': [
    '가방/배낭', '여행가방/캐리어', '모자/액세서리', '신발/부츠', '슬리퍼/샌들',
    '스카프/머플러', '장갑/벨트', '선글라스/안경테', '기타 패션잡화',
  ],
  '보석·시계': [
    '목걸이', '귀걸이', '반지', '팔찌/뱅글', '시계', '순금/순은 (골드바/실버바)', '패션주얼리/기타',
  ],
  '화장품·미용·위생': [
    '스킨케어 (토너/세럼/크림)',
    '클렌징',
    '마스크팩/패드',
    '선케어',
    '메이크업 베이스 (쿠션/파운데이션)',
    '메이크업 색조 (립/아이/치크)',
    '향수/바디',
    '헤어케어',
    '화장지/키친타월',
    '생리대/위생용품',
    '기타 뷰티',
  ],
  '건강·영양제': [
    '비타민/미네랄',
    '유산균',
    '오메가3/크릴오일',
    '홍삼',
    '어린이 영양제',
    '다이어트/콜라겐',
    '프로틴/헬스 보충제',
    '관절/기타 건강식품',
  ],
  '공구·설비·자동차': [
    '공구/작업용품',
    '선반/수납 (공구)',
    '전구/건전지',
    '보안 (금고/도어락)',
    '자동차용품',
    '기타 공구/설비',
  ],
  '식품': [
    '신선식품 (과일/채소/정육/수산)',
    '가공식품 (라면/통조림/오일)',
    '과자/간식',
    '커피/차',
    '음료/생수',
    '쌀/잡곡/시리얼',
    '소스/양념',
    '건식품 (건어물/김/견과)',
    '냉장/냉동식품',
    '유기농식품',
    '기타 식품',
  ],
  '문구·사무': [
    '문구 (펜/노트)',
    '사무용품',
    '사무기기 (계산기/코팅기)',
    '기타 문구/사무',
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
