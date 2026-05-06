import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Product, Platform, Template } from '@/types/product'
import { PLATFORM_META } from '@/types/product'

interface ProductState {
  product: Product
  setProduct: (product: Partial<Product>) => void
  resetProduct: () => void
}

const defaultProduct: Product = {
  brand: '',
  name: '',
  price: '',
  category: '',
  platform: 'coupang',
  template: 'korean-default',
  memo: '',
  features: [],
}

/**
 * 기존 한글 platform 값('쿠팡', '스마트스토어' 등) → 새 영문 코드로 마이그레이션
 * sessionStorage에 저장된 옛 데이터를 읽을 때만 동작
 */
function migratePlatform(legacy: string): Platform {
  switch (legacy) {
    case '쿠팡': return 'coupang'
    case '스마트스토어': return 'smartstore'
    case '쿠팡+스마트스토어': return 'multi-kr'
    case '기타': return 'other'
    default: return (legacy as Platform) in PLATFORM_META ? (legacy as Platform) : 'coupang'
  }
}

export const useProductStore = create<ProductState>()(
  persist(
    (set) => ({
      product: { ...defaultProduct },
      setProduct: (partial) =>
        set((state) => {
          // 플랫폼 변경 시 template 자동 보정 (다른 마켓의 템플릿이 남아있으면 기본값으로)
          let nextProduct: Product = { ...state.product, ...partial }
          if (partial.platform && partial.platform !== state.product.platform) {
            const meta = PLATFORM_META[nextProduct.platform]
            const currentTemplate: Template = nextProduct.template ?? 'korean-default'
            const isCompatibleTemplate = meta && (
              (meta.market === 'kr' && currentTemplate === 'korean-default') ||
              (meta.market === 'jp' && (currentTemplate === 'qoo10-modern' || currentTemplate === 'qoo10-classic'))
            )
            if (!isCompatibleTemplate) {
              nextProduct.template = meta?.defaultTemplate ?? 'korean-default'
            }
          }
          return { product: nextProduct }
        }),
      resetProduct: () => set({ product: { ...defaultProduct } }),
    }),
    {
      name: 'pagecraft-product',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // 옛 한글 platform 값 변환
        if (typeof state.product.platform === 'string') {
          state.product.platform = migratePlatform(state.product.platform)
        }
        if (!state.product.template) {
          state.product.template = PLATFORM_META[state.product.platform]?.defaultTemplate ?? 'korean-default'
        }
      },
    },
  ),
)
