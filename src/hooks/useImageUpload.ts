'use client'

import { useCallback, useEffect, useState } from 'react'
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
 * 페이지 전역 Ctrl+V 클립보드 이미지 붙여넣기 + 드래그 상태 추적 훅
 *
 * - 사용자가 어디서든 Ctrl+V 누르면 클립보드 안 이미지를 자동으로 추가
 * - input/textarea/contenteditable에 포커스된 상태면 무시 (텍스트 입력 보호)
 * - dragActive 상태로 전체 페이지에 드래그&드롭 오버레이 표시 가능
 */
export function useGlobalImagePaste() {
  const { handleFiles } = useImageUpload()
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      // 텍스트 입력 중이면 텍스트 paste 방해하지 않음 — 단, 이미지가 있으면 가로채기
      const target = e.target as HTMLElement | null
      const isInTextField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

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
      if (isInTextField) {
        // 텍스트 필드에서 이미지 paste는 의도적이지 않을 수 있으므로 살짝 안내
      }
      await handleFiles(imageFiles)
      showToast(`📋 클립보드에서 이미지 ${imageFiles.length}장 추가됨`)
    }

    // 드래그 진입/이탈 추적 — counter로 자식 → 부모 leave 노이즈 방지
    let dragCounter = 0
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      dragCounter += 1
      if (dragCounter === 1) setDragActive(true)
    }
    const onDragLeave = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      dragCounter -= 1
      if (dragCounter <= 0) {
        dragCounter = 0
        setDragActive(false)
      }
    }
    const onDrop = (e: DragEvent) => {
      dragCounter = 0
      setDragActive(false)
      // 페이지 전역 drop은 — ImageUploader 안에서 처리되는 drop은 그대로 두고,
      // 빈 곳에 떨어진 경우는 page의 dropzone에서 처리하도록 dragActive만 끔
      // (브라우저 기본 file open 동작 방지)
      if (e.dataTransfer?.files?.length) {
        // 페이지 전역 drop도 받아주기
        e.preventDefault()
        handleFiles(e.dataTransfer.files)
      }
    }
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault()
    }

    window.addEventListener('paste', onPaste)
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    window.addEventListener('dragover', onDragOver)
    return () => {
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('dragover', onDragOver)
    }
  }, [handleFiles])

  return { dragActive }
}
