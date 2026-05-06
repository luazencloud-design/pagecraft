import type { Metadata } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import ToastContainer from '@/components/ui/Toast'
import AuthProvider from '@/components/auth/AuthProvider'

export const metadata: Metadata = {
  title: 'PageCraft — AI 상세페이지 자동 생성',
  description: '쿠팡 셀러를 위한 AI 상품 등록 자동화 도구',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* 기본 UI + 큐텐 템플릿: 두툼한 sans-serif (Pretendard / Noto Sans JP)
            crossOrigin="anonymous" 필수 — 다운로드 시 html-to-image가 cssRules 읽도록. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&family=DM+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500;700;800;900&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-bg text-text antialiased">
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function() {
            var saved = localStorage.getItem('pagecraft-theme');
            if (saved === 'light' || (!saved && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('light');
            }
          })();
        `}</Script>
        <AuthProvider>
          {children}
          <ToastContainer />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
