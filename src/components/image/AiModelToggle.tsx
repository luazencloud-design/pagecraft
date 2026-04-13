'use client'

import { useState, useCallback } from 'react'
import { useProductStore } from '@/stores/productStore'
import { useImageStore } from '@/stores/imageStore'
import { api, ApiError } from '@/lib/api'

export default function AiModelToggle() {
  const { product } = useProductStore()
  const {
    images, aiModelEnabled, aiModelGender,
    setAiModelEnabled, setAiModelGender, addImages,
  } = useImageStore()

  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const generate = useCallback(async () => {
    if (generated) {
      setErrorMsg('이번 세션에서 이미 생성했습니다.')
      return
    }
    if (!product.name && images.length === 0) {
      setErrorMsg('상품명을 입력하거나 이미지를 먼저 업로드해주세요.')
      return
    }

    setGenerating(true)
    setErrorMsg('')
    try {
      const result = await api.post<{ image: string }>('/api/image/generate', {
        productName: product.name,
        category: product.category,
        gender: aiModelGender,
        images: images.map((img) => img.dataUrl),
      })
      if (result.image) {
        addImages([result.image])
        setGenerated(true)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        try {
          const body = JSON.parse(err.message)
          setErrorMsg(body.error || '이미지 생성에 실패했습니다.')
        } catch {
          setErrorMsg(err.message || '이미지 생성에 실패했습니다.')
        }
      } else {
        setErrorMsg('이미지 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setGenerating(false)
    }
  }, [product, images, aiModelGender, generated, addImages])

  return (
    <div className="border border-border rounded-[10px] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-text">AI 모델 이미지 생성</label>
          <span className="text-[10px] bg-green/20 text-green px-[6px] py-[2px] rounded font-medium">AI</span>
        </div>
        <button
          className={`w-9 h-5 rounded-[10px] relative border transition-colors duration-200 cursor-pointer ${aiModelEnabled ? 'bg-accent border-accent' : 'bg-surface3 border-border2'}`}
          onClick={() => setAiModelEnabled(!aiModelEnabled)}
        >
          <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-200 ${aiModelEnabled ? 'translate-x-4' : 'left-[2px]'}`} />
        </button>
      </div>

      {aiModelEnabled && (
        <>
          <div className="flex gap-2">
            <button
              className={`flex-1 px-3 py-1 rounded-[6px] text-[11px] font-semibold cursor-pointer transition-all duration-150 ${aiModelGender === 'female' ? 'bg-accent text-[#0c0c10]' : 'bg-surface2 border border-border text-text3'}`}
              onClick={() => setAiModelGender('female')}
            >
              여성
            </button>
            <button
              className={`flex-1 px-3 py-1 rounded-[6px] text-[11px] font-semibold cursor-pointer transition-all duration-150 ${aiModelGender === 'male' ? 'bg-accent text-[#0c0c10]' : 'bg-surface2 border border-border text-text3'}`}
              onClick={() => setAiModelGender('male')}
            >
              남성
            </button>
          </div>

          <button
            className={`w-full px-3 py-2 rounded-[10px] text-[12px] font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
              generated
                ? 'bg-green/20 text-green border border-green/30'
                : 'bg-accent-dim text-accent border border-accent/30 hover:bg-accent/20'
            }`}
            onClick={generate}
            disabled={generating || generated}
          >
            {generating ? (
              <>
                <div className="w-[15px] h-[15px] border-2 border-[rgba(232,201,122,0.3)] border-t-accent rounded-full animate-[spin_0.7s_linear_infinite]" />
                생성 중...
              </>
            ) : generated ? (
              '생성됨 ✓'
            ) : (
              '🧑 이미지 생성'
            )}
          </button>

          {errorMsg && (
            <div className="bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] rounded-lg px-[13px] py-2 text-[12px] text-red">
              {errorMsg}
            </div>
          )}
        </>
      )}
    </div>
  )
}
