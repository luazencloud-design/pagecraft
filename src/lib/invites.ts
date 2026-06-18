/**
 * 초대 링크 (관리자 발급) — API 키처럼 이름 붙여 발급/관리
 *
 * 각 초대 = { id, name, version, createdAt }. 토큰은 jose JWT(id+version).
 * 재생성 = version++ → 옛 링크 무효. 삭제 = 레코드 제거.
 * 체험 크레딧/타이머는 trial.ts 가 invite id(subject)로 추적.
 *
 * 저장: Redis(KV_REDIS_URL) / 로컬 메모리 폴백.
 */
import Redis from 'ioredis'
import { signInviteToken } from './session'

export interface Invite {
  id: string
  name: string
  version: number
  createdAt: number
}

const useRedis = !!process.env.KV_REDIS_URL
let redis: Redis | null = null
function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.KV_REDIS_URL
  if (!url) return null
  try {
    redis = new Redis(url, { maxRetriesPerRequest: 2, enableReadyCheck: false })
    redis.on('error', (e) => console.error('[redis] error:', e.message))
    return redis
  } catch (e) {
    console.error('[redis] init 실패:', e)
    return null
  }
}

// 메모리 폴백
const mem = new Map<string, string>()
async function kv(): Promise<{
  get: (k: string) => Promise<string | null>
  set: (k: string, v: string) => Promise<void>
  del: (k: string) => Promise<void>
  sadd: (k: string, m: string) => Promise<void>
  srem: (k: string, m: string) => Promise<void>
  smembers: (k: string) => Promise<string[]>
}> {
  if (useRedis) {
    const r = getRedis()
    if (r) return {
      get: (k) => r.get(k),
      set: async (k, v) => { await r.set(k, v) },
      del: async (k) => { await r.del(k) },
      sadd: async (k, m) => { await r.sadd(k, m) },
      srem: async (k, m) => { await r.srem(k, m) },
      smembers: (k) => r.smembers(k),
    }
  }
  // 메모리: set은 콤마 구분 문자열로
  return {
    get: async (k) => mem.get(k) ?? null,
    set: async (k, v) => { mem.set(k, v) },
    del: async (k) => { mem.delete(k) },
    sadd: async (k, m) => { const s = new Set((mem.get(k) || '').split(',').filter(Boolean)); s.add(m); mem.set(k, [...s].join(',')) },
    srem: async (k, m) => { const s = new Set((mem.get(k) || '').split(',').filter(Boolean)); s.delete(m); mem.set(k, [...s].join(',')) },
    smembers: async (k) => (mem.get(k) || '').split(',').filter(Boolean),
  }
}

const INDEX = 'invites:index'
const kInvite = (id: string) => `invite:${id}`

function genId(): string {
  // crypto.randomUUID는 node 런타임 OK
  return 'inv_' + globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}

/** 초대 토큰 → 링크 URL */
export async function inviteLink(origin: string, inv: Invite): Promise<string> {
  const token = await signInviteToken(inv.id, inv.version)
  return `${origin}/api/auth/invite?token=${encodeURIComponent(token)}`
}

export async function listInvites(): Promise<Invite[]> {
  const store = await kv()
  const ids = await store.smembers(INDEX)
  const out: Invite[] = []
  for (const id of ids) {
    const raw = await store.get(kInvite(id))
    if (raw) { try { out.push(JSON.parse(raw)) } catch {} }
  }
  return out.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getInvite(id: string): Promise<Invite | null> {
  const store = await kv()
  const raw = await store.get(kInvite(id))
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export async function createInvite(name: string): Promise<Invite> {
  const store = await kv()
  const inv: Invite = { id: genId(), name: name.trim() || '이름 없음', version: 1, createdAt: Date.now() }
  await store.set(kInvite(inv.id), JSON.stringify(inv))
  await store.sadd(INDEX, inv.id)
  return inv
}

export async function renameInvite(id: string, name: string): Promise<Invite | null> {
  const inv = await getInvite(id)
  if (!inv) return null
  inv.name = name.trim() || inv.name
  const store = await kv()
  await store.set(kInvite(id), JSON.stringify(inv))
  return inv
}

/** 링크 재생성 — version++ → 옛 링크 무효화 */
export async function regenerateInvite(id: string): Promise<Invite | null> {
  const inv = await getInvite(id)
  if (!inv) return null
  inv.version += 1
  const store = await kv()
  await store.set(kInvite(id), JSON.stringify(inv))
  return inv
}

export async function deleteInvite(id: string): Promise<void> {
  const store = await kv()
  await store.del(kInvite(id))
  await store.srem(INDEX, id)
}

/** 초대 토큰 검증 — 존재 + version 일치 확인 */
export async function isInviteTokenValid(id: string, v: number): Promise<Invite | null> {
  const inv = await getInvite(id)
  if (!inv || inv.version !== v) return null
  return inv
}
