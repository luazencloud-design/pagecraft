'use client'

import { useEffect, useRef, useState } from 'react'
import { useDraftsStore } from '@/stores/draftsStore'
import { useProductStore } from '@/stores/productStore'
import { showToast } from '@/components/ui/Toast'

/**
 * 다중 드래프트 선택기 — 좌측 패널 상단에 배치
 *
 * - 현재 드래프트 표시 + 드롭다운으로 다른 드래프트 전환
 * - "+ 새 드래프트" 버튼
 * - 각 항목 옆 [✎ 이름] [✕ 삭제]
 * - 드래프트 이름은 자동으로 product.name 따라감 (수동 변경 시 그 이름 유지)
 */
export default function DraftSelector() {
  const { drafts, currentId, createDraft, switchDraft, deleteDraft, renameDraft, touchCurrent } =
    useDraftsStore()
  const { product } = useProductStore()
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [busy, setBusy] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const current = drafts.find((d) => d.id === currentId)

  // 상품명 변경 시 드래프트 이름 자동 동기화 (사용자가 수동 변경 안 했을 때만)
  useEffect(() => {
    if (!current) return
    const trimmed = product.name?.trim()
    if (!trimmed) return
    // 자동 이름 패턴 ("드래프트 N") 일 때만 자동 변경
    if (/^드래프트 \d+$/.test(current.name)) {
      touchCurrent(trimmed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.name])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setRenaming(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!current) {
    return null
  }

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
      console.error(err)
      showToast('드래프트 생성 실패', 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (busy) return
    if (!confirm(`"${name}" 드래프트를 삭제할까요?\n이미지·텍스트 모두 사라집니다.`)) return
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

  const startRename = (id: string, current: string) => {
    setRenaming(id)
    setRenameValue(current)
  }
  const submitRename = (id: string) => {
    if (renameValue.trim()) renameDraft(id, renameValue.trim())
    setRenaming(null)
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
          title={`현재 드래프트: ${current.name}`}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>📁</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {current.name}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>
              {drafts.length > 1 ? `(${drafts.length})` : ''}
            </span>
          </span>
          <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 6 }}>▼</span>
        </button>

        {/* + 새 드래프트 */}
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
            const isRenaming = renaming === d.id
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

                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => submitRename(d.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitRename(d.id)
                      else if (e.key === 'Escape') setRenaming(null)
                    }}
                    style={{
                      flex: 1,
                      background: 'var(--surface2)',
                      border: '1px solid var(--accent)',
                      borderRadius: 4,
                      padding: '3px 6px',
                      fontSize: 12,
                      color: 'var(--text)',
                      outline: 'none',
                    }}
                  />
                ) : (
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
                    {d.name}
                  </button>
                )}

                {/* 액션 버튼 */}
                {!isRenaming && (
                  <>
                    <button
                      onClick={() => startRename(d.id, d.name)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 11,
                        color: 'var(--text3)',
                        padding: '2px 4px',
                      }}
                      title="이름 변경"
                    >
                      ✎
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
                  </>
                )}
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
        </div>
      )}
    </div>
  )
}
