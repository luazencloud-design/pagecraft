'use client'

import { useEffect, useRef, useState } from 'react'
import { useDraftsStore } from '@/stores/draftsStore'
import { useProductStore } from '@/stores/productStore'
import { PLATFORM_META } from '@/types/product'
import { showToast } from '@/components/ui/Toast'

const PLACEHOLDER = '이름 없음'

/** 드래프트 표시 이름 = "상품명 · 플랫폼" 또는 "이름 없음 · 플랫폼" */
function buildDraftName(productName: string, platformLabel: string): string {
  const namePart = productName.trim() || PLACEHOLDER
  return `${namePart} · ${platformLabel}`
}

/**
 * 다중 드래프트 선택기 — 좌측 패널 상단
 *
 * 정책:
 * - 드래프트 이름 = "상품명 · 플랫폼명" 자동 동기화
 *   같은 상품을 여러 플랫폼으로 만들어도 한눈에 구분
 * - 상품명 비어있으면 "이름 없음 · 플랫폼"
 * - 수동 편집 X — 상품명/플랫폼만 바꾸면 됨
 */
export default function DraftSelector() {
  const { drafts, currentId, createDraft, switchDraft, deleteDraft, clearAllDrafts, touchCurrent } =
    useDraftsStore()
  const { product } = useProductStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const current = drafts.find((d) => d.id === currentId)
  const platformLabel = PLATFORM_META[product.platform]?.label ?? '기타'

  // 상품명 / 플랫폼 변경 시 드래프트 이름 자동 동기화
  useEffect(() => {
    if (!current) return
    const newName = buildDraftName(product.name, platformLabel)
    if (current.name !== newName) {
      touchCurrent(newName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.name, product.platform, currentId])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!current) return null

  const displayName = (name: string) => name?.trim() || PLACEHOLDER

  const handleSwitch = async (id: string) => {
    if (busy || id === currentId) {
      setOpen(false)
      return
    }
    setBusy(true)
    try {
      await switchDraft(id)
      setOpen(false)
    } catch (err) {
      console.error(err)
      showToast('드래프트 전환 실패', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = async () => {
    if (busy) return
    setBusy(true)
    try {
      await createDraft()
      setOpen(false)
      showToast('새 드래프트 생성됨')
    } catch (err) {
      const msg = err instanceof Error ? err.message : '드래프트 생성 실패'
      showToast(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (busy) return
    if (!confirm(`"${displayName(name)}" 드래프트를 삭제할까요?\n이미지·텍스트 모두 사라집니다.`)) return
    setBusy(true)
    try {
      await deleteDraft(id)
      showToast('드래프트 삭제됨')
    } catch (err) {
      console.error(err)
      showToast('삭제 실패', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleClearAll = async () => {
    if (busy) return
    if (
      !confirm(
        `모든 드래프트(${drafts.length}개)를 삭제하고 새로 시작할까요?\n이미지·텍스트 모두 사라지고 되돌릴 수 없습니다.`,
      )
    )
      return
    setBusy(true)
    try {
      await clearAllDrafts()
      setOpen(false)
      showToast('모든 드래프트가 정리되었습니다')
    } catch (err) {
      console.error(err)
      showToast('정리 실패', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', padding: '8px 18px 6px' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* 현재 드래프트 + 드롭다운 토글 */}
        <button
          onClick={() => setOpen((v) => !v)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 7,
            padding: '7px 11px',
            fontSize: 12,
            color: 'var(--text)',
            cursor: 'pointer',
            fontFamily: 'var(--font)',
            minHeight: 32,
          }}
          title={`현재 드래프트: ${displayName(current.name)}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>📁</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName(current.name)}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>
              {drafts.length > 1 ? `(${drafts.length})` : ''}
            </span>
          </span>
          <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 6 }}>▼</span>
        </button>

        {/* + 새 드래프트 — 한도 도달 시엔 클릭 시 toast로 안내 (시각 disabled X) */}
        <button
          onClick={handleCreate}
          disabled={busy}
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 7,
            padding: '7px 10px',
            fontSize: 14,
            color: 'var(--text2)',
            cursor: busy ? 'wait' : 'pointer',
            minHeight: 32,
          }}
          title="새 드래프트 만들기"
        >
          ＋
        </button>
      </div>

      {/* 드롭다운 */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            left: 18,
            right: 18,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 100,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {drafts.map((d) => {
            const isCurrent = d.id === currentId
            return (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  borderBottom: '1px solid var(--border)',
                  background: isCurrent ? 'var(--accent-dim)' : 'transparent',
                  fontSize: 12,
                }}
              >
                <span
                  style={{ fontSize: 11, color: isCurrent ? 'var(--accent)' : 'var(--text3)' }}
                  title={isCurrent ? '현재 드래프트' : ''}
                >
                  {isCurrent ? '✓' : '·'}
                </span>

                <button
                  onClick={() => handleSwitch(d.id)}
                  disabled={busy}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    padding: '3px 0',
                    cursor: busy ? 'wait' : 'pointer',
                    color: isCurrent ? 'var(--accent)' : 'var(--text)',
                    fontWeight: isCurrent ? 600 : 400,
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName(d.name)}
                </button>

                <button
                  onClick={() => handleDelete(d.id, d.name)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: 'var(--text3)',
                    padding: '2px 4px',
                  }}
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            )
          })}

          <button
            onClick={handleCreate}
            disabled={busy}
            style={{
              width: '100%',
              padding: '9px',
              background: 'transparent',
              border: 'none',
              borderTop: '1px solid var(--border)',
              cursor: busy ? 'wait' : 'pointer',
              color: 'var(--accent)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font)',
              textAlign: 'center',
            }}
          >
            ＋ 새 드래프트
          </button>

          {/* 전부 정리 — 위험 액션 */}
          <button
            onClick={handleClearAll}
            disabled={busy}
            style={{
              width: '100%',
              padding: '8px',
              background: 'transparent',
              border: 'none',
              borderTop: '1px solid var(--border)',
              cursor: busy ? 'wait' : 'pointer',
              color: 'var(--text3)',
              fontSize: 11,
              fontWeight: 500,
              fontFamily: 'var(--font)',
              textAlign: 'center',
            }}
            title="모든 드래프트를 삭제하고 새로 시작"
          >
            🗑 드래프트 전부 정리하기
          </button>
        </div>
      )}
    </div>
  )
}
