'use client'

import { useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { useTranslate } from '@/hooks/useTranslate'
import { useProductStore } from '@/stores/productStore'
import { copyEbayToClipboard } from '@/lib/ebayHtml'

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(text.replace(/\\n/g, '\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      className={`px-[10px] py-[3px] rounded-[5px] text-[11px] cursor-pointer transition-all duration-150 border ${
        copied
          ? 'border-green text-green'
          : 'bg-surface3 border-border text-text2 hover:border-border2 hover:text-text'
      }`}
      onClick={copy}
      title={`${label} 복사`}
    >
      {copied ? '✓ 복사됨' : '📋 복사'}
    </button>
  )
}

function EditableBlock({
  title,
  text,
  multiline = false,
  onSave,
}: {
  title: string
  text: string
  multiline?: boolean
  onSave: (value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)

  const startEdit = () => {
    setDraft(text)
    setEditing(true)
  }

  const save = () => {
    onSave(draft)
    setEditing(false)
  }

  const cancel = () => {
    setDraft(text)
    setEditing(false)
  }

  return (
    <div className="bg-surface2 border border-border rounded-[10px] mb-2 overflow-hidden">
      <div className="flex items-center justify-between px-[13px] py-[9px] border-b border-border">
        <span className="text-[11px] font-semibold text-text2">{title}</span>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button
                className="px-[8px] py-[2px] rounded-[4px] text-[10px] cursor-pointer border border-green text-green hover:bg-green/10"
                onClick={save}
              >
                ✓ 저장
              </button>
              <button
                className="px-[8px] py-[2px] rounded-[4px] text-[10px] cursor-pointer border border-border text-text3 hover:text-text2"
                onClick={cancel}
              >
                취소
              </button>
            </>
          ) : (
            <>
              <button
                className="px-[8px] py-[2px] rounded-[4px] text-[10px] cursor-pointer border border-border text-text3 hover:border-border2 hover:text-text2"
                onClick={startEdit}
                title="수정"
              >
                ✎ 수정
              </button>
              <CopyButton text={text} label={title} />
            </>
          )}
        </div>
      </div>
      {editing ? (
        <textarea
          className="w-full px-[13px] py-[11px] text-[12px] text-text leading-[1.7] bg-transparent border-none outline-none resize-y"
          style={{ minHeight: multiline ? 100 : 40 }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
      ) : (
        <div className={`px-[13px] py-[11px] text-[12px] text-text2 leading-[1.7] ${multiline ? 'whitespace-pre-line' : ''}`}>
          {text}
        </div>
      )}
    </div>
  )
}

function InlineCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <button
      onClick={copy}
      title="복사"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 11, padding: '0 4px', color: copied ? 'var(--green)' : 'var(--text3)',
        transition: 'color 0.15s', flexShrink: 0,
      }}
    >
      {copied ? '✓' : '📋'}
    </button>
  )
}

function SpecBlock({ specs, onUpdate }: { specs: { key: string; value: string }[]; onUpdate: (specs: { key: string; value: string }[]) => void }) {
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<string[]>([])

  const startEdit = () => {
    setDrafts(specs.map(s => s.value))
    setEditing(true)
  }

  const save = () => {
    onUpdate(specs.map((s, i) => ({ ...s, value: drafts[i] })))
    setEditing(false)
  }

  return (
    <div className="bg-surface2 border border-border rounded-[10px] mb-2 overflow-hidden">
      <div className="flex items-center justify-between px-[13px] py-[9px] border-b border-border">
        <span className="text-[11px] font-semibold text-text2">고시정보</span>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button
                className="px-[8px] py-[2px] rounded-[4px] text-[10px] cursor-pointer border border-green text-green hover:bg-green/10"
                onClick={save}
              >
                ✓ 저장
              </button>
              <button
                className="px-[8px] py-[2px] rounded-[4px] text-[10px] cursor-pointer border border-border text-text3 hover:text-text2"
                onClick={() => setEditing(false)}
              >
                취소
              </button>
            </>
          ) : (
            <>
              <button
                className="px-[8px] py-[2px] rounded-[4px] text-[10px] cursor-pointer border border-border text-text3 hover:border-border2 hover:text-text2"
                onClick={startEdit}
              >
                ✎ 수정
              </button>
              <CopyButton text={specs.map(s => `${s.key}: ${s.value}`).join('\n')} label="고시정보 전체" />
            </>
          )}
        </div>
      </div>
      <div className="px-[13px] py-[8px]">
        {specs.map((spec, i) => (
          <div key={i} className="flex items-start gap-2 py-[5px] border-b border-border last:border-b-0" style={{ minHeight: 28 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', width: 100, flexShrink: 0, paddingTop: 2 }}>{spec.key}</span>
            {editing ? (
              <input
                className="flex-1 bg-transparent border-b border-accent text-[12px] text-text outline-none py-0.5"
                value={drafts[i]}
                onChange={(e) => {
                  const next = [...drafts]
                  next[i] = e.target.value
                  setDrafts(next)
                }}
              />
            ) : (
              <div className="flex-1 flex items-start">
                <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, paddingTop: 1 }}>
                  {spec.value}
                </span>
                <InlineCopy text={spec.value} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function LangSwitcher() {
  const { currentLang, isTranslating, langCache } = useEditorStore()
  const { translateTo, syncFromDirty, canTranslate, altLang, isCached, dirtyLang } = useTranslate()

  if (!canTranslate) return null

  const altLabel = altLang === 'ja' ? '🇯🇵 日本語' : '🇰🇷 한국어'
  const currentLabel = currentLang === 'ja' ? '🇯🇵 日本語' : '🇰🇷 한국어'
  const cachedLangs = Object.keys(langCache) as Array<'ko' | 'ja'>
  const cacheCount = cachedLangs.length

  // dirty 상태: 한쪽 언어를 수정해서 다른 언어가 옛 데이터인 상황
  const isDirty = dirtyLang !== null
  const dirtyLabel = dirtyLang === 'ja' ? '일본어' : '한국어'
  const targetLang: 'ko' | 'ja' = dirtyLang === 'ja' ? 'ko' : 'ja'
  const targetLabel = targetLang === 'ja' ? '일본어' : '한국어'

  return (
    <>
      {/* dirty 동기화 배너 — 양 언어 캐시 있고 한쪽이 수정됐을 때만 */}
      {isDirty && (
        <div
          style={{
            background: 'rgba(255, 200, 60, 0.1)',
            border: '1px solid rgba(255, 200, 60, 0.4)',
            borderRadius: 10,
            padding: '11px 13px',
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <p className="text-[12px] font-semibold text-text" style={{ margin: 0, lineHeight: 1.5 }}>
                {dirtyLabel} 수정사항이 {targetLabel}에 아직 반영되지 않았어요
              </p>
              <p className="text-[10px] text-text3" style={{ margin: '4px 0 0', lineHeight: 1.6 }}>
                💡 여러 항목 한 번에 수정 후 동기화하세요 — <b>크레딧 1개 차감</b>
              </p>
            </div>
          </div>
          <button
            disabled={isTranslating}
            onClick={() => syncFromDirty()}
            style={{
              width: '100%',
              padding: '7px 12px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: isTranslating ? 'wait' : 'pointer',
              background: isTranslating ? 'var(--surface3)' : 'var(--accent)',
              color: isTranslating ? 'var(--text3)' : '#0c0c10',
              border: 'none',
              transition: 'all 0.15s',
            }}
          >
            {isTranslating ? '⏳ 동기화 중...' : `🔄 ${targetLabel} 다시 작성 (크레딧 1개)`}
          </button>
        </div>
      )}

      {/* 기존 토글 UI */}
      <div className="bg-surface2 border border-border rounded-[10px] mb-3 overflow-hidden">
        <div className="flex items-center justify-between px-[13px] py-[10px]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-text2">현재 언어</span>
            <span className="text-[11px] px-[8px] py-[2px] rounded-[4px] bg-accent-dim text-accent font-semibold">
              {currentLabel}
            </span>
            {dirtyLang === currentLang && (
              <span className="text-[9px] text-yellow font-semibold" title="이 언어 수정 중">
                ✏️ 수정중
              </span>
            )}
            {cacheCount > 1 && dirtyLang !== currentLang && (
              <span className="text-[9px] text-text3" title="캐시된 언어 버전이 있어요">
                {cacheCount}개 버전 보관 중
              </span>
            )}
          </div>
          <button
            disabled={isTranslating}
            onClick={() => translateTo(altLang)}
            className={`px-[10px] py-[4px] rounded-[5px] text-[11px] cursor-pointer transition-all duration-150 border ${
              isTranslating
                ? 'border-border text-text3 cursor-wait'
                : 'border-accent text-accent hover:bg-accent hover:text-bg'
            }`}
            title={
              isCached
                ? dirtyLang === currentLang
                  ? '저장된 버전 (옛 데이터일 수 있음) 으로 전환'
                  : '저장된 버전으로 즉시 전환'
                : 'AI로 새로 작성 (크레딧 차감)'
            }
          >
            {isTranslating
              ? '⏳ 변환 중...'
              : isCached
                ? `${altLabel}로 전환 ↻`
                : `${altLabel} 만들기 🌐`}
          </button>
        </div>
      </div>
    </>
  )
}

/**
 * eBay 페이지를 rich text(HTML)로 클립보드에 복사
 * - eBay 설명 에디터에 붙여넣으면 폰트 크기/색/굵기/표 그대로 보존
 * - 메모장 등 plain text only는 text/plain fallback
 */
function FullTextCopy({ content }: { content: import('@/types/ai').GeneratedContent }) {
  const [copied, setCopied] = useState(false)
  const { product } = useProductStore()

  const handleCopy = async () => {
    const ok = await copyEbayToClipboard(content, product.price)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`w-full mb-3 px-3 py-2.5 rounded-[8px] text-[12px] font-bold cursor-pointer transition-all duration-150 border ${
        copied
          ? 'border-green text-green bg-green/10'
          : 'border-accent text-accent hover:bg-accent hover:text-bg'
      }`}
      title="eBay 설명창에 붙여넣으면 폰트/색/굵기 그대로 보존됩니다"
    >
      {copied ? '✓ 페이지 복사됨 — eBay에 붙여넣으세요' : '📋 eBay 페이지 통째로 복사 (서식 유지)'}
    </button>
  )
}

export default function CopyPanel() {
  const { generatedContent, setGeneratedContent } = useEditorStore()

  if (!generatedContent) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 16px', color: 'var(--text3)', fontSize: 13, lineHeight: 1.8 }}>
        생성 후 각 항목을<br />바로 복사할 수 있습니다
      </div>
    )
  }

  const update = (field: string, value: string) => {
    const updated = { ...generatedContent }
    switch (field) {
      case 'product_name': updated.product_name = value; break
      case 'subtitle': updated.subtitle = value; break
      case 'main_copy': updated.main_copy = value; break
      case 'selling_points': updated.selling_points = value.split('\n').map(s => s.replace(/^\d+\.\s*/, '')); break
      case 'description': updated.description = value; break
      case 'specs': updated.specs = value.split('\n').map(line => {
        const [key, ...rest] = line.split(':')
        return { key: key.trim(), value: rest.join(':').trim() }
      }); break
      case 'keywords': updated.keywords = value.split(',').map(k => k.trim()).filter(Boolean); break
      case 'caution': updated.caution = value; break
      case 'condition': updated.condition = value; break
      case 'bullet_points': updated.bullet_points = value.split('\n').map((s) => s.replace(/^[•\-*\d.]\s*/, '').trim()).filter(Boolean); break
      case 'item_specifics': updated.item_specifics = value.split('\n').map((line) => {
        const [key, ...rest] = line.split(':')
        return { key: key.trim(), value: rest.join(':').trim() }
      }).filter((s) => s.key); break
      case 'shipping_policy': updated.shipping_policy = value; break
      case 'return_policy': updated.return_policy = value; break
      case 'payment_policy': updated.payment_policy = value; break
    }
    setGeneratedContent(updated)
  }

  const { product_name, subtitle, main_copy, selling_points, description, specs, keywords, caution } =
    generatedContent
  const { condition, bullet_points, item_specifics, shipping_policy, return_policy, payment_policy } =
    generatedContent
  const isEbay = !!(bullet_points || item_specifics || condition || shipping_policy)

  return (
    <div className="space-y-0">
      <LangSwitcher />
      {isEbay && <FullTextCopy content={generatedContent} />}
      <EditableBlock title="상품명" text={product_name} onSave={(v) => update('product_name', v)} />
      <EditableBlock title="서브타이틀" text={subtitle} onSave={(v) => update('subtitle', v)} />
      <EditableBlock title="메인 카피" text={main_copy} onSave={(v) => update('main_copy', v)} />
      {condition && <EditableBlock title="Condition" text={condition} onSave={(v) => update('condition', v)} />}
      {bullet_points && (
        <EditableBlock
          title="Key Features (Bullet Points)"
          text={bullet_points.map((b) => `• ${b}`).join('\n')}
          multiline
          onSave={(v) => update('bullet_points', v)}
        />
      )}
      <EditableBlock title="판매포인트" text={selling_points.map((sp, i) => `${i + 1}. ${sp}`).join('\n')} multiline onSave={(v) => update('selling_points', v)} />
      <EditableBlock title="상세설명" text={description} multiline onSave={(v) => update('description', v)} />
      {item_specifics && item_specifics.length > 0 && (
        <EditableBlock
          title="Item Specifics"
          text={item_specifics.map((s) => `${s.key}: ${s.value}`).join('\n')}
          multiline
          onSave={(v) => update('item_specifics', v)}
        />
      )}
      {shipping_policy && <EditableBlock title="Shipping" text={shipping_policy} multiline onSave={(v) => update('shipping_policy', v)} />}
      {return_policy && <EditableBlock title="Returns" text={return_policy} multiline onSave={(v) => update('return_policy', v)} />}
      {payment_policy && <EditableBlock title="Payment" text={payment_policy} multiline onSave={(v) => update('payment_policy', v)} />}
      {/* 고시정보 — 항목별 인라인 복사 */}
      <SpecBlock specs={specs} onUpdate={(newSpecs) => {
        const updated = { ...generatedContent, specs: newSpecs }
        setGeneratedContent(updated)
      }} />
      <EditableBlock title="키워드" text={keywords.join(', ')} onSave={(v) => update('keywords', v)} />
      <EditableBlock title="주의사항" text={caution} onSave={(v) => update('caution', v)} />

      <p className="text-[10px] text-text3 text-center mt-3 py-2">
        수정 내용은 미리보기에 실시간 반영됩니다
      </p>
    </div>
  )
}
