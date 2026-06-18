/**
 * 무료 체험 크레딧 — 이메일당 1회, 30일 한정
 *
 * 키 구조 (Redis, 없으면 메모리 폴백):
 *  - trial:{email}:ever  = '1'  (영구, TTL 없음) — "이 이메일은 체험을 시작한 적 있음"
 *  - trial:{email}:start = ts   (TTL 30일) — 활성 마커. 만료되면 체험 종료
 *  - trial:{email}:used  = N    (TTL 30일) — 사용 크레딧
 *
 * 만료 후엔 start/used만 사라지고 ever는 남아 → 재활성(무한 체험) 방지.
 */
import Redis from 'ioredis'

export const TRIAL_CREDITS = 500
const TRIAL_DAYS = 30
const TTL_SECONDS = TRIAL_DAYS * 24 * 60 * 60

export const CREDIT_COST = {
  generate: 1,
  image: 5,
  'bg-remove': 5,
  regen: 1,
  gift: 1,
} as const
export type CreditType = keyof typeof CREDIT_COST

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

// 관리자 — 무제한
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean)
export function isAdmin(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email)
}

// 로컬 폴백 (메모리)
const mem = new Map<string, string>()
const memExpiry = new Map<string, number>()
function memGet(k: string): string | null {
  const exp = memExpiry.get(k)
  if (exp && Date.now() > exp) { mem.delete(k); memExpiry.delete(k); return null }
  return mem.get(k) ?? null
}
function memSet(k: string, v: string, ttl?: number) {
  mem.set(k, v)
  if (ttl) memExpiry.set(k, Date.now() + ttl * 1000)
}

async function rGet(k: string): Promise<string | null> {
  if (useRedis) { const r = getRedis(); if (!r) return null; try { return await r.get(k) } catch { return null } }
  return memGet(k)
}
async function rSet(k: string, v: string, ttl?: number) {
  if (useRedis) { const r = getRedis(); if (!r) return; try { ttl ? await r.set(k, v, 'EX', ttl) : await r.set(k, v) } catch {} return }
  memSet(k, v, ttl)
}
async function rIncrBy(k: string, n: number, ttl: number): Promise<number> {
  if (useRedis) {
    const r = getRedis()
    if (!r) return 0
    try { const v = await r.incrby(k, n); await r.expire(k, ttl); return v } catch { return 0 }
  }
  const cur = parseInt(memGet(k) || '0', 10) + n
  memSet(k, String(cur), ttl)
  return cur
}

const kEver = (e: string) => `trial:${e}:ever`
const kStart = (e: string) => `trial:${e}:start`
const kUsed = (e: string) => `trial:${e}:used`

export interface TrialStatus {
  active: boolean
  everStarted: boolean
  used: number
  remaining: number
  limit: number
  /** 만료까지 남은 일수 (active일 때만 의미) */
  daysLeft: number
}

/** 체험 상태 조회 (활성화하지 않음) */
export async function getTrialStatus(email: string): Promise<TrialStatus> {
  if (isAdmin(email)) {
    return { active: true, everStarted: true, used: 0, remaining: 99999, limit: 99999, daysLeft: 9999 }
  }
  const ever = await rGet(kEver(email))
  const start = await rGet(kStart(email))
  const used = parseInt((await rGet(kUsed(email))) || '0', 10)
  const active = !!start
  let daysLeft = 0
  if (start) {
    const elapsed = Date.now() - Number(start)
    daysLeft = Math.max(0, Math.ceil((TTL_SECONDS * 1000 - elapsed) / (24 * 60 * 60 * 1000)))
  }
  return {
    active,
    everStarted: !!ever,
    used,
    remaining: Math.max(0, TRIAL_CREDITS - used),
    limit: TRIAL_CREDITS,
    daysLeft,
  }
}

/** 체험 활성화 — 처음이면 시작, 이미 시작했으면 현 상태 반환 */
export async function activateTrial(email: string): Promise<TrialStatus> {
  if (isAdmin(email)) return getTrialStatus(email)
  const ever = await rGet(kEver(email))
  if (!ever) {
    await rSet(kEver(email), '1') // 영구
    await rSet(kStart(email), String(Date.now()), TTL_SECONDS)
    await rSet(kUsed(email), '0', TTL_SECONDS)
  }
  return getTrialStatus(email)
}

/**
 * 크레딧 소비 (원자적) — 체험 비활성/만료/소진 시 거부
 */
export async function consumeTrialCredits(
  email: string,
  type: CreditType,
  multiplier = 1,
): Promise<{ allowed: boolean; reason?: 'expired' | 'insufficient'; remaining: number; cost: number }> {
  const cost = CREDIT_COST[type] * Math.max(1, Math.floor(multiplier))
  if (isAdmin(email)) return { allowed: true, remaining: 99999, cost }

  const start = await rGet(kStart(email))
  if (!start) {
    const ever = await rGet(kEver(email))
    return { allowed: false, reason: ever ? 'expired' : 'expired', remaining: 0, cost }
  }
  const newUsed = await rIncrBy(kUsed(email), cost, TTL_SECONDS)
  if (newUsed > TRIAL_CREDITS) {
    await rIncrBy(kUsed(email), -cost, TTL_SECONDS) // 롤백
    return { allowed: false, reason: 'insufficient', remaining: Math.max(0, TRIAL_CREDITS - (newUsed - cost)), cost }
  }
  return { allowed: true, remaining: TRIAL_CREDITS - newUsed, cost }
}

/** 실패 시 환불 */
export async function refundTrialCredits(email: string, type: CreditType, multiplier = 1): Promise<void> {
  if (isAdmin(email)) return
  const cost = CREDIT_COST[type] * Math.max(1, Math.floor(multiplier))
  await rIncrBy(kUsed(email), -cost, TTL_SECONDS)
}
