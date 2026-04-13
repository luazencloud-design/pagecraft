'use client'

import { useImageStore } from '@/stores/imageStore'
import { useBgRemoval } from '@/hooks/useBgRemoval'

export default function BgRemovalToggle() {
  const { bgRemoveEnabled, setBgRemoveEnabled } = useImageStore()
  const { isModelLoading, isProcessing, progress, processAllImages, restoreAll } = useBgRemoval()

  const toggle = () => {
    const next = !bgRemoveEnabled
    setBgRemoveEnabled(next)
    if (next) {
      processAllImages()
    } else {
      restoreAll()
    }
  }

  const isWorking = isModelLoading || isProcessing

  return (
    <div>
      {/* Row: [toggle] [label] [badge] */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 18px 4px' }}>
        {/* Toggle */}
        <button
          onClick={toggle}
          disabled={isWorking}
          style={{
            width: '34px',
            height: '18px',
            borderRadius: '9px',
            background: bgRemoveEnabled ? 'var(--accent)' : 'var(--surface3)',
            border: `1px solid ${bgRemoveEnabled ? 'var(--accent)' : 'var(--border2)'}`,
            cursor: isWorking ? 'not-allowed' : 'pointer',
            position: 'relative',
            transition: 'all 0.2s',
            flexShrink: 0,
            padding: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: bgRemoveEnabled ? '#0c0c10' : 'var(--text2)',
              transition: 'all 0.2s',
              transform: bgRemoveEnabled ? 'translateX(16px)' : 'translateX(0)',
            }}
          />
        </button>

        {/* Label */}
        <span style={{ fontSize: '11px', color: 'var(--text2)', flex: 1 }}>
          배경 자동 제거
        </span>

        {/* Badge */}
        <span
          style={{
            fontSize: '9px',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            fontWeight: 600,
          }}
        >
          AI
        </span>
      </div>

      {/* Progress bar row */}
      {isWorking && (
        <div style={{ padding: '0 18px', marginTop: '4px' }}>
          <div
            style={{
              height: '3px',
              background: 'var(--surface3)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'var(--accent)',
                borderRadius: '2px',
                width: typeof progress === 'number' ? `${progress}%` : '60%',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
