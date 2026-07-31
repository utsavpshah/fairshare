import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-2xl border bg-input px-4 py-2 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/40',
        className,
      )}
      {...props}
    />
  )
}
