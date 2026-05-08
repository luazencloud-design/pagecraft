import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  GeneratedContent, GeneratedTitle, GeneratedTag, GeneratedAll, GeneratedByLang,
} from '@/types/ai'
import type { Lang } from '@/types/product'

type ActiveTab = 'copy' | 'title' | 'tags' | 'export'

/** 언어별 캐시 — 한 번 생성/번역한 결과 보존하여 토글 시 재호출 방지 */
type LangCache = Partial<Record<Lang, GeneratedAll>>

interface EditorState {
  // 활성 콘텐츠 (현재 언어)
  generatedContent: GeneratedContent | null
  generatedTitles: GeneratedTitle[]
  generatedTags: GeneratedTag[]

  // 언어 상태
  currentLang: Lang
  langCache: LangCache
  /**
   * 마지막으로 수정된 언어 — 다른 언어로 동기화 필요 표시.
   * AI 생성/번역으로 갱신되면 null. 사용자가 CopyPanel에서 편집하면 currentLang으로 세팅.
   */
  dirtyLang: Lang | null

  activeTab: ActiveTab

  // 세션 유지 안 됨 (blob URL, 로딩 상태)
  renderedImageUrl: string | null
  isGenerating: boolean
  isTranslating: boolean
  isRenderingPng: boolean
  isGeneratingTitles: boolean
  isGeneratingTags: boolean
  loadingMessage: string
  generateError: string

  setGeneratedContent: (content: GeneratedContent | null) => void
  setGeneratedTitles: (titles: GeneratedTitle[]) => void
  setGeneratedTags: (tags: GeneratedTag[]) => void

  /** 특정 언어로 전체 결과 저장 + 활성 언어로 전환 */
  setGeneratedAllForLang: (lang: Lang, all: GeneratedAll) => void
  /**
   * 여러 언어를 한 번에 캐시에 저장 + 활성 언어로 전환
   * (큐텐 바이링구얼 응답 처리용)
   */
  setGeneratedByLang: (byLang: GeneratedByLang, activeLang: Lang) => void
  /** 캐시 hit 시 즉시 전환, miss면 false 반환 (번역 트리거는 호출자) */
  switchLang: (lang: Lang) => boolean
  /** 캐시 초기화 (새 상품 시작 등) */
  clearLangCache: () => void
  /**
   * 특정 언어 캐시만 갱신 (활성 언어 전환 X)
   * — currentLang과 같으면 화면도 갱신, 아니면 캐시만 업데이트
   * 동기화 결과 저장에 사용
   */
  cacheLang: (lang: Lang, all: GeneratedAll) => void
  /** dirty 마킹 명시 제어 (예: 동기화 완료 후 null로 클리어) */
  setDirty: (lang: Lang | null) => void

  setRenderedImageUrl: (url: string | null) => void
  setActiveTab: (tab: ActiveTab) => void
  setIsGenerating: (loading: boolean) => void
  setIsTranslating: (loading: boolean) => void
  setIsRenderingPng: (loading: boolean) => void
  setIsGeneratingTitles: (loading: boolean) => void
  setIsGeneratingTags: (loading: boolean) => void
  setLoadingMessage: (message: string) => void
  setGenerateError: (error: string) => void
  resetEditor: () => void
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      generatedContent: null,
      generatedTitles: [],
      generatedTags: [],
      currentLang: 'ko',
      langCache: {},
      dirtyLang: null,
      renderedImageUrl: null,
      activeTab: 'copy',

      isGenerating: false,
      isTranslating: false,
      isRenderingPng: false,
      isGeneratingTitles: false,
      isGeneratingTags: false,
      loadingMessage: '',
      generateError: '',

      setGeneratedContent: (content) => {
        const lang = get().currentLang
        // 활성 콘텐츠가 직접 수정되면 캐시도 동기화 + dirty 마킹
        set((state) => {
          const cached = state.langCache[lang]
          const nextCache: LangCache = {
            ...state.langCache,
            [lang]: cached
              ? { ...cached, content: content ?? cached.content }
              : content
                ? { content, titles: state.generatedTitles, tags: state.generatedTags.map((t) => t.text) }
                : undefined,
          }
          // 다른 언어 버전이 하나라도 캐시에 있을 때 dirty 마킹 — 동기화 대상이 있다는 뜻
          const cachedLangs = Object.keys(state.langCache) as Lang[]
          const hasOther = cachedLangs.some((l) => l !== lang && state.langCache[l])
          return {
            generatedContent: content,
            langCache: nextCache,
            dirtyLang: hasOther ? lang : state.dirtyLang,
          }
        })
      },
      setGeneratedTitles: (titles) => set({ generatedTitles: titles }),
      setGeneratedTags: (tags) => set({ generatedTags: tags }),

      setGeneratedAllForLang: (lang, all) =>
        set((state) => ({
          currentLang: lang,
          generatedContent: all.content,
          generatedTitles: all.titles ?? [],
          generatedTags: (all.tags ?? []).map((text) => ({ text, isTrending: false })),
          langCache: { ...state.langCache, [lang]: all },
          dirtyLang: null,  // 동기화/번역 결과 저장 → 양 언어 일치
        })),

      setGeneratedByLang: (byLang, activeLang) =>
        set((state) => {
          const active = byLang[activeLang]
          // activeLang 결과가 없으면 다른 언어 중 하나로 fallback (어떤 lang이든)
          const fallback = active ?? byLang.en ?? byLang.ja ?? byLang.ko
          if (!fallback) return state  // 어느 언어도 없으면 무변경
          const resolvedLang: Lang = active
            ? activeLang
            : byLang.en ? 'en' : byLang.ja ? 'ja' : 'ko'
          return {
            currentLang: resolvedLang,
            generatedContent: fallback.content,
            generatedTitles: fallback.titles ?? [],
            generatedTags: (fallback.tags ?? []).map((text) => ({ text, isTrending: false })),
            langCache: { ...state.langCache, ...byLang },
            dirtyLang: null,  // 새 생성 → 양 언어 동시 받음
          }
        }),

      switchLang: (lang) => {
        const cached = get().langCache[lang]
        if (!cached) return false
        set({
          currentLang: lang,
          generatedContent: cached.content,
          generatedTitles: cached.titles ?? [],
          generatedTags: (cached.tags ?? []).map((text) => ({ text, isTrending: false })),
        })
        return true
      },

      clearLangCache: () => set({ langCache: {}, dirtyLang: null }),

      cacheLang: (lang, all) =>
        set((state) => ({
          langCache: { ...state.langCache, [lang]: all },
          // 현재 보고 있는 언어와 일치하면 화면도 갱신 (사용자가 갱신 결과를 즉시 보도록)
          ...(state.currentLang === lang
            ? {
                generatedContent: all.content,
                generatedTitles: all.titles ?? [],
                generatedTags: (all.tags ?? []).map((text) => ({ text, isTrending: false })),
              }
            : {}),
        })),

      setDirty: (lang) => set({ dirtyLang: lang }),

      setRenderedImageUrl: (url) => set({ renderedImageUrl: url }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setIsGenerating: (loading) => set({ isGenerating: loading }),
      setIsTranslating: (loading) => set({ isTranslating: loading }),
      setIsRenderingPng: (loading) => set({ isRenderingPng: loading }),
      setIsGeneratingTitles: (loading) => set({ isGeneratingTitles: loading }),
      setIsGeneratingTags: (loading) => set({ isGeneratingTags: loading }),
      setLoadingMessage: (message) => set({ loadingMessage: message }),
      setGenerateError: (error) => set({ generateError: error }),
      resetEditor: () =>
        set({
          generatedContent: null,
          generatedTitles: [],
          generatedTags: [],
          currentLang: 'ko',
          langCache: {},
          dirtyLang: null,
          renderedImageUrl: null,
          activeTab: 'copy',
          isGenerating: false,
          isTranslating: false,
          isRenderingPng: false,
          isGeneratingTitles: false,
          isGeneratingTags: false,
          loadingMessage: '',
          generateError: '',
        }),
    }),
    {
      name: 'pagecraft-editor',
      storage: createJSONStorage(() => sessionStorage),
      // blob URL과 로딩 상태는 저장하지 않음. langCache는 저장 (재방문 시 토큰 절약)
      partialize: (state) => ({
        generatedContent: state.generatedContent,
        generatedTitles: state.generatedTitles,
        generatedTags: state.generatedTags,
        currentLang: state.currentLang,
        langCache: state.langCache,
        dirtyLang: state.dirtyLang,
        activeTab: state.activeTab,
      }),
    },
  ),
)
