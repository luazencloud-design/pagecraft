'use client'

import { useMemo, useRef, useState } from 'react'
import Header from '@/components/layout/Header'
import StatusBar from '@/components/layout/StatusBar'
import ProductForm from '@/components/layout/ProductForm'
import ImageUploader from '@/components/image/ImageUploader'
import ImageGrid from '@/components/image/ImageGrid'
import SingleImageUpload from '@/components/image/SingleImageUpload'
import BgRemovalToggle from '@/components/image/BgRemovalToggle'
import AiModelToggle from '@/components/image/AiModelToggle'
import ResultTabs from '@/components/editor/ResultTabs'
import DetailPagePreview from '@/components/editor/DetailPagePreview'
import DraftSelector from '@/components/layout/DraftSelector'
import Button from '@/components/ui/Button'
import { useProductStore } from '@/stores/productStore'
import { useImageStore } from '@/stores/imageStore'
import { useApiKeyStore } from '@/stores/apiKeyStore'
import { useAuthStore } from '@/stores/authStore'
import { useCreditLabel } from '@/hooks/useCredits'
import { useEditorStore } from '@/stores/editorStore'
import { useDraftsStore } from '@/stores/draftsStore'
import { useAIGenerate } from '@/hooks/useAIGenerate'
import { useGlobalImagePaste } from '@/hooks/useImageUpload'
import { api, ApiError } from '@/lib/api'
import { showToast } from '@/components/ui/Toast'
import { PLATFORM_META } from '@/types/product'
import { copyEbayToClipboard } from '@/lib/ebayHtml'
import { downloadHtmlSnapshot } from '@/lib/htmlExport'
import { exportQoo10HybridZip, exportQoo10SlicedZip } from '@/lib/qoo10Export'
import type { GeneratedContent } from '@/types/ai'

export default function ProductNewPage() {
  const { product } = useProductStore()
  const {
    images, storeIntroImage, termsImage, setStoreIntroImage, setTermsImage, aiOnlyMode,
    giftImage, giftDescription, giftEnabled, setGiftImage, setGiftDescription, setGiftEnabled,
  } = useImageStore()
  const [giftDescLoading, setGiftDescLoading] = useState(false)
  const {
    isGenerating: rawIsGenerating,
    generatingDraftId,
    generatedContent,
    loadingMessage,
    generateError,
    currentLang,
    langCache,
    generatedForPlatform,
  } = useEditorStore()
  const currentDraftId = useDraftsStore((s) => s.currentId)
  // 다른 드래프트가 생성 중인 경우엔 이 화면에 로딩 표시 X
  const isGenerating = rawIsGenerating && generatingDraftId === currentDraftId
  const { generateContent } = useAIGenerate()

  // 페이지 어디서든 Ctrl+V 로 이미지 클립보드 붙여넣기 (드래그&드롭은 ImageUploader 박스 전담)
  useGlobalImagePaste()

  // 콘텐츠가 다른 플랫폼용으로 생성됐는지 판단 — 재생성 권장 배너 표시용
  const isStale = !!(
    generatedContent &&
    generatedForPlatform &&
    generatedForPlatform !== product.platform
  )

  /**
   * 큐텐 템플릿용 시각 필드 fallback —
   * 활성 언어에 mood_callout / hashtags 가 비어있으면 다른 캐시에서 가져옴.
   * mood_callout은 양 언어 동일 (영문) 이라 fallback 안전. hashtags는 차선.
   * 캐시에 다른 언어가 있으면 자동으로 활용 (lang에 무관 — en/ja/ko 어느 쪽이든).
   */
  const previewContent = useMemo<GeneratedContent | null>(() => {
    if (!generatedContent) return null
    // currentLang 외에 캐시된 다른 언어 중 첫 번째에서 fallback
    const otherLang = (Object.keys(langCache) as Array<keyof typeof langCache>).find(
      (l) => l !== currentLang && langCache[l],
    )
    const otherContent = otherLang ? langCache[otherLang]?.content : undefined
    if (!otherContent) return generatedContent

    return {
      ...generatedContent,
      mood_callout: generatedContent.mood_callout || otherContent.mood_callout,
      hashtags: (generatedContent.hashtags?.length ? generatedContent.hashtags : otherContent.hashtags) ?? [],
    }
  }, [generatedContent, currentLang, langCache])
  const hasApiKey = useApiKeyStore((s) => s.apiKey.trim().length > 0)
  // 무료 체험(활성) / 무제한(직원) / BYOK 키 중 하나면 사용 가능
  const trialActive = useAuthStore((s) => s.loggedIn && (s.unlimited || !!s.trial?.active))
  const canUseAi = hasApiKey || trialActive
  const creditLabel = useCreditLabel() // 체험 모드일 때만 ' (크레딧 N개)' 반환
  const canGenerate = images.length > 0 && product.name.trim() !== '' && canUseAi

  // 미리보기 DOM 캡처용 ref — DetailPagePreview의 wrapper div에 연결
  const previewRef = useRef<HTMLDivElement>(null)

  /**
   * 이미지 다운로드 — 미리보기 DOM을 html-to-image로 캡처
   *
   * 용량 정책 (쿠팡 상세페이지 한 장당 10MB 제한 대응):
   *  1) PNG 시도 (최고 화질). 10MB 이하면 그대로 사용.
   *  2) 초과 시 → 같은 캔버스에서 JPEG 품질만 0.92→0.45 낮춰가며 10MB 이하로.
   *  3) 그래도 안 되면 (페이지가 너무 길면) pixelRatio 낮춰 재렌더 후 재시도.
   *  4) 최후까지 안 되면 가장 작은 결과 내려주고 분할 업로드 안내.
   *
   * 한 번만 렌더(toCanvas)하고 품질만 재인코딩 → 긴 페이지도 빠름.
   */
  const handleDownload = async () => {
    if (!generatedContent) return
    const node = previewRef.current
    if (!node) {
      showToast('미리보기를 찾지 못했습니다', 'error')
      return
    }

    const MAX_BYTES = 9.8 * 1024 * 1024 // 10MB 한도에 안전 마진
    // dataURL(base64) 실제 바이트 추정
    const bytesOf = (url: string) => {
      const i = url.indexOf(',')
      const b64 = i >= 0 ? url.slice(i + 1) : url
      return Math.ceil((b64.length * 3) / 4)
    }

    showToast('이미지 생성 중...')
    try {
      // 폰트 로드 완료까지 대기 — Pretendard/Noto Sans JP가 시스템 폰트로 떨어지면 자간·배치 깨짐
      if (typeof document !== 'undefined' && document.fonts) {
        try {
          await Promise.all([
            document.fonts.load('500 16px "Pretendard Variable"'),
            document.fonts.load('700 12px "Pretendard Variable"'),
            document.fonts.load('800 24px "Pretendard Variable"'),
            document.fonts.load('900 64px "Pretendard Variable"'),
            document.fonts.load('500 16px "Noto Sans JP"'),
            document.fonts.load('800 24px "Noto Sans JP"'),
            document.fonts.load('900 64px "Noto Sans JP"'),
          ])
          await document.fonts.ready
        } catch {
          // 폰트 로드 실패해도 진행
        }
      }

      const { toCanvas } = await import('html-to-image')
      const renderCanvas = async (pixelRatio: number): Promise<HTMLCanvasElement> => {
        const opts = { backgroundColor: '#ffffff', pixelRatio, cacheBust: true }
        try {
          return await toCanvas(node, { ...opts, skipFonts: false })
        } catch (err) {
          console.warn('폰트 임베딩 실패, skipFonts로 재시도:', err)
          return await toCanvas(node, { ...opts, skipFonts: true })
        }
      }

      // 1) PNG 먼저 (최고 화질)
      let canvas = await renderCanvas(2)
      let dataUrl = canvas.toDataURL('image/png')
      let ext: 'png' | 'jpg' = 'png'

      // 10MB 제한은 쿠팡만 적용 — 다른 플랫폼은 PNG 원본 화질 유지
      const enforce10MB = product.platform === 'coupang'

      // 2) (쿠팡) 10MB 초과 → JPEG 품질 루프 (같은 캔버스 재인코딩, 빠름)
      if (enforce10MB && bytesOf(dataUrl) > MAX_BYTES) {
        ext = 'jpg'
        let fit = false
        for (const q of [0.92, 0.85, 0.75, 0.65, 0.55, 0.45]) {
          dataUrl = canvas.toDataURL('image/jpeg', q)
          if (bytesOf(dataUrl) <= MAX_BYTES) { fit = true; break }
        }
        // 3) 그래도 초과 → 해상도 낮춰 재렌더 후 재시도
        if (!fit) {
          for (const pr of [1.5, 1.2, 1.0]) {
            canvas = await renderCanvas(pr)
            for (const q of [0.8, 0.65, 0.5, 0.42]) {
              dataUrl = canvas.toDataURL('image/jpeg', q)
              if (bytesOf(dataUrl) <= MAX_BYTES) { fit = true; break }
            }
            if (fit) break
          }
        }
        if (!fit) {
          showToast('10MB 이하로 못 줄였어요 — 페이지가 너무 깁니다. 분할 업로드를 권장합니다', 'error')
        }
      }

      const finalMB = (bytesOf(dataUrl) / 1024 / 1024).toFixed(1)
      const a = document.createElement('a')
      a.href = dataUrl
      const safeName = (generatedContent.product_name || product.name || '상품').replace(/[/\\?%*:|"<>]/g, '')
      a.download = `상세페이지_${safeName}.${ext}`
      a.click()
      showToast(`이미지 다운로드 완료 — ${ext.toUpperCase()} ${finalMB}MB`)
    } catch (err) {
      console.error('다운로드 실패:', err)
      showToast('다운로드 실패 — 다시 시도해주세요', 'error')
    }
  }

  /**
   * eBay 전용 — rich text(HTML)로 클립보드에 복사
   * eBay 설명창에 그대로 붙여넣으면 굵기/불릿/구분선 보존
   */
  const handleCopyEbayHtml = async () => {
    if (!generatedContent) return
    const ok = await copyEbayToClipboard(generatedContent, product.price)
    if (ok) showToast('eBay 페이지 복사됨 — 설명창에 붙여넣으세요')
  }

  /**
   * 큐텐 ZIP — Hybrid 방식 (텍스트는 HTML, 이미지는 분리)
   *   장점: 텍스트/스타일 보존, 이미지 위치만 교체
   *   단점: placeholder 자리 → 이미지로 교체하는 수작업 N번
   */
  const handleDownloadQoo10HybridZip = async () => {
    if (!generatedContent) return
    const node = previewRef.current
    if (!node) return showToast('미리보기를 찾지 못했습니다', 'error')
    try {
      const lang: 'ja' | 'ko' = currentLang === 'ko' ? 'ko' : 'ja'
      const result = await exportQoo10HybridZip({
        node,
        productName: generatedContent.product_name || product.name || '상품',
        lang,
        onProgress: (msg) => showToast(msg),
      })
      if (result.success) {
        showToast(`큐텐 HTML ZIP 완료 — 이미지 ${result.imageCount}장 (${result.totalSizeKB}KB)`)
      }
    } catch (err) {
      console.error('큐텐 Hybrid ZIP 실패:', err)
      showToast('큐텐 ZIP 다운로드 실패', 'error')
    }
  }

  /**
   * 큐텐 ZIP — Sliced 방식 (상세페이지 통째 슬라이스)
   *   장점: HTML 안의 <img>를 한번에 큐텐 CDN URL로 교체하면 끝 (placeholder 작업 X)
   *         이미지 사이 여백 없도록 <table> 래핑
   *   단점: 텍스트 검색 안 됨 (이미지로 변환됨)
   */
  const handleDownloadQoo10SlicedZip = async () => {
    if (!generatedContent) return
    const node = previewRef.current
    if (!node) return showToast('미리보기를 찾지 못했습니다', 'error')
    try {
      const result = await exportQoo10SlicedZip({
        node,
        productName: generatedContent.product_name || product.name || '상품',
        onProgress: (msg) => showToast(msg),
      })
      if (result.success) {
        showToast(`큐텐 슬라이스 ZIP 완료 — ${result.chunkCount}장 (${result.totalSizeKB}KB)`)
      }
    } catch (err) {
      console.error('큐텐 Sliced ZIP 실패:', err)
      showToast('큐텐 슬라이스 ZIP 실패', 'error')
    }
  }

  /**
   * HTML 파일로 다운로드 — 전 플랫폼 공통
   * 미리보기 DOM의 outerHTML을 standalone html 문서로 패키징.
   * 이미지는 dataUrl로 박혀있어서 인터넷 없어도 그대로 보임 (폰트만 CDN).
   */
  const handleDownloadHtml = () => {
    if (!generatedContent) return
    const node = previewRef.current
    if (!node) {
      showToast('미리보기를 찾지 못했습니다', 'error')
      return
    }
    const platformLang = PLATFORM_META[product.platform]?.lang ?? 'ko'
    const ok = downloadHtmlSnapshot(node, {
      productName: generatedContent.product_name || product.name || '상품',
      lang: platformLang,
    })
    if (ok) showToast('HTML 다운로드 완료')
    else showToast('HTML 다운로드 실패', 'error')
  }

  /**
   * 사은품 설명 생성 — 사은품 이미지를 vision으로 인식해 담백한 문구 생성
   */
  const handleGenerateGiftDescription = async () => {
    if (!giftImage) return
    setGiftDescLoading(true)
    try {
      const { description } = await api.post<{ description: string }>('/api/ai/gift-describe', {
        image: giftImage,
        productName: product.name,
      })
      setGiftDescription(description)
      showToast('사은품 설명 생성 완료')
    } catch (err) {
      let msg = '사은품 설명 생성 실패'
      if (err instanceof ApiError) {
        try {
          msg = JSON.parse(err.message).error || msg
        } catch {
          msg = err.message || msg
        }
      }
      showToast(msg, 'error')
    } finally {
      setGiftDescLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
      <Header />

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '450px 1fr 480px', overflow: 'hidden' }}>

        {/* ── LEFT PANEL ── */}
        <aside style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} className="left-panel-scroll">

          {/* 드래프트 선택기 — 최상단 */}
          <DraftSelector />

          <div className="divider" />

          {/* 상품 사진 */}
          <div className="panel-section">
            <div className="panel-section-title">상품 사진</div>
            <ImageUploader />
          </div>

          {/* 배경 제거 토글 */}
          <BgRemovalToggle />

          {/* AI 모델 토글 */}
          <AiModelToggle />

          {/* 썸네일 그리드 — 토글 아래 */}
          <ImageGrid />

          <div className="divider" />

          {/* 상품 정보 */}
          <div className="panel-section">
            <div className="panel-section-title">상품 정보</div>
          </div>
          <ProductForm />

          <div className="divider" />

          {/* 스토어 소개 */}
          <div className="panel-section">
            <div className="panel-section-title">스토어 소개 (헤더 위)</div>
          </div>
          <div style={{ padding: '0 18px 8px' }}>
            <SingleImageUpload
              label="스토어 소개 이미지"
              icon="🏪"
              description={'상세페이지 맨 위(헤더 위)에 표시\n이미지 파일 1장'}
              imageData={storeIntroImage}
              onImageChange={setStoreIntroImage}
            />
          </div>

          <div className="divider" />

          {/* 사은품 */}
          <div className="panel-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="panel-section-title">사은품 (선택)</div>
            {/* 상세페이지 노출 토글 — 사은품 이미지 있을 때만 */}
            {giftImage && (
              <button
                onClick={() => setGiftEnabled(!giftEnabled)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                title={giftEnabled ? '상세페이지에 사은품 노출 중' : '상세페이지에 사은품 미노출'}
              >
                <span style={{ fontSize: 10, color: giftEnabled ? 'var(--accent)' : 'var(--text3)', fontWeight: 600 }}>
                  {giftEnabled ? '노출' : '숨김'}
                </span>
                <span
                  style={{
                    width: 28,
                    height: 16,
                    borderRadius: 8,
                    background: giftEnabled ? 'var(--accent)' : 'var(--surface3)',
                    border: `1px solid ${giftEnabled ? 'var(--accent)' : 'var(--border2)'}`,
                    position: 'relative',
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '1px',
                      left: '1px',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: giftEnabled ? '#0c0c10' : 'var(--text2)',
                      transition: 'all 0.2s',
                      transform: giftEnabled ? 'translateX(12px)' : 'translateX(0)',
                    }}
                  />
                </span>
              </button>
            )}
          </div>
          <div style={{ padding: '0 18px 8px', opacity: giftImage && !giftEnabled ? 0.5 : 1, transition: 'opacity 0.15s' }}>
            <SingleImageUpload
              label="사은품 이미지"
              icon="🎁"
              description={'스토어 소개 아래에 사은품 안내 표시\n썸네일에도 작게 추가 가능 · 1장'}
              imageData={giftImage}
              onImageChange={setGiftImage}
            />
            {giftImage && (
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={handleGenerateGiftDescription}
                  disabled={giftDescLoading}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 700,
                    background: giftDescLoading ? 'var(--surface3)' : 'var(--accent)',
                    border: 'none',
                    color: giftDescLoading ? 'var(--text3)' : '#0c0c10',
                    cursor: giftDescLoading ? 'not-allowed' : 'pointer',
                  }}
                  title="사은품 이미지를 인식해 담백한 안내 문구 생성 (크레딧 1개)"
                >
                  {giftDescLoading
                    ? '문구 생성 중...'
                    : giftDescription
                      ? `↻ 사은품 설명 다시 생성${creditLabel('gift')}`
                      : `✦ 사은품 설명 생성${creditLabel('gift')}`}
                </button>
                {giftDescription && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '9px 11px',
                      borderRadius: 8,
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      fontSize: 11.5,
                      color: 'var(--text2)',
                      lineHeight: 1.6,
                    }}
                  >
                    {giftDescription}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="divider" />

          {/* 약관 */}
          <div className="panel-section">
            <div className="panel-section-title">약관 (푸터 아래)</div>
          </div>
          <div style={{ padding: '0 18px 8px' }}>
            <SingleImageUpload
              label="약관 이미지"
              icon="📜"
              description={'상세페이지 맨 아래(푸터 아래)에 표시\n이미지 파일 1장'}
              imageData={termsImage}
              onImageChange={setTermsImage}
            />
          </div>

          <div className="divider" />

          {/* 생성 버튼 */}
          <div className="gen-wrap">
            <Button
              className="w-full"
              size="lg"
              loading={isGenerating}
              disabled={!canGenerate}
              onClick={generateContent}
            >
              {isGenerating ? '생성 중...' : `✦ AI 상세페이지 생성${creditLabel('generate')}`}
            </Button>
            {!canUseAi && (
              <p style={{ fontSize: 11, color: 'var(--accent)', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
                <b>초대 링크</b>로 입장(무료 체험)하거나<br />⚙️ 설정에서 본인 Gemini API 키를 입력하세요.
              </p>
            )}
          </div>
        </aside>

        {/* ── CENTER CANVAS ── */}
        <main style={{ background: 'var(--bg)', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px' }}>
          {/* Canvas toolbar — preview.html always visible */}
          <div style={{ width: '100%', maxWidth: 660, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginRight: 'auto' }}>preview.html</span>
            {generatedContent && (
              <>
                {/* eBay 전용 — rich HTML 복사 (서식 그대로 eBay 설명창 붙여넣기) */}
                {PLATFORM_META[product.platform]?.market === 'us' && (
                  <button
                    style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = '#0c0c10' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
                    onClick={handleCopyEbayHtml}
                    title="eBay 설명창에 굵기·불릿·구분선 그대로 붙여넣기 (HTML 서식 보존)"
                  >
                    🎨 eBay 서식 그대로 복사
                  </button>
                )}
                {/* 큐텐(JP) 전용 — 2가지 방식 ZIP */}
                {PLATFORM_META[product.platform]?.market === 'jp' && (
                  <>
                    <button
                      style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = '#0c0c10' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
                      onClick={handleDownloadQoo10HybridZip}
                      title="텍스트는 HTML로, 이미지는 별도 N장. 큐텐 에디터에서 placeholder 박스 자리에 이미지 끼워넣기"
                    >
                      📦 HTML+이미지
                    </button>
                    <button
                      style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = '#0c0c10' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)' }}
                      onClick={handleDownloadQoo10SlicedZip}
                      title="상세페이지 통째 슬라이스. <table>로 묶어서 이미지 사이 여백 없음. HTML img src만 큐텐 URL로 일괄 교체하면 끝"
                    >
                      🖼 슬라이스
                    </button>
                  </>
                )}
                {/* HTML 다운로드 — 전 플랫폼 공통, 원본 화질 유지 + 브라우저에서 바로 열어볼 수 있음 */}
                <button
                  style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface3)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)' }}
                  onClick={handleDownloadHtml}
                  title="원본 HTML 파일로 다운로드 — 브라우저에서 바로 열기 가능"
                >
                  📄 HTML 저장
                </button>
                <button
                  style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'var(--accent)', border: '1px solid var(--accent)', color: '#0c0c10', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent2)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)' }}
                  onClick={handleDownload}
                >
                  ⬇ 이미지 저장
                </button>
              </>
            )}
          </div>

          {/* Preview frame */}
          <div style={{ width: '100%', maxWidth: 660, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', overflowY: 'auto', minHeight: 500 }}>
            {/* Browser bar */}
            <div style={{ height: 36, background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,95,87,0.4)' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(254,188,46,0.4)' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(40,200,64,0.4)' }} />
              </div>
              <div style={{ flex: 1, background: 'var(--surface3)', borderRadius: 5, height: 20, display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text3)' }}>pagecraft://preview · 상세페이지 미리보기</span>
              </div>
            </div>

            {/* Loading state */}
            {isGenerating && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 30px', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, position: 'relative', marginBottom: 24 }}>
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-[spin_1s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-green animate-[spin_1.5s_linear_infinite_reverse]" />
                  <div className="absolute inset-[18px] rounded-full bg-accent-dim border border-accent animate-[pulse_2s_ease-in-out_infinite]" />
                </div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 5 }}>{loadingMessage || '처리 중...'}</p>
                <p style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>잠시만 기다려주세요</p>
              </div>
            )}

            {/* Error state */}
            {!isGenerating && generateError && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 30px', textAlign: 'center' }}>
                <div style={{ width: 72, height: 72, background: 'rgba(248,113,113,0.08)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, marginBottom: 20, border: '1px solid rgba(248,113,113,0.2)' }}>
                  ⚠
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>생성에 실패했습니다</h3>
                <p style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.6, marginBottom: 16, maxWidth: 400, wordBreak: 'break-word' }}>
                  {generateError}
                </p>
                <button
                  onClick={generateContent}
                  disabled={!canGenerate}
                  style={{ padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'var(--accent)', border: 'none', color: '#0c0c10', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  ↺ 다시 시도
                </button>
              </div>
            )}

            {/* Empty state */}
            {!isGenerating && !generateError && !generatedContent && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 30px', textAlign: 'center' }}>
                <div style={{ width: 72, height: 72, background: 'var(--surface2)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, marginBottom: 20, border: '1px solid var(--border)' }}>
                  🛍
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>상품 정보를 입력해주세요</h3>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                  사진을 업로드하고 상품 정보를 입력한 뒤<br />AI 생성 버튼을 누르면 바로 만들어집니다.
                </p>
              </div>
            )}

            {/* 플랫폼 mismatch 배너 — 다른 플랫폼용으로 생성된 콘텐츠 + 현재 플랫폼 다름 */}
            {!isGenerating && isStale && generatedForPlatform && (
              <div
                style={{
                  width: '100%',
                  maxWidth: 660,
                  marginBottom: 16,
                  padding: '12px 16px',
                  background: 'rgba(255, 200, 60, 0.08)',
                  border: '1px solid rgba(255, 200, 60, 0.4)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1.4 }}>💡</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                    이 콘텐츠는 <b>{PLATFORM_META[generatedForPlatform]?.label}</b> 톤으로 생성됐어요.
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', margin: '4px 0 0', lineHeight: 1.6 }}>
                    {PLATFORM_META[product.platform]?.label} 에 맞는 카피가 필요하면 AI 다시 생성을 눌러주세요. 템플릿은 즉시 적용됐지만 텍스트는 그대로예요.
                  </p>
                </div>
              </div>
            )}

            {/* 실시간 HTML 미리보기 — generatedContent 변경 시 자동 리렌더링
                템플릿 폭이 다르므로(쿠팡/이베이 800, 큐텐 820) 프레임 660px에 맞게 zoom 동적 계산 */}
            {!isGenerating && previewContent && (
              <div
                style={{
                  zoom:
                    product.template === 'qoo10-modern' || product.template === 'qoo10-classic'
                      ? 660 / 820
                      : 660 / 800,
                }}
              >
                <DetailPagePreview
                  ref={previewRef}
                  content={previewContent}
                  price={product.price}
                  images={
                    // AI 전용 모드: ai 이미지만 템플릿에. 단 ai가 0장이면 fallback으로 전체 사용 (빈 페이지 방지)
                    aiOnlyMode && images.some((img) => img.source === 'ai')
                      ? images.filter((img) => img.source === 'ai').map((img) => img.dataUrl)
                      : images.map((img) => img.dataUrl)
                  }
                  template={product.template}
                  storeIntroImage={storeIntroImage}
                  termsImage={termsImage}
                  giftImage={giftEnabled ? giftImage : null}
                  giftDescription={giftDescription}
                />
              </div>
            )}
          </div>
        </main>

        {/* ── RIGHT PANEL ── */}
        <aside style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ResultTabs />
        </aside>
      </div>

      <StatusBar />
    </div>
  )
}
