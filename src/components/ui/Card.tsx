import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-surface2 rounded-[10px] border border-border overflow-hidden ${className}`}
    >
      {children}
    </div>
  )
}
