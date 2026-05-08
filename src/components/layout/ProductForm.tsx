'use client'

import { useProductStore } from '@/stores/productStore'
import {
  PLATFORM_META,
  TEMPLATE_META,
  CATEGORY_GROUPS,
  CURRENCY_SYMBOL,
  type Platform,
  type Template,
} from '@/types/product'

const PLATFORM_OPTIONS: Platform[] = ['coupang', 'smartstore', 'multi-kr', 'qoo10-jp', 'ebay-us', 'other']

export default function ProductForm() {
  const { product, setProduct } = useProductStore()
  const platformMeta = PLATFORM_META[product.platform]
  const isJpMarket = platformMeta?.market === 'jp'
  const isUsMarket = platformMeta?.market === 'us'
  const currencySymbol = CURRENCY_SYMBOL[platformMeta?.currency ?? 'KRW']

  // 마켓별 템플릿 목록 (한국·미국은 default 1개, 큐텐만 2개)
  const availableTemplates: Template[] = isJpMarket
    ? ['qoo10-modern', 'qoo10-classic']
    : isUsMarket
      ? ['ebay-default']
      : ['korean-default']

  const inputCls = "w-full bg-surface2 border border-border rounded-lg px-[11px] py-2 text-[12.5px] text-text font-sans placeholder:text-text3 focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-dim)] transition-[border-color,box-shadow] duration-150 appearance-none"

  const labelCls = "flex items-center gap-[5px] text-[11px] font-medium text-text2 mb-[6px]"

  return (
    <div>
      {/* Brand */}
      <div className="field-group">
        <div className={labelCls}>
          <span className="w-[5px] h-[5px] rounded-full bg-accent opacity-70" />브랜드명
        </div>
        <input className={inputCls} placeholder="예: 내셔널 지오그래픽" value={product.brand} onChange={(e) => setProduct({ brand: e.target.value })} />
      </div>

      {/* Product Name */}
      <div className="field-group">
        <div className={labelCls}>
          <span className="w-[5px] h-[5px] rounded-full bg-accent opacity-70" />상품명
        </div>
        <input className={inputCls} placeholder="예: 슬라이드 슬리퍼 남녀공용" value={product.name} onChange={(e) => setProduct({ name: e.target.value })} />
      </div>

      {/* Category — optgroup 그룹화 */}
      <div className="field-group">
        <div className={labelCls}>
          <span className="w-[5px] h-[5px] rounded-full bg-accent opacity-70" />카테고리
        </div>
        <select className={inputCls} value={product.category} onChange={(e) => setProduct({ category: e.target.value })}>
          <option value="">카테고리 선택</option>
          {Object.entries(CATEGORY_GROUPS).map(([groupName, items]) => (
            <optgroup key={groupName} label={groupName}>
              {items.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Platform */}
      <div className="field-group">
        <div className={labelCls}>
          <span className="w-[5px] h-[5px] rounded-full bg-accent opacity-70" />플랫폼
        </div>
        <select
          className={inputCls}
          value={product.platform}
          onChange={(e) => setProduct({ platform: e.target.value as Platform })}
        >
          {PLATFORM_OPTIONS.map((p) => (
            <option key={p} value={p}>{PLATFORM_META[p].label}</option>
          ))}
        </select>
        {isJpMarket && (
          <p className="text-[10px] text-text3 mt-[5px] leading-[1.5]">
            🇯🇵 일본어 + 한국어 동시 생성. 결과 패널에서 토글 가능.
          </p>
        )}
        {isUsMarket && (
          <p className="text-[10px] text-text3 mt-[5px] leading-[1.5]">
            🇺🇸 영어 + 한국어 동시 생성. 가격은 USD ($) 기준으로 입력하세요.
          </p>
        )}
        {currencySymbol && (
          <p className="text-[10px] text-text3 mt-[3px] leading-[1.5]">
            가격 단위: <b>{currencySymbol} ({platformMeta?.currency})</b>
          </p>
        )}
      </div>

      {/* Template — 일본 마켓일 때만 (한국은 단일이라 숨김) */}
      {availableTemplates.length > 1 && (
        <div className="field-group">
          <div className={labelCls}>
            <span className="w-[5px] h-[5px] rounded-full bg-accent opacity-70" />템플릿
          </div>
          <select
            className={inputCls}
            value={product.template ?? availableTemplates[0]}
            onChange={(e) => setProduct({ template: e.target.value as Template })}
          >
            {availableTemplates.map((t) => (
              <option key={t} value={t}>{TEMPLATE_META[t].label}</option>
            ))}
          </select>
          <p className="text-[10px] text-text3 mt-[5px] leading-[1.5]">
            {TEMPLATE_META[product.template ?? availableTemplates[0]]?.description}
          </p>
        </div>
      )}

    </div>
  )
}
