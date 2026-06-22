import { create } from 'zustand'
import { api } from '@/lib/api'

export interface TrialInfo {
  active: boolean
  everStarted: boolean
  used: number
  remaining: number
  limit: number
  daysLeft: number
}

interface AuthState {
  loaded: boolean
  loggedIn: boolean
  /** 초대 이름(용도) — 관리자가 붙인 라벨 */
  name: string | null
  trial: TrialInfo | null
  /** 무제한(직원용) 초대 여부 — 크레딧/기간 제한 없음 */
  unlimited: boolean
  fetchMe: () => Promise<void>
  logout: () => Promise<void>
}

/**
 * 무료 체험 로그인 상태 — /api/auth/me 로 초대 세션 + 체험 크레딧 조회.
 * BYOK(본인 키)와 무관하게 "체험 로그인 상태"만 관리.
 */
export const useAuthStore = create<AuthState>((set) => ({
  loaded: false,
  loggedIn: false,
  name: null,
  trial: null,
  unlimited: false,

  fetchMe: async () => {
    try {
      const res = await api.get<{ loggedIn: boolean; name?: string; trial?: TrialInfo; unlimited?: boolean }>('/api/auth/me')
      set({
        loaded: true,
        loggedIn: res.loggedIn,
        name: res.name ?? null,
        trial: res.trial ?? null,
        unlimited: !!res.unlimited,
      })
    } catch {
      set({ loaded: true, loggedIn: false, name: null, trial: null, unlimited: false })
    }
  },

  logout: async () => {
    try { await api.post('/api/auth/logout', {}) } catch {}
    set({ loggedIn: false, name: null, trial: null, unlimited: false })
  },
}))
