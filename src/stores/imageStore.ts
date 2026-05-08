import { create } from 'zustand'
import type { ProductImage } from '@/types/product'
import { generateId } from '@/lib/image'
import { saveImagesToDB, loadImagesFromDB, clearImagesFromDB } from '@/lib/imageDB'

/**
 * 현재 드래프트 ID 게터 — draftsStore에서 주입
 * 직접 import하면 순환 의존이라 함수로 받음
 */
let getCurrentDraftId: () => string = () => 'default'
export function setImageStoreDraftIdGetter(fn: () => string) {
  getCurrentDraftId = fn
}

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
  thumbnailImageId: string | null
  thumbnailDataUrl: string | null
  bgRemoveEnabled: boolean
  bgSelectedIds: string[]
  aiModelEnabled: boolean
  aiModelGender: 'male' | 'female'
  _hydrated: boolean

  addImages: (dataUrls: string[], prepend?: boolean) => void
  removeImage: (id: string) => void
  reorderImages: (fromIndex: number, toIndex: number) => void
  updateImage: (id: string, partial: Partial<ProductImage>) => void
  setThumbnailSource: (imageId: string | null) => void
  setThumbnailDataUrl: (dataUrl: string | null) => void
  setStoreIntroImage: (dataUrl: string | null) => void
  setTermsImage: (dataUrl: string | null) => void
  setBgRemoveEnabled: (enabled: boolean) => void
  toggleBgSelect: (id: string) => void
  selectAllForBg: () => void
  deselectAllForBg: () => void
  setAiModelEnabled: (enabled: boolean) => void
  setAiModelGender: (gender: 'male' | 'female') => void
  clearImages: () => void
  resetAll: () => void
  _hydrate: (force?: boolean) => Promise<void>
}

// IndexedDB에 이미지 동기 저장 (fire-and-forget) — 현재 드래프트 ID로 namespace
function persistImages(images: ProductImage[]) {
  saveImagesToDB(images, getCurrentDraftId()).catch(() => {})
}

export const useImageStore = create<ImageState>()((set, get) => ({
  images: [],
  thumbnailImageId: null,
  thumbnailDataUrl: null,
  storeIntroImage: null,
  termsImage: null,
  bgRemoveEnabled: false,
  bgSelectedIds: [],
  aiModelEnabled: false,
  aiModelGender: 'female',
  _hydrated: false,

  addImages: (dataUrls, prepend) => {
    set((state) => {
      const incoming = dataUrls.map((dataUrl) => ({
        id: generateId(),
        dataUrl,
        bgRemoved: false,
        order: 0,
      }))
      const merged = prepend
        ? [...incoming, ...state.images]
        : [...state.images, ...incoming]
      const newImages = merged.map((img, i) => ({ ...img, order: i }))
      persistImages(newImages)
      return { images: newImages }
    })
  },

  removeImage: (id) => {
    set((state) => {
      const newImages = state.images
        .filter((img) => img.id !== id)
        .map((img, i) => ({ ...img, order: i }))
      persistImages(newImages)
      return { images: newImages }
    })
  },

  reorderImages: (fromIndex, toIndex) => {
    set((state) => {
      const newImages = [...state.images]
      const [moved] = newImages.splice(fromIndex, 1)
      newImages.splice(toIndex, 0, moved)
      const reordered = newImages.map((img, i) => ({ ...img, order: i }))
      persistImages(reordered)
      return { images: reordered }
    })
  },

  updateImage: (id, partial) => {
    set((state) => {
      const newImages = state.images.map((img) =>
        img.id === id ? { ...img, ...partial } : img,
      )
      persistImages(newImages)
      return { images: newImages }
    })
  },

  setThumbnailSource: (imageId) => set({ thumbnailImageId: imageId }),
  setThumbnailDataUrl: (dataUrl) => set({ thumbnailDataUrl: dataUrl }),

  setStoreIntroImage: (dataUrl) => {
    set({ storeIntroImage: dataUrl })
    saveToLocal(LS_STORE_INTRO, dataUrl)
  },
  setTermsImage: (dataUrl) => {
    set({ termsImage: dataUrl })
    saveToLocal(LS_TERMS, dataUrl)
  },

  setBgRemoveEnabled: (enabled) => set({ bgRemoveEnabled: enabled, bgSelectedIds: [] }),
  toggleBgSelect: (id) => set((state) => ({
    bgSelectedIds: state.bgSelectedIds.includes(id)
      ? state.bgSelectedIds.filter((x) => x !== id)
      : [...state.bgSelectedIds, id],
  })),
  selectAllForBg: () => set((state) => ({
    bgSelectedIds: state.images.filter((img) => !img.bgRemoved).map((img) => img.id),
  })),
  deselectAllForBg: () => set({ bgSelectedIds: [] }),
  setAiModelEnabled: (enabled) => set({ aiModelEnabled: enabled }),
  setAiModelGender: (gender) => set({ aiModelGender: gender }),

  clearImages: () => {
    set({ images: [], storeIntroImage: null, termsImage: null })
    clearImagesFromDB(getCurrentDraftId()).catch(() => {})
  },

  // 새 작업: 상품 이미지 초기화, 스토어 소개/약관은 localStorage에서 복원
  resetAll: () => {
    set({
      images: [],
      thumbnailImageId: null,
      thumbnailDataUrl: null,
      storeIntroImage: loadFromLocal(LS_STORE_INTRO),
      termsImage: loadFromLocal(LS_TERMS),
      bgRemoveEnabled: false,
      bgSelectedIds: [],
      aiModelEnabled: false,
      aiModelGender: 'female',
    })
    clearImagesFromDB(getCurrentDraftId()).catch(() => {})
  },

  /**
   * 드래프트별 이미지 복원
   * - 첫 hydration (앱 시작): _hydrated false → IndexedDB에서 현재 드래프트 이미지 로드
   * - 드래프트 전환: 외부에서 강제로 다시 호출 (force=true) → 새 드래프트 이미지 로드
   */
  _hydrate: async (force?: boolean) => {
    if (get()._hydrated && !force) return
    try {
      const images = await loadImagesFromDB(getCurrentDraftId())
      const storeIntro = loadFromLocal(LS_STORE_INTRO)
      const terms = loadFromLocal(LS_TERMS)
      set({
        images: images.length > 0 ? images : [],
        storeIntroImage: storeIntro,
        termsImage: terms,
        _hydrated: true,
        // 드래프트 전환 시 임시 상태 초기화
        thumbnailImageId: null,
        bgSelectedIds: [],
      })
    } catch {
      set({ _hydrated: true })
    }
  },
}))

// 자동 hydration은 draftsStore가 초기화 후 트리거 (이전엔 자동이었음)
