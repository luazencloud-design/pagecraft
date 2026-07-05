'use client'

import { useState, useRef, useEffect } from 'react'
import { CATEGORY_GROUPS } from '@/types/product'

/**
 * 2단 카테고리 선택 — 왼쪽 대분류에 호버/클릭하면 오른쪽으로 세부 카테고리 펼침.
 * 카테고리가 많아져(코스트코 기준 12그룹) 네이티브 <select> 대신 커스텀 팝오버 사용.
 */
export default function CategorySelect({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (category: string) => void
  className?: string
}) {
  const groups = Object.keys(CATEGORY_GROUPS)
  // 현재 선택값이 속한 그룹 찾기 (열 때 그 그룹부터 보여줌)
  const groupOf = (v: string) => groups.find((g) => CATEGORY_GROUPS[g].includes(v)) || groups[0]

  const [open, setOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState(groupOf(value))
  const rootRef = useRef<HTMLDivElement>(null)

  // 바깥 클릭 / ESC 로 닫기
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    if (!open) setActiveGroup(groupOf(value))
    setOpen(!open)
  }
  const pick = (item: string) => {
    onChange(item)
    setOpen(false)
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      {/* 트리거 — 기존 input 스타일 재사용 */}
      <button type="button" onClick={toggle} className={className} style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: value ? undefined : 'var(--text3)' }}>
          {value || '카테고리 선택'}
        </span>
        <span style={{ fontSize: 9, color: 'var(--text3)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 60,
            display: 'flex',
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderRadius: 10,
            boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
            overflow: 'hidden',
            height: 320,
            minWidth: 300,
          }}
        >
          {/* 왼쪽: 대분류 */}
          <div style={{ width: 118, overflowY: 'auto', borderRight: '1px solid var(--border)', flexShrink: 0, padding: '4px 0' }}>
            {groups.map((g) => {
              const active = g === activeGroup
              const hasSelected = CATEGORY_GROUPS[g].includes(value)
              return (
                <button
                  key={g}
                  type="button"
                  onMouseEnter={() => setActiveGroup(g)}
                  onClick={() => setActiveGroup(g)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '7px 10px',
                    fontSize: 11.5,
                    fontWeight: active || hasSelected ? 700 : 500,
                    textAlign: 'left',
                    background: active ? 'var(--surface2)' : 'transparent',
                    color: hasSelected ? 'var(--accent)' : active ? 'var(--text)' : 'var(--text2)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g}</span>
                  <span style={{ fontSize: 9, color: 'var(--text3)', flexShrink: 0 }}>▸</span>
                </button>
              )
            })}
          </div>

          {/* 오른쪽: 세부 카테고리 (호버한 그룹) */}
          <div style={{ flex: 1, overflowY: 'auto', minWidth: 180, padding: '4px 0' }}>
            {CATEGORY_GROUPS[activeGroup].map((item) => {
              const selected = item === value
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => pick(item)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '7px 12px',
                    fontSize: 11.5,
                    fontWeight: selected ? 700 : 500,
                    textAlign: 'left',
                    background: selected ? 'var(--accent-dim, rgba(255,255,255,0.06))' : 'transparent',
                    color: selected ? 'var(--accent)' : 'var(--text2)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)' }}
                  onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  {item}
                </button>
              )
            })}
            {/* 선택 해제 */}
            {value && (
              <button
                type="button"
                onClick={() => pick('')}
                style={{ display: 'block', width: '100%', padding: '8px 12px', fontSize: 10.5, textAlign: 'left', background: 'transparent', color: 'var(--text3)', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', marginTop: 4 }}
              >
                ✕ 선택 해제
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
