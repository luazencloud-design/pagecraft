/**
 * IndexedDB를 이용한 이미지 저장소
 * sessionStorage는 5MB 제한이 있어서 base64 이미지 저장 시 초과됨
 * IndexedDB는 용량 제한이 사실상 없음 (디스크 용량의 ~50%)
 *
 * 다중 드래프트 지원: 키를 `product-images:${draftId}` 형식으로 namespace.
 * 레거시 단일 키 `product-images`는 마이그레이션 시점에 첫 드래프트로 이관 + 삭제.
 */
import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'pagecraft-images'
const STORE_NAME = 'images'
const DB_VERSION = 1
const LEGACY_KEY = 'product-images'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      },
    })
  }
  return dbPromise
}

const draftKey = (draftId: string) => `${LEGACY_KEY}:${draftId}`

export async function saveImagesToDB(
  images: { id: string; dataUrl: string; bgRemoved: boolean; order: number }[],
  draftId: string,
) {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await tx.objectStore(STORE_NAME).put(images, draftKey(draftId))
  await tx.done
}

export async function loadImagesFromDB(
  draftId: string,
): Promise<{ id: string; dataUrl: string; bgRemoved: boolean; order: number }[]> {
  const db = await getDB()
  const result = await db.get(STORE_NAME, draftKey(draftId))
  return result || []
}

export async function clearImagesFromDB(draftId: string) {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await tx.objectStore(STORE_NAME).delete(draftKey(draftId))
  await tx.done
}

/**
 * 레거시 단일 키(`product-images`)에 저장된 이미지를 읽어옴
 * draftsStore 초기화 시 첫 드래프트로 이관할 때 사용
 */
export async function loadLegacyImages(): Promise<
  { id: string; dataUrl: string; bgRemoved: boolean; order: number }[] | null
> {
  const db = await getDB()
  const result = await db.get(STORE_NAME, LEGACY_KEY)
  return result || null
}

export async function deleteLegacyImages() {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await tx.objectStore(STORE_NAME).delete(LEGACY_KEY)
  await tx.done
}
