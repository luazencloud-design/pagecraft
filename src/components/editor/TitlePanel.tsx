'use client'

import { useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useAIGenerate } from '@/hooks/useAIGenerate'
import Button from '@/components/ui/Button'

export default function TitlePanel() {
  const { generatedTitles, isGeneratingTitles } = useEditorStore()
  const { generateTitles } = useAIGenerate()
  const [copiedRank, setCopiedRank] = useState<number | null>(null)

  const copyTitle = (title: string, rank: number) => {
    navigator.clipboard.writeText(title)
    setCopiedRank(rank)
    setTimeout(() => setCopiedRank(null), 1500)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[13px] font-semibold text-text">✨ 상품명 최적화</h3>
        <p className="text-[11px] text-text3 mt-1">SEO에 최적화된 상품명 5가지를 생성합니다</p>
      </div>

      <Button
        className="w-full"
        loading={isGeneratingTitles}
        onClick={generateTitles}
      >
        {generatedTitles.length > 0 ? '✨ 다시 생성' : '✨ 최적화 상품명 5개 생성'}
      </Button>

      {generatedTitles.length === 0 && !isGeneratingTitles && (
        <p className="text-center text-text3 text-[11px] py-8">
          쿠팡 검색 키워드를 분석하여 최적화된 상품명을 생성합니다
        </p>
      )}

      {generatedTitles.map((title) => {
        const charColor = title.char_count > 50 ? 'text-red' : title.char_count >= 40 ? 'text-accent' : 'text-text3'

        return (
          <div key={title.rank} className="bg-surface2 border border-border rounded-[10px] overflow-hidden">
            <div className="flex items-center justify-between px-[13px] py-[9px] border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-accent">{title.rank}.</span>
                <span className="text-[11px] text-text3">{title.strategy}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] ${charColor}`}>{title.char_count}자</span>
                <button
                  className={`px-[10px] py-[3px] rounded-[5px] text-[11px] cursor-pointer transition-all duration-150 border ${
                    copiedRank === title.rank
                      ? 'border-green text-green'
                      : 'border-border text-text3 hover:border-border2'
                  }`}
                  onClick={() => copyTitle(title.title, title.rank)}
                >
                  {copiedRank === title.rank ? '✓ 복사됨' : '📋 복사'}
                </button>
              </div>
            </div>
            <div className="px-[13px] py-[11px]">
              <p className="text-[12px] text-text leading-[1.7]">{title.title}</p>
              {title.used_keywords.length > 0 && (
                <p className="text-[10px] text-text3 mt-1.5">
                  🔎 {title.used_keywords.join(', ')}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
