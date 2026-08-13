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
  /** 종료일 ts (ms). 이 시각 이후 로그인 불가(차단). 레코드는 유지되며 삭제는 관리자가 직접. 없으면 무기한 */
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
    const inv = await getInvite(id) // 만료돼도 유지됨 (목록에서 '만료' 표시)
    if (inv) out.push(inv)
    else await store.srem(INDEX, id) // 실제로 없는데 인덱스에만 남은 건 정리
  }
  return out.sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * 초대 레코드 조회 — 만료돼도 삭제하지 않고 그대로 반환 (관리자 목록 '만료' 표시용).
 * 접근 가능 여부는 호출부에서 inviteUsableReason()로 판단. 실제 삭제는 deleteInvite()만.
 */
export async function getInvite(id: string): Promise<Invite | null> {
  const store = await kv()
  const raw = await store.get(kInvite(id))
  if (!raw) return null
  try { return JSON.parse(raw) as Invite } catch { return null }
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
const LOG_MAX = 300

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

/**
 * 이메일 마스킹 — 앞 2글자 + 도메인. 관리자 화면 대조용이며 원문은 저장하지 않는다.
 *
 * 자르는 위치를 직접 계산한다. 정규식 치환은 매칭에 실패하면 입력을 그대로 돌려주므로,
 * 실패가 눈에 띄지 않는 이런 자리에는 쓰지 않는다.
 */
export function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at < 0) return '***'
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`
}

/* ── 차단 로그 ─────────────────────────────────────────
 *
 * 활동 로그와 **키를 분리한다**. 두 기록은 발생 빈도와 필요한 보존 기간이 다르다 — 한 자리에
 * 두면 잦은 쪽이 드문 쪽을 밀어낸다. 차단은 건수가 적고 오래 남아야 하는 쪽이다.
 *
 * 이걸 남기는 이유: 이용자가 막히는 경우(초대 만료·크레딧 소진·링크 무효)는 예외가 아니라
 * 정상 응답이라 오류 보고에 잡히지 않는다. 관리자가 "안 된다"는 이야기를 되짚을 자리를 만든다.
 */
export interface BlockEvent {
  ts: number
  /** entry = 링크 진입 단계(로그인 전) / gate = 인가 단계(로그인 후) */
  stage: 'entry' | 'gate'
  /** expired · gone · not_started · invalid · credit_exhausted 등 */
  reason: string
  /** 초대 이름(알 때) 또는 id */
  invite?: string
  /** 마스킹된 이메일 — gate 단계에서만 알 수 있다 */
  subject?: string
}

const BLOCK_KEY = 'invite:blocks'
const BLOCK_MAX = 300

/**
 * 차단 기록. 저장 실패를 스스로 삼킨다 — 기록은 부수 효과이지 응답 경로가 아니다.
 * 저장소가 죽었을 때 로그를 남기려다 사용자 응답까지 무너뜨리면 본말이 뒤집힌다.
 */
export async function logBlock(ev: Omit<BlockEvent, 'ts'>): Promise<void> {
  try {
    const store = await kv()
    await store.lpush(BLOCK_KEY, JSON.stringify({ ts: Date.now(), ...ev } satisfies BlockEvent))
    await store.ltrim(BLOCK_KEY, 0, BLOCK_MAX - 1)
  } catch (err) {
    console.warn('[blocks] 차단 기록 실패', err)
  }
}

export async function getBlocks(limit = 100): Promise<BlockEvent[]> {
  const store = await kv()
  const raw = await store.lrange(BLOCK_KEY, 0, limit - 1)
  return raw.map((r) => { try { return JSON.parse(r) as BlockEvent } catch { return null } }).filter(Boolean) as BlockEvent[]
}
