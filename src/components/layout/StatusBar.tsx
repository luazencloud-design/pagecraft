'use client'

import { useImageStore } from '@/stores/imageStore'
import { useProductStore } from '@/stores/productStore'
import { useEditorStore } from '@/stores/editorStore'

export default function StatusBar() {
  const { images } = useImageStore()
  const { product } = useProductStore()
  const { isGenerating, isRenderingPng, loadingMessage } = useEditorStore()

  const isLoading = isGenerating || isRenderingPng

  return (
    <footer className="h-[26px] bg-surface border-t border-border flex items-center justify-between px-[18px] text-[10px] text-text3 font-mono shrink-0 z-[100]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-accent' : images.length > 0 ? 'bg-green' : 'bg-text3'}`} />
          {isLoading ? (
            <span>{loadingMessage || '처리 중...'}</span>
          ) : (
            <span>사진 {images.length}장</span>
          )}
        </div>
        <span>플랫폼: {product.platform || '쿠팡'}</span>
      </div>
      <span>PageCraft Pro v2.0</span>
    </footer>
  )
}
