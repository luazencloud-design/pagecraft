'use client'

import { useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'

export default function TitlePanel() {
  const { generatedTitles } = useEditorStore()
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
        <p className="text-[11px] text-text2 mt-1 leading-[1.6]">SEO에 최적화된 상품명 5가지입니다.<br />검색 노출과 클릭률을 높이는 버전을 선택하세요.</p>
      </div>

      {generatedTitles.length === 0 && (
        <p className="text-center text-text3 text-[12px] py-[30px] px-[16px]">
          AI 상세페이지를 생성하면<br />자동으로 최적화 상품명이 만들어집니다
        </p>
      )}

      {generatedTitles.map((title) => (
        <div key={title.rank} className="bg-surface2 border border-border rounded-[8px] px-[13px] py-[11px] mb-[7px] relative">
          <p className="text-[10px] font-bold text-accent tracking-[1px] mb-[5px]">#{title.rank}</p>
          <p className="text-[12.5px] text-text leading-[1.5] pr-[52px]">{title.title}</p>
          {title.used_keywords?.length > 0 && (
            <p className="text-[10px] text-text3 mt-1.5">
              🔎 {title.used_keywords.join(', ')}
            </p>
          )}
          <button
            className={`absolute top-[11px] right-[11px] px-[9px] py-[3px] bg-surface3 border rounded-[5px] text-[10px] cursor-pointer transition-all duration-150 ${
              copiedRank === title.rank
                ? 'border-green text-green'
                : 'border-border text-text2 hover:border-border2 hover:text-text'
            }`}
            onClick={() => copyTitle(title.title, title.rank)}
          >
            {copiedRank === title.rank ? '✓ 복사됨' : '복사'}
          </button>
        </div>
      ))}
    </div>
  )
}
