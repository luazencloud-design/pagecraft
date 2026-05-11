import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Product, Platform } from '@/types/product'
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
 * localStorage에 저장된 옛 데이터를 읽을 때만 동작
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
        set((state) => ({
          // 템플릿은 플랫폼 변경 시 자동 변경하지 않음 — 사용자가 생성된 미리보기를
          // 그대로 유지하길 원함. 새 플랫폼에 맞춰지는 시점은:
          //   1) AI 생성 (자동으로 platform's defaultTemplate 적용)
          //   2) 사용자가 수동으로 ProductForm 템플릿 드롭다운에서 변경
          product: { ...state.product, ...partial },
        })),
      resetProduct: () => set({ product: { ...defaultProduct } }),
    }),
    {
      name: 'pagecraft-product',
      // localStorage — 새 탭/브라우저 재시작에도 유지 (탭간 공유)
      // 이미지(IndexedDB)와 함께 작업 영속성 보장
      storage: createJSONStorage(() => localStorage),
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
