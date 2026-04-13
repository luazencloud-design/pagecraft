'use client'

import { useProductStore } from '@/stores/productStore'

const CATEGORIES = [
  '패션의류', '패션잡화', '뷰티', '식품', '생활용품',
  '가전디지털', '스포츠', '유아동', '반려동물', '기타',
]

const FEATURES = [
  '프리미엄', '가성비', '트렌디', '핸드메이드', '친환경', '국내산',
  '수입', '한정판', '시즌상품', '베스트셀러', '신상품', '묶음할인',
]

export default function ProductForm() {
  const { product, setProduct } = useProductStore()

  const toggleFeature = (feature: string) => {
    const features = product.features.includes(feature)
      ? product.features.filter((f) => f !== feature)
      : [...product.features, feature]
    setProduct({ features })
  }

  return (
    <div className="space-y-[10px] px-[18px]">
      {/* Brand */}
      <div className="flex flex-col gap-[6px]">
        <label className="text-[11px] font-medium text-text2 flex items-center gap-[5px]">
          <span className="w-1 h-1 rounded-full bg-text3 opacity-70" />브랜드
        </label>
        <input className="w-full bg-surface2 border border-border rounded-lg px-[11px] py-2 text-[12.5px] text-text font-sans placeholder:text-text3 focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-dim)] transition-[border-color,box-shadow] duration-150" placeholder="예: 내셔널 지오그래픽" value={product.brand} onChange={(e) => setProduct({ brand: e.target.value })} />
      </div>

      {/* Product Name */}
      <div className="flex flex-col gap-[6px]">
        <label className="text-[11px] font-medium text-text2 flex items-center gap-[5px]">
          <span className="w-1 h-1 rounded-full bg-text3 opacity-70" />상품명
        </label>
        <input className="w-full bg-surface2 border border-border rounded-lg px-[11px] py-2 text-[12.5px] text-text font-sans placeholder:text-text3 focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-dim)] transition-[border-color,box-shadow] duration-150" placeholder="예: 슬라이드 슬리퍼 남녀공용" value={product.name} onChange={(e) => setProduct({ name: e.target.value })} />
      </div>

      {/* Price */}
      <div className="flex flex-col gap-[6px]">
        <label className="text-[11px] font-medium text-text2 flex items-center gap-[5px]">
          <span className="w-1 h-1 rounded-full bg-text3 opacity-70" />가격
        </label>
        <input className="w-full bg-surface2 border border-border rounded-lg px-[11px] py-2 text-[12.5px] text-text font-sans placeholder:text-text3 focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-dim)] transition-[border-color,box-shadow] duration-150" placeholder="예: 39,900" value={product.price} onChange={(e) => setProduct({ price: e.target.value })} />
      </div>

      {/* Category */}
      <div className="flex flex-col gap-[6px]">
        <label className="text-[11px] font-medium text-text2 flex items-center gap-[5px]">
          <span className="w-1 h-1 rounded-full bg-text3 opacity-70" />카테고리
        </label>
        <select className="w-full bg-surface2 border border-border rounded-lg px-[11px] py-2 text-[12.5px] text-text font-sans appearance-none focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-dim)] transition-[border-color,box-shadow] duration-150" value={product.category} onChange={(e) => setProduct({ category: e.target.value })}>
          <option value="">선택하세요</option>
          {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
        </select>
      </div>

      {/* Platform */}
      <div className="flex flex-col gap-[6px]">
        <label className="text-[11px] font-medium text-text2 flex items-center gap-[5px]">
          <span className="w-1 h-1 rounded-full bg-text3 opacity-70" />판매 플랫폼
        </label>
        <select className="w-full bg-surface2 border border-border rounded-lg px-[11px] py-2 text-[12.5px] text-text font-sans appearance-none focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-dim)] transition-[border-color,box-shadow] duration-150" value={product.platform} onChange={(e) => setProduct({ platform: e.target.value })}>
          <option value="쿠팡">쿠팡</option>
          <option value="네이버 스마트스토어">네이버 스마트스토어</option>
          <option value="11번가">11번가</option>
          <option value="G마켓">G마켓</option>
        </select>
      </div>

      {/* Divider */}
      <div className="h-px bg-border my-2" />

      {/* Feature chips */}
      <div className="flex flex-col gap-[6px]">
        <label className="text-[11px] font-medium text-text2 flex items-center gap-[5px]">
          <span className="w-1 h-1 rounded-full bg-text3 opacity-70" />특징
        </label>
        <div className="flex flex-wrap gap-[5px]">
          {FEATURES.map((feat) => (
            <button
              key={feat}
              className={`px-[10px] py-1 rounded-[20px] text-[11px] cursor-pointer transition-all duration-150 border ${
                product.features.includes(feat)
                  ? 'bg-accent-dim border-accent text-accent2'
                  : 'bg-transparent border-border text-text3 hover:border-border2'
              }`}
              onClick={() => toggleFeature(feat)}
            >
              {feat}
            </button>
          ))}
        </div>
      </div>

      {/* Memo */}
      <div className="flex flex-col gap-[6px]">
        <label className="text-[11px] font-medium text-text2 flex items-center gap-[5px]">
          <span className="w-1 h-1 rounded-full bg-text3 opacity-70" />메모 (선택)
        </label>
        <textarea
          className="w-full bg-surface2 border border-border rounded-lg px-[11px] py-2 text-[12.5px] text-text font-sans placeholder:text-text3 focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-dim)] transition-[border-color,box-shadow] duration-150 resize-y min-h-[68px] leading-[1.6]"
          rows={3}
          placeholder="색상, 소재, 특징 등 AI에게 전달할 추가 정보"
          value={product.memo}
          onChange={(e) => setProduct({ memo: e.target.value })}
        />
      </div>
    </div>
  )
}
