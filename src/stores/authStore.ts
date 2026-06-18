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
  email: string | null
  trial: TrialInfo | null
  fetchMe: () => Promise<void>
  logout: () => Promise<void>
}

/**
 * 무료 체험 로그인 상태 — /api/auth/me 로 세션 + 체험 크레딧 조회.
 * BYOK(본인 키)와 무관하게 "로그인 상태"만 관리.
 */
export const useAuthStore = create<AuthState>((set) => ({
  loaded: false,
  loggedIn: false,
  email: null,
  trial: null,

  fetchMe: async () => {
    try {
      const res = await api.get<{ loggedIn: boolean; email?: string; trial?: TrialInfo }>('/api/auth/me')
      set({
        loaded: true,
        loggedIn: res.loggedIn,
        email: res.email ?? null,
        trial: res.trial ?? null,
      })
    } catch {
      set({ loaded: true, loggedIn: false, email: null, trial: null })
    }
  },

  logout: async () => {
    try { await api.post('/api/auth/logout', {}) } catch {}
    set({ loggedIn: false, email: null, trial: null })
  },
}))
