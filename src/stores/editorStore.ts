import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { GeneratedContent, GeneratedTitle, GeneratedTag, GeneratedAll } from '@/types/ai'
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
  /** 캐시 hit 시 즉시 전환, miss면 false 반환 (번역 트리거는 호출자) */
  switchLang: (lang: Lang) => boolean
  /** 캐시 초기화 (새 상품 시작 등) */
  clearLangCache: () => void

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
        // 활성 콘텐츠가 직접 수정되면 캐시도 동기화
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
          return { generatedContent: content, langCache: nextCache }
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
        })),

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

      clearLangCache: () => set({ langCache: {} }),

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
        activeTab: state.activeTab,
      }),
    },
  ),
)
