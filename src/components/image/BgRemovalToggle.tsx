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
    <div className="border border-border rounded-[10px] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-text">배경 자동 제거</label>
          <span className="text-[10px] bg-green/20 text-green px-[6px] py-[2px] rounded font-medium">AI</span>
        </div>
        <button
          className={`w-9 h-5 rounded-[10px] relative border transition-colors duration-200 cursor-pointer ${bgRemoveEnabled ? 'bg-accent border-accent' : 'bg-surface3 border-border2'}`}
          onClick={toggle}
          disabled={isWorking}
        >
          <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-200 ${bgRemoveEnabled ? 'translate-x-4' : 'left-[2px]'}`} />
        </button>
      </div>

      {isWorking && (
        <div className="space-y-1">
          <div className="h-[3px] bg-surface3 rounded-[3px] overflow-hidden">
            <div className="h-full bg-accent rounded-[3px] animate-pulse" style={{ width: '60%' }} />
          </div>
          <p className="text-[10px] text-text3">{progress}</p>
        </div>
      )}
    </div>
  )
}
