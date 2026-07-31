import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:opacity-95',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/85',
        outline: 'border bg-card text-card-foreground hover:bg-muted/40',
        ghost: 'text-foreground hover:bg-muted/70',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 rounded-xl px-3 text-xs',
        lg: 'h-12 rounded-2xl px-5',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({ className, size, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ className, size, variant }))} {...props} />
}
