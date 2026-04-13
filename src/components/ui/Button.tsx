'use client'

import { type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-accent text-[#0c0c10] hover:bg-accent2 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(232,201,122,0.3)]',
  secondary: 'bg-surface2 text-text border border-border hover:border-border2',
  ghost: 'bg-transparent text-text2 hover:text-text',
  danger: 'bg-red text-white hover:opacity-90',
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-2.5 py-[3px] text-[11px]',
  md: 'px-3 py-2 text-[12px]',
  lg: 'px-3 py-3 text-[13.5px] font-bold tracking-[0.3px]',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-[10px] font-semibold
        transition-all duration-200 cursor-pointer gap-2
        disabled:bg-surface3 disabled:text-text3 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-[15px] h-[15px] border-2 border-[rgba(12,12,16,0.3)] border-t-[#0c0c10] rounded-full animate-[spin_0.7s_linear_infinite]" />
      )}
      {children}
    </button>
  )
}
