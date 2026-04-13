'use client'

import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function Input({
  label,
  className = '',
  id,
  ...props
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[11px] font-medium text-text2 flex items-center gap-[5px]">
          <span className="w-[5px] h-[5px] rounded-full bg-accent opacity-70" />
          {label}
        </label>
      )}
      <input
        id={id}
        className={`
          w-full px-[11px] py-2 rounded-lg
          bg-surface2 border border-border
          text-[12.5px] text-text font-sans placeholder:text-text3
          focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-dim)]
          transition-[border-color,box-shadow] duration-150
          ${className}
        `}
        {...props}
      />
    </div>
  )
}
