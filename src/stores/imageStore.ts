import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ProductImage } from '@/types/product'
import { generateId } from '@/lib/image'

// localStorage 키 — 스토어 소개/약관 이미지는 세션과 무관하게 영구 보존
const LS_STORE_INTRO = 'pagecraft-store-intro'
const LS_TERMS = 'pagecraft-terms'

function saveToLocal(key: string, value: string | null) {
  if (typeof window === 'undefined') return
  if (value) localStorage.setItem(key, value)
  else localStorage.removeItem(key)
}

function loadFromLocal(key: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(key)
}

interface ImageState {
  images: ProductImage[]
  storeIntroImage: string | null
  termsImage: string | null
  bgRemoveEnabled: boolean
  aiModelEnabled: boolean
  aiModelGender: 'male' | 'female'

  addImages: (dataUrls: string[]) => void
  removeImage: (id: string) => void
  reorderImages: (fromIndex: number, toIndex: number) => void
  updateImage: (id: string, partial: Partial<ProductImage>) => void
  setStoreIntroImage: (dataUrl: string | null) => void
  setTermsImage: (dataUrl: string | null) => void
  setBgRemoveEnabled: (enabled: boolean) => void
  setAiModelEnabled: (enabled: boolean) => void
  setAiModelGender: (gender: 'male' | 'female') => void
  clearImages: () => void
  resetAll: () => void
}

export const useImageStore = create<ImageState>()(
  persist(
    (set) => ({
      images: [],
      storeIntroImage: null,
      termsImage: null,
      bgRemoveEnabled: false,
      aiModelEnabled: false,
      aiModelGender: 'female',

      addImages: (dataUrls) =>
        set((state) => ({
          images: [
            ...state.images,
            ...dataUrls.map((dataUrl, i) => ({
              id: generateId(),
              dataUrl,
              bgRemoved: false,
              order: state.images.length + i,
            })),
          ],
        })),

      removeImage: (id) =>
        set((state) => ({
          images: state.images
            .filter((img) => img.id !== id)
            .map((img, i) => ({ ...img, order: i })),
        })),

      reorderImages: (fromIndex, toIndex) =>
        set((state) => {
          const newImages = [...state.images]
          const [moved] = newImages.splice(fromIndex, 1)
          newImages.splice(toIndex, 0, moved)
          return { images: newImages.map((img, i) => ({ ...img, order: i })) }
        }),

      updateImage: (id, partial) =>
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id ? { ...img, ...partial } : img,
          ),
        })),

      // localStorage에도 동시 저장
      setStoreIntroImage: (dataUrl) => {
        set({ storeIntroImage: dataUrl })
        saveToLocal(LS_STORE_INTRO, dataUrl)
      },
      setTermsImage: (dataUrl) => {
        set({ termsImage: dataUrl })
        saveToLocal(LS_TERMS, dataUrl)
      },

      setBgRemoveEnabled: (enabled) => set({ bgRemoveEnabled: enabled }),
      setAiModelEnabled: (enabled) => set({ aiModelEnabled: enabled }),
      setAiModelGender: (gender) => set({ aiModelGender: gender }),
      clearImages: () =>
        set({ images: [], storeIntroImage: null, termsImage: null }),
      // 새 작업 시 상품 이미지만 초기화, 스토어 소개/약관은 localStorage에서 복원
      resetAll: () =>
        set({
          images: [],
          storeIntroImage: loadFromLocal(LS_STORE_INTRO),
          termsImage: loadFromLocal(LS_TERMS),
          bgRemoveEnabled: false,
          aiModelEnabled: false,
          aiModelGender: 'female',
        }),
    }),
    {
      name: 'pagecraft-images',
      storage: createJSONStorage(() => sessionStorage),
      // sessionStorage 복원 후, 스토어 소개/약관 이미지가 없으면 localStorage에서 가져옴
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as object) }
        if (!merged.storeIntroImage) {
          merged.storeIntroImage = loadFromLocal(LS_STORE_INTRO)
        }
        if (!merged.termsImage) {
          merged.termsImage = loadFromLocal(LS_TERMS)
        }
        return merged
      },
    },
  ),
)
