'use client'

import { useCallback, useEffect } from 'react'
import { useImageStore } from '@/stores/imageStore'
import { showToast } from '@/components/ui/Toast'

/** 원본 File → dataURL 변환 (압축 없음, 서버에 안 보내니까) */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function useImageUpload() {
  const { addImages } = useImageStore()

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) =>
        f.type.startsWith('image/'),
      )
      if (fileArray.length === 0) return

      const dataUrls = await Promise.all(fileArray.map(fileToDataUrl))
      addImages(dataUrls)
    },
    [addImages],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return { handleFiles, handleDrop, handleDragOver }
}

/**
 * 페이지 전역 Ctrl+V 클립보드 이미지 붙여넣기 훅
 *
 * - 사용자가 어디서든 Ctrl+V 누르면 클립보드 안 이미지를 자동으로 추가
 * - input/textarea/contenteditable에 포커스돼 있어도 이미지가 있으면 가로채기 (텍스트 paste는 그대로)
 *
 * 참고: 드래그&드롭 업로드는 ImageUploader 박스가 전담한다.
 * 전역 드롭 핸들러는 두지 않는다 — 박스 onDrop과 window drop이 동시에 발동해
 * 같은 이미지가 두 번 추가되던 버그가 있었기 때문. 단, 박스 바깥에 파일을 떨어뜨렸을 때
 * 브라우저가 그 파일을 열어 작업이 날아가는 사고만 막는 no-op preventDefault 가드는 유지한다.
 */
export function useGlobalImagePaste() {
  const { handleFiles } = useImageUpload()

  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const imageFiles: File[] = []
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const f = item.getAsFile()
          if (f) imageFiles.push(f)
        }
      }
      if (imageFiles.length === 0) return // 텍스트 paste는 그대로 진행
      // 이미지가 있으면 텍스트 필드 안이라도 가로채서 이미지로 추가
      e.preventDefault()
      await handleFiles(imageFiles)
      showToast(`📋 클립보드에서 이미지 ${imageFiles.length}장 추가됨`)
    }

    // 박스 바깥 드롭 사고 방지 가드 — 이미지를 추가하지는 않고, 브라우저가 파일을
    // 새 탭으로 여는 기본 동작만 차단한다. ImageUploader 박스 내부 드롭은 박스가 처리.
    const blockBrowserFileOpen = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault()
    }

    window.addEventListener('paste', onPaste)
    window.addEventListener('dragover', blockBrowserFileOpen)
    window.addEventListener('drop', blockBrowserFileOpen)
    return () => {
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('dragover', blockBrowserFileOpen)
      window.removeEventListener('drop', blockBrowserFileOpen)
    }
  }, [handleFiles])
}
