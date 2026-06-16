'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * BYOK 전환 — 로그인 없음. 진입 시 바로 작업 화면으로.
 */
export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/product/new')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <p className="text-text3">로딩 중...</p>
    </div>
  )
}
