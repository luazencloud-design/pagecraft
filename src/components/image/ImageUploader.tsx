'use client'

import { useRef, useState } from 'react'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useImageStore } from '@/stores/imageStore'

export default function ImageUploader() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { handleFiles, handleDrop, handleDragOver } = useImageUpload()
  const { images } = useImageStore()
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      className={`border-[1.5px] border-dashed rounded-xl py-[70px] px-[14px] text-center cursor-pointer transition-all duration-200 relative ${
        dragOver
          ? 'border-accent bg-accent-dim scale-[1.01]'
          : 'border-border2 hover:border-accent hover:bg-accent-dim'
      }`}
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => {
        setDragOver(false)
        handleDrop(e)
      }}
      onDragOver={(e) => {
        handleDragOver(e)
        if (!dragOver) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      <p className="text-2xl mb-2">{dragOver ? '⬇' : '📷'}</p>
      <p className="text-[13px] font-semibold text-text mb-[4px]">
        {dragOver ? '여기에 놓으세요' : '사진 업로드'}
      </p>
      <p className="text-[11px] text-text2 leading-[1.5]">
        클릭 · 드래그 · <kbd className="px-[5px] py-[1px] rounded bg-surface3 border border-border text-[10px] font-mono">Ctrl+V</kbd> 붙여넣기<br />
        JPG · PNG · {images.length > 0 ? `${images.length}/10장` : '최대 10장'}
      </p>
    </div>
  )
}
