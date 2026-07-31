import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-28 w-full rounded-2xl border bg-input px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/40',
        className,
      )}
      {...props}
    />
  )
}
