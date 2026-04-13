'use client'

import { useState, useCallback, useEffect } from 'react'

interface ToastMessage {
  id: number
  text: string
  type: 'success' | 'error' | 'info'
}

let addToastFn: ((text: string, type?: ToastMessage['type']) => void) | null = null

export function showToast(text: string, type: ToastMessage['type'] = 'success') {
  addToastFn?.(text, type)
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback(
    (text: string, type: ToastMessage['type'] = 'success') => {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, text, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 2500)
    },
    [],
  )

  useEffect(() => {
    addToastFn = addToast
    return () => { addToastFn = null }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-[30px] left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-surface2 border border-border2 rounded-lg px-[18px] py-[10px] text-[13px] text-text shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-in slide-in-from-right"
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}
