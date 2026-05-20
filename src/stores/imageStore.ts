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

// 한 드래프트당 이미지 최대 매수 — UI에도 동일 노출
export const MAX_IMAGES = 10

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
  /**
   * AI 전용 모드 — 활성 시 detail page 템플릿은 source === 'ai' 만 사용.
   * ImageGrid 도 시각 분리 (원본 / AI 섹션). 풀세트 생성 시 자동 활성화.
   */
  aiOnlyMode: boolean
  _hydrated: boolean

  /** addImages — prepend / source 지정 가능. source 기본값 'original' */
  addImages: (dataUrls: string[], prepend?: boolean, source?: 'original' | 'ai') => void
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
  /**
   * AI 전용 모드 토글.
   * 끄려는데 원본+AI 합산이 MAX_IMAGES 초과면 변경 거부 + false 반환.
   * → caller가 사용자에게 안내 (몇 장 삭제해야 하는지)
   */
  setAiOnlyMode: (enabled: boolean) => { ok: boolean; excess?: number }
  clearImages: () => void
  resetAll: () => void
  /**
   * IndexedDB에서 이미지 복원
   * @param force 이미 hydrated여도 다시 로드 (드래프트 전환 시)
   * @param draftId 명시적으로 드래프트 ID 지정 (currentId 업데이트 race condition 방지)
   */
  _hydrate: (force?: boolean, draftId?: string) => Promise<void>
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
  aiOnlyMode: false,
  _hydrated: false,

  addImages: (dataUrls, prepend, source = 'original') => {
    set((state) => {
      // 한도 정책:
      //  - AI 전용 모드 ON: 각 source 별 독립 (AI는 AI끼리, 원본은 원본끼리 10장)
      //  - mixed 모드: 전체 합산 10장
      const { aiOnlyMode, images } = state
      let remaining: number
      if (aiOnlyMode) {
        const sameSourceCount = images.filter(
          (i) => (i.source ?? 'original') === source,
        ).length
        remaining = Math.max(0, MAX_IMAGES - sameSourceCount)
      } else {
        remaining = Math.max(0, MAX_IMAGES - images.length)
      }
      const accepted = dataUrls.slice(0, remaining)
      if (accepted.length === 0) return state
      const incoming: ProductImage[] = accepted.map((dataUrl) => ({
        id: generateId(),
        dataUrl,
        bgRemoved: false,
        order: 0,
        source,
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
  setAiOnlyMode: (enabled) => {
    // 끄는 방향: 전체 합산이 한도 초과면 거부
    if (!enabled) {
      const total = get().images.length
      if (total > MAX_IMAGES) {
        return { ok: false, excess: total - MAX_IMAGES }
      }
    }
    set({ aiOnlyMode: enabled })
    return { ok: true }
  },

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
      aiOnlyMode: false,
    })
    clearImagesFromDB(getCurrentDraftId()).catch(() => {})
  },

  /**
   * 드래프트별 이미지 복원
   * - 첫 hydration (앱 시작): _hydrated false → IndexedDB에서 현재 드래프트 이미지 로드
   * - 드래프트 전환: 외부에서 강제로 다시 호출 (force=true) → 새 드래프트 이미지 로드
   * - draftId 인자가 있으면 그 값을 우선 사용 (currentId 업데이트 race 방지)
   */
  _hydrate: async (force?: boolean, draftId?: string) => {
    if (get()._hydrated && !force) return
    try {
      const id = draftId ?? getCurrentDraftId()
      const images = await loadImagesFromDB(id)
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
