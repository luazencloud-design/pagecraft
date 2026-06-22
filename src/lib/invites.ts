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
  /** 시작일 ts (ms). 이 시각 이전엔 로그인 불가. 없으면 즉시 사용 가능 */
  startsAt?: number
  /** 종료일 ts (ms). 이 시각 이후 로그인 불가 + 자동 삭제. 없으면 무기한 */
  expiresAt?: number
  /** 직원용 무제한 — 크레딧 무제한 + 만료 무시(있어도). 기간도 사실상 무제한 */
  unlimited?: boolean
}

/** 초대 사용 가능 여부 (시작 전/만료/존재). 무제한 초대는 만료 무시 */
export function inviteUsableReason(inv: Invite | null): 'ok' | 'not_started' | 'expired' | 'gone' {
  if (!inv) return 'gone'
  if (inv.unlimited) return 'ok'
  const now = Date.now()
  if (inv.startsAt && now < inv.startsAt) return 'not_started'
  if (inv.expiresAt && now > inv.expiresAt) return 'expired'
  return 'ok'
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
  lpush: (k: string, v: string) => Promise<void>
  ltrim: (k: string, start: number, stop: number) => Promise<void>
  lrange: (k: string, start: number, stop: number) => Promise<string[]>
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
      lpush: async (k, v) => { await r.lpush(k, v) },
      ltrim: async (k, s, e) => { await r.ltrim(k, s, e) },
      lrange: (k, s, e) => r.lrange(k, s, e),
    }
  }
  // 메모리: set은 콤마 구분, list는 JSON 배열
  const memList = (k: string): string[] => { try { return JSON.parse(mem.get(k) || '[]') } catch { return [] } }
  return {
    get: async (k) => mem.get(k) ?? null,
    set: async (k, v) => { mem.set(k, v) },
    del: async (k) => { mem.delete(k) },
    sadd: async (k, m) => { const s = new Set((mem.get(k) || '').split(',').filter(Boolean)); s.add(m); mem.set(k, [...s].join(',')) },
    srem: async (k, m) => { const s = new Set((mem.get(k) || '').split(',').filter(Boolean)); s.delete(m); mem.set(k, [...s].join(',')) },
    smembers: async (k) => (mem.get(k) || '').split(',').filter(Boolean),
    lpush: async (k, v) => { const l = memList(k); l.unshift(v); mem.set(k, JSON.stringify(l)) },
    ltrim: async (k, s, e) => { const l = memList(k); mem.set(k, JSON.stringify(l.slice(s, e + 1))) },
    lrange: async (k, s, e) => memList(k).slice(s, e + 1),
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
    const inv = await getInvite(id) // 만료된 건 여기서 자동 제거됨
    if (inv) out.push(inv)
    else await store.srem(INDEX, id) // 없는데 인덱스에 남은 건 정리
  }
  return out.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getInvite(id: string): Promise<Invite | null> {
  const store = await kv()
  const raw = await store.get(kInvite(id))
  if (!raw) return null
  let inv: Invite
  try { inv = JSON.parse(raw) } catch { return null }
  // 유효기간 만료 → 즉시 삭제 (lazy). 무제한(직원용)은 만료 무시
  if (!inv.unlimited && inv.expiresAt && Date.now() > inv.expiresAt) {
    await store.del(kInvite(id))
    await store.srem(INDEX, id)
    return null
  }
  return inv
}

export async function createInvite(
  name: string,
  opts?: { startsAt?: number; expiresAt?: number; unlimited?: boolean },
): Promise<Invite> {
  const store = await kv()
  const inv: Invite = {
    id: genId(),
    name: name.trim() || '이름 없음',
    version: 1,
    createdAt: Date.now(),
    ...(opts?.unlimited ? { unlimited: true } : {}),
    ...(opts?.startsAt ? { startsAt: opts.startsAt } : {}),
    ...(opts?.expiresAt ? { expiresAt: opts.expiresAt } : {}),
  }
  await store.set(kInvite(inv.id), JSON.stringify(inv))
  await store.sadd(INDEX, inv.id)
  await logEvent('created', inv.name + (inv.unlimited ? ' (무제한)' : ''))
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

/** 기간(시작일·종료일) 설정/해제. null이면 해당 제한 없음 */
export async function setInviteSchedule(
  id: string,
  startsAt: number | null,
  expiresAt: number | null,
): Promise<Invite | null> {
  const inv = await getInvite(id)
  if (!inv) return null
  if (startsAt) inv.startsAt = startsAt
  else delete inv.startsAt
  if (expiresAt) inv.expiresAt = expiresAt
  else delete inv.expiresAt
  const store = await kv()
  await store.set(kInvite(id), JSON.stringify(inv))
  return inv
}

/** 무제한(직원용) 토글 */
export async function setInviteUnlimited(id: string, unlimited: boolean): Promise<Invite | null> {
  const inv = await getInvite(id)
  if (!inv) return null
  if (unlimited) inv.unlimited = true
  else delete inv.unlimited
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
  await logEvent('regenerated', inv.name)
  return inv
}

export async function deleteInvite(id: string): Promise<void> {
  const inv = await getInvite(id)
  const store = await kv()
  await store.del(kInvite(id))
  await store.srem(INDEX, id)
  if (inv) await logEvent('deleted', inv.name)
}

/** 초대 토큰 검증 — 존재 + version + 기간(시작~만료) */
export async function isInviteTokenValid(id: string, v: number): Promise<Invite | null> {
  const inv = await getInvite(id)
  if (!inv || inv.version !== v) return null
  if (inviteUsableReason(inv) !== 'ok') return null
  return inv
}

/* ── 활동 로그 ─────────────────────────────────────────── */
export interface InviteEvent {
  ts: number
  action: 'created' | 'regenerated' | 'deleted' | 'redeemed'
  invite: string
  detail?: string // redeemed: 마스킹된 이메일
}

const LOG_KEY = 'invite:events'
const LOG_MAX = 100

export async function logEvent(action: InviteEvent['action'], invite: string, detail?: string): Promise<void> {
  const store = await kv()
  const ev: InviteEvent = { ts: Date.now(), action, invite, ...(detail ? { detail } : {}) }
  await store.lpush(LOG_KEY, JSON.stringify(ev))
  await store.ltrim(LOG_KEY, 0, LOG_MAX - 1)
}

export async function getEvents(limit = 30): Promise<InviteEvent[]> {
  const store = await kv()
  const raw = await store.lrange(LOG_KEY, 0, limit - 1)
  return raw.map((r) => { try { return JSON.parse(r) as InviteEvent } catch { return null } }).filter(Boolean) as InviteEvent[]
}
