'use client'

import { useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useAIGenerate } from '@/hooks/useAIGenerate'
import { showToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'

export default function TagPanel() {
  const { generatedTags, isGeneratingTags } = useEditorStore()
  const { generateTags } = useAIGenerate()
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [allCopied, setAllCopied] = useState(false)

  const copyTag = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1200)
  }

  const copyAllTags = () => {
    const text = generatedTags.map((t) => t.text).join(', ')
    navigator.clipboard.writeText(text)
    setAllCopied(true)
    showToast('전체 태그 복사됨')
    setTimeout(() => setAllCopied(false), 1500)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[13px] font-semibold text-text">🏷 쿠팡 태그 20개</h3>
        <p className="text-[11px] text-text3 mt-1">검색량과 연관성 기반으로 생성됩니다</p>
      </div>

      <Button
        className="w-full"
        loading={isGeneratingTags}
        onClick={generateTags}
      >
        {generatedTags.length > 0 ? '🏷 태그 다시 생성' : '🏷 쿠팡 태그 20개 생성'}
      </Button>

      {generatedTags.length === 0 && !isGeneratingTags && (
        <p className="text-center text-text3 text-[11px] py-8">
          태그 클릭 시 개별 복사, 하단 버튼으로 전체 복사
        </p>
      )}

      {generatedTags.length > 0 && (
        <>
          <div className="flex flex-wrap gap-[5px]">
            {generatedTags.map((tag, i) => (
              <button
                key={i}
                className={`px-[10px] py-1 rounded-[20px] text-[11px] cursor-pointer transition-all duration-150 border ${
                  copiedIdx === i
                    ? 'bg-green/20 border-green text-green'
                    : tag.isTrending
                      ? 'bg-accent-dim border-accent text-accent2'
                      : 'bg-transparent border-border text-text2 hover:border-border2'
                }`}
                onClick={() => copyTag(tag.text, i)}
              >
                {tag.isTrending && '★ '}{copiedIdx === i ? '✓' : tag.text}
              </button>
            ))}
          </div>

          <button
            className={`w-full px-3 py-2 rounded-[10px] text-[12px] font-semibold cursor-pointer transition-all duration-150 border ${
              allCopied
                ? 'bg-green/20 border-green text-green'
                : 'bg-surface2 border-border text-text2 hover:border-border2'
            }`}
            onClick={copyAllTags}
          >
            {allCopied ? '✓ 복사됨!' : '📋 태그 20개 전체 복사'}
          </button>

          {generatedTags.some((t) => t.isTrending) && (
            <p className="text-[10px] text-text3">
              ★ 표시된 태그는 쿠팡 인기 검색어와 일치합니다
            </p>
          )}
        </>
      )}
    </div>
  )
}
