'use client'

import { useState, useCallback } from 'react'
import { useProductStore } from '@/stores/productStore'
import { useImageStore } from '@/stores/imageStore'
import { api } from '@/lib/api'
import { showToast } from '@/components/ui/Toast'
import Input from '@/components/ui/Input'

const CATEGORIES = [
  '패션의류', '패션잡화', '뷰티', '식품', '생활용품',
  '가전디지털', '스포츠', '유아동', '반려동물', '기타',
]

const FEATURES = [
  '프리미엄', '가성비', '트렌디', '핸드메이드', '친환경', '국내산',
  '수입', '한정판', '시즌상품', '베스트셀러', '신상품', '묶음할인',
]

export default function ProductForm() {
  const { product, setProduct } = useProductStore()
  const {
    images, aiModelEnabled, aiModelGender,
    setAiModelEnabled, setAiModelGender, addImages,
  } = useImageStore()

  const [aiModelGenerating, setAiModelGenerating] = useState(false)
  const [aiModelGenerated, setAiModelGenerated] = useState(false)

  const toggleFeature = (feature: string) => {
    const features = product.features.includes(feature)
      ? product.features.filter((f) => f !== feature)
      : [...product.features, feature]
    setProduct({ features })
  }

  const generateModelImage = useCallback(async () => {
    if (aiModelGenerated) {
      showToast('이번 세션에서 이미 생성했습니다', 'info')
      return
    }
    if (!product.name && images.length === 0) {
      showToast('상품명 또는 이미지가 필요합니다', 'error')
      return
    }

    setAiModelGenerating(true)
    try {
      const result = await api.post<{ image: string }>('/api/image/generate', {
        productName: product.name,
        category: product.category,
        gender: aiModelGender,
        images: images.map((img) => img.dataUrl),
      })
      if (result.image) {
        addImages([result.image])
        setAiModelGenerated(true)
        showToast('AI 모델 이미지가 생성되었습니다')
      }
    } catch (err) {
      console.error('AI 모델 이미지 생성 실패:', err)
      showToast('AI 모델 이미지 생성 실패', 'error')
    } finally {
      setAiModelGenerating(false)
    }
  }, [product.name, product.category, aiModelGender, images, aiModelGenerated, addImages])

  return (
    <div className="space-y-4">
      <Input label="브랜드" id="brand" placeholder="예: 내셔널 지오그래픽" value={product.brand} onChange={(e) => setProduct({ brand: e.target.value })} />
      <Input label="상품명" id="pname" placeholder="예: 슬라이드 슬리퍼 남녀공용" value={product.name} onChange={(e) => setProduct({ name: e.target.value })} />
      <Input label="가격" id="price" placeholder="예: 39,900" value={product.price} onChange={(e) => setProduct({ price: e.target.value })} />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted">카테고리</label>
        <select
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
          value={product.category}
          onChange={(e) => setProduct({ category: e.target.value })}
        >
          <option value="">선택하세요</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted">판매 플랫폼</label>
        <select
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-accent/50"
          value={product.platform}
          onChange={(e) => setProduct({ platform: e.target.value })}
        >
          <option value="쿠팡">쿠팡</option>
          <option value="네이버 스마트스토어">네이버 스마트스토어</option>
          <option value="11번가">11번가</option>
          <option value="G마켓">G마켓</option>
        </select>
      </div>

      {/* Feature chips */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted">특징</label>
        <div className="flex flex-wrap gap-1.5">
          {FEATURES.map((feat) => (
            <button
              key={feat}
              className={`px-2.5 py-1 rounded-full text-xs cursor-pointer transition-colors ${
                product.features.includes(feat)
                  ? 'bg-accent text-black'
                  : 'bg-surface border border-border text-muted hover:border-accent/50'
              }`}
              onClick={() => toggleFeature(feat)}
            >
              {feat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="memo" className="text-sm text-muted">메모 (선택)</label>
        <textarea
          id="memo"
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
          rows={3}
          placeholder="색상, 소재, 특징 등 AI에게 전달할 추가 정보"
          value={product.memo}
          onChange={(e) => setProduct({ memo: e.target.value })}
        />
      </div>

      {/* AI Model Image Generation */}
      <div className="border border-border rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm text-text">AI 모델 이미지 생성</label>
            <span className="text-[10px] bg-green/20 text-green px-1.5 py-0.5 rounded font-medium">AI</span>
          </div>
          <button
            className={`w-8 h-[18px] rounded-full relative transition-colors cursor-pointer ${aiModelEnabled ? 'bg-accent' : 'bg-border'}`}
            onClick={() => setAiModelEnabled(!aiModelEnabled)}
          >
            <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all ${aiModelEnabled ? 'left-[14px]' : 'left-[2px]'}`} />
          </button>
        </div>

        {aiModelEnabled && (
          <>
            <div className="flex gap-2">
              <button
                className={`flex-1 px-3 py-1.5 rounded text-xs cursor-pointer transition-colors ${aiModelGender === 'female' ? 'bg-accent text-black' : 'bg-surface border border-border text-muted'}`}
                onClick={() => setAiModelGender('female')}
              >
                여성
              </button>
              <button
                className={`flex-1 px-3 py-1.5 rounded text-xs cursor-pointer transition-colors ${aiModelGender === 'male' ? 'bg-accent text-black' : 'bg-surface border border-border text-muted'}`}
                onClick={() => setAiModelGender('male')}
              >
                남성
              </button>
            </div>

            <button
              className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                aiModelGenerated
                  ? 'bg-green/20 text-green border border-green/30'
                  : 'bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20'
              }`}
              onClick={generateModelImage}
              disabled={aiModelGenerating || aiModelGenerated}
            >
              {aiModelGenerating ? (
                <>
                  <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  생성 중...
                </>
              ) : aiModelGenerated ? (
                '생성됨 ✓'
              ) : (
                '🧑 이미지 생성'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
