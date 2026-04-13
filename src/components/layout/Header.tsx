'use client'

import { useState, useEffect } from 'react'

export default function Header() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('pagecraft-theme')
    if (saved === 'light') {
      setIsDark(false)
      document.documentElement.classList.add('light')
    }
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('light', !next)
    localStorage.setItem('pagecraft-theme', next ? 'dark' : 'light')
  }

  return (
    <header className="h-12 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0 z-[100]">
      <div className="flex items-center gap-4">
        <span className="font-serif text-[15px] text-accent tracking-[0.5px]">
          PageCraft Pro
        </span>
        <span className="text-[10px] text-accent2 bg-accent-dim border border-border2 px-[6px] py-[2px] rounded">
          v2.0
        </span>
        <span className="text-[10px] text-text3 border border-border px-[8px] py-[2px] rounded">
          패션 · 의류 · 잡화
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          className="flex items-center gap-2 text-[11px] text-text2 hover:text-text cursor-pointer transition-colors duration-200"
          onClick={toggle}
        >
          <div className={`w-9 h-5 rounded-[10px] relative border transition-colors duration-200 ${isDark ? 'bg-surface3 border-border2' : 'bg-accent border-accent'}`}>
            <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-200 ${isDark ? 'left-[2px]' : 'translate-x-4'}`} />
          </div>
          {isDark ? '🌙 다크' : '☀️ 라이트'}
        </button>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green" />
          <span className="text-[10px] text-text3 font-mono">Ready</span>
        </div>
      </div>
    </header>
  )
}
