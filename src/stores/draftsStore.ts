import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useProductStore } from './productStore'
import { useEditorStore } from './editorStore'
import { useImageStore, setImageStoreDraftIdGetter } from './imageStore'
import {
  saveImagesToDB,
  loadImagesFromDB,
  clearImagesFromDB,
  loadLegacyImages,
  deleteLegacyImages,
} from '@/lib/imageDB'

/**
 * 다중 드래프트 시스템
 *
 * 저장 구조:
 * - localStorage `pagecraft-product` / `pagecraft-editor` = 현재 작업 중인 라이브 사본
 *   (zustand persist가 자동 관리, 빠른 진입을 위한 작업 캐시)
 * - localStorage `pagecraft-product-${id}` / `pagecraft-editor-${id}` = 드래프트별 스냅샷
 * - IndexedDB `product-images:${id}` = 드래프트별 이미지
 *
 * 드래프트 전환 흐름:
 * 1. 현재 라이브 사본 → 현재 드래프트 스냅샷에 복사
 * 2. 현재 이미지 → 현재 드래프트의 IndexedDB 키에 저장
 * 3. 타겟 드래프트 스냅샷 → 라이브 사본으로 복사
 * 4. zustand rehydrate → 스토어 reload
 * 5. imageStore 다시 hydrate → 타겟 드래프트 이미지 로드
 *
 * 향후 백엔드 도입 시:
 * - 서버가 source of truth (무제한 보관)
 * - localStorage는 LRU 캐시 (최근 N개만 보관)
 * - MAX_DRAFTS는 캐시 크기로 의미 변경
 */

/**
 * localStorage 보관 가능한 최대 드래프트 수.
 * 평균 드래프트당 ~15-30KB → 20개면 0.5-1MB (5MB 한도 안전)
 * 백엔드 도입 후엔 로컬 캐시 크기로만 사용 (서버는 무제한).
 */
export const MAX_DRAFTS = 20

export interface DraftMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

interface DraftsState {
  drafts: DraftMeta[]
  currentId: string
  _initialized: boolean

  /** 앱 시작 시 호출 — 드래프트 없으면 기본 드래프트 생성 + 레거시 데이터 마이그레이션 */
  initialize: () => Promise<void>

  /** 새 드래프트 생성 + 즉시 전환 */
  createDraft: () => Promise<string>

  /** 드래프트 전환 — 현재 작업 자동 저장 후 타겟 로드 */
  switchDraft: (targetId: string) => Promise<void>

  /** 드래프트 삭제 — 현재 드래프트 삭제 시 다음 드래프트로 자동 전환 */
  deleteDraft: (id: string) => Promise<void>

  /** 현재 드래프트 메타 업데이트 — 이름 = product.name 자동 동기화용 */
  touchCurrent: (name?: string) => void
}

const productSnapshotKey = (id: string) => `pagecraft-product-${id}`
const editorSnapshotKey = (id: string) => `pagecraft-editor-${id}`

async function snapshotCurrent(draftId: string) {
  if (typeof window === 'undefined' || !draftId) return
  const liveProduct = localStorage.getItem('pagecraft-product')
  const liveEditor = localStorage.getItem('pagecraft-editor')
  if (liveProduct) localStorage.setItem(productSnapshotKey(draftId), liveProduct)
  if (liveEditor) localStorage.setItem(editorSnapshotKey(draftId), liveEditor)

  // 이미지: 현재 메모리 → 드래프트별 IndexedDB 키
  const images = useImageStore.getState().images
  await saveImagesToDB(images, draftId).catch(() => {})
}

async function loadSnapshot(draftId: string) {
  if (typeof window === 'undefined') return
  const productSnap = localStorage.getItem(productSnapshotKey(draftId))
  const editorSnap = localStorage.getItem(editorSnapshotKey(draftId))

  if (productSnap) {
    localStorage.setItem('pagecraft-product', productSnap)
  } else {
    localStorage.removeItem('pagecraft-product')
  }
  if (editorSnap) {
    localStorage.setItem('pagecraft-editor', editorSnap)
  } else {
    localStorage.removeItem('pagecraft-editor')
  }

  // zustand persist 강제 재수화
  await useProductStore.persist.rehydrate()
  await useEditorStore.persist.rehydrate()

  // 스냅샷 없으면 기본값으로 명시 reset (rehydrate가 빈 storage면 그대로 두므로)
  if (!productSnap) useProductStore.getState().resetProduct()
  if (!editorSnap) useEditorStore.getState().resetEditor()

  // 이미지 hydrate — draftId 명시 전달 (currentId 업데이트 시점 무관)
  await useImageStore.getState()._hydrate(true, draftId)
}

export const useDraftsStore = create<DraftsState>()(
  persist(
    (set, get) => ({
      drafts: [],
      currentId: '',
      _initialized: false,

      initialize: async () => {
        if (get()._initialized) return

        // 게터 등록 (imageStore가 현재 드래프트 ID 알 수 있게)
        setImageStoreDraftIdGetter(() => get().currentId)

        const existing = get().drafts
        if (existing.length > 0) {
          // 이미 드래프트 있음 → 현재 드래프트 이미지 hydrate만
          await useImageStore.getState()._hydrate()
          set({ _initialized: true })
          return
        }

        // 첫 실행 — 기본 드래프트 생성 + 레거시 데이터 마이그레이션
        // 이름은 빈 문자열 — useEffect가 product.name 따라 자동 채움
        const id = crypto.randomUUID()
        const meta: DraftMeta = {
          id,
          name: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        // 레거시 IndexedDB 이미지 → 새 드래프트 키로 이관
        try {
          const legacy = await loadLegacyImages()
          if (legacy && legacy.length > 0) {
            await saveImagesToDB(legacy, id)
            await deleteLegacyImages()
          }
        } catch {
          // 무시 (첫 실행 시 레거시 없음 정상)
        }

        // 라이브 사본을 새 드래프트 스냅샷에 복사 (이미 작업 중이었던 데이터)
        const liveProduct = localStorage.getItem('pagecraft-product')
        const liveEditor = localStorage.getItem('pagecraft-editor')
        if (liveProduct) localStorage.setItem(productSnapshotKey(id), liveProduct)
        if (liveEditor) localStorage.setItem(editorSnapshotKey(id), liveEditor)

        set({ drafts: [meta], currentId: id, _initialized: true })

        // 이미지 hydrate
        await useImageStore.getState()._hydrate(true)
      },

      createDraft: async () => {
        // 0. 한도 체크 — localStorage 5MB 한도 보호
        if (get().drafts.length >= MAX_DRAFTS) {
          throw new Error(
            `드래프트는 최대 ${MAX_DRAFTS}개까지 보관할 수 있어요. 사용 안 하는 드래프트를 삭제해주세요.`,
          )
        }

        // 1. 현재 작업 스냅샷 저장 (옛 currentId)
        const currentId = get().currentId
        if (currentId) await snapshotCurrent(currentId)

        // 2. 새 드래프트 메타 생성 (이름은 빈 문자열, useEffect가 product.name 따라감)
        const id = crypto.randomUUID()
        const meta: DraftMeta = {
          id,
          name: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        // 3. 드래프트 등록 + 활성화 (currentId 먼저 — 이후 모든 persist는 새 드래프트 키로)
        set({ drafts: [...get().drafts, meta], currentId: id })

        // 4. 라이브 사본 비우기 + 스토어 reset
        localStorage.removeItem('pagecraft-product')
        localStorage.removeItem('pagecraft-editor')
        useProductStore.getState().resetProduct()
        useEditorStore.getState().resetEditor()
        useImageStore.setState({
          images: [],
          thumbnailImageId: null,
          bgSelectedIds: [],
        })

        return id
      },

      switchDraft: async (targetId) => {
        const currentId = get().currentId
        if (targetId === currentId) return

        // 1. 현재 작업 스냅샷 (옛 currentId 사용)
        if (currentId) await snapshotCurrent(currentId)

        // 2. currentId 업데이트 — 이후 persistImages 등이 새 드래프트 키로 저장
        set({ currentId: targetId })

        // 3. 타겟 스냅샷 로드 (라이브 사본 + 스토어 rehydrate + 이미지)
        await loadSnapshot(targetId)
      },

      deleteDraft: async (id) => {
        // 스냅샷/이미지 삭제
        if (typeof window !== 'undefined') {
          localStorage.removeItem(productSnapshotKey(id))
          localStorage.removeItem(editorSnapshotKey(id))
        }
        await clearImagesFromDB(id).catch(() => {})

        const remaining = get().drafts.filter((d) => d.id !== id)

        if (id === get().currentId) {
          // 현재 드래프트 삭제 → 다음으로 전환 또는 새 드래프트 생성
          if (remaining.length === 0) {
            // 마지막 드래프트 삭제 → 빈 새 드래프트 생성 (이름 빈 문자열)
            const newId = crypto.randomUUID()
            const newMeta: DraftMeta = {
              id: newId,
              name: '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }
            localStorage.removeItem('pagecraft-product')
            localStorage.removeItem('pagecraft-editor')
            useProductStore.getState().resetProduct()
            useEditorStore.getState().resetEditor()
            useImageStore.setState({ images: [], thumbnailImageId: null, bgSelectedIds: [] })
            set({ drafts: [newMeta], currentId: newId })
          } else {
            // 첫 번째 남은 드래프트로 전환 — currentId 먼저 업데이트
            set({ drafts: remaining, currentId: remaining[0].id })
            await loadSnapshot(remaining[0].id)
          }
        } else {
          // 현재 아닌 드래프트 삭제 → 단순 목록에서 제거
          set({ drafts: remaining })
        }
      },

      touchCurrent: (name) => {
        const id = get().currentId
        if (!id) return
        set({
          drafts: get().drafts.map((d) =>
            d.id === id
              ? { ...d, updatedAt: Date.now(), ...(name !== undefined ? { name } : {}) }
              : d,
          ),
        })
      },
    }),
    {
      name: 'pagecraft-drafts',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        drafts: state.drafts,
        currentId: state.currentId,
      }),
    },
  ),
)

// 클라이언트에서 자동 초기화 (앱 첫 진입 시 1회)
if (typeof window !== 'undefined') {
  // hydration 끝난 직후 initialize 호출
  // setTimeout으로 zustand persist 동기 hydration 완료 보장
  setTimeout(() => {
    useDraftsStore.getState().initialize()
  }, 0)
}
