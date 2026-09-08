import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] focus-visible:ring-[var(--focus)]',
        secondary: 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--hover-background)] focus-visible:ring-[var(--focus)]',
        outline: 'border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--hover-background)] focus-visible:ring-[var(--focus)]',
        ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--hover-background)] focus-visible:ring-[var(--focus)]',
        destructive: 'bg-rose-600 text-white hover:bg-rose-700'
      },
      size: {
        default: 'h-11 px-5 text-sm font-medium',
        sm: 'h-9 px-4 text-sm',
        lg: 'h-12 px-6 text-base'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={twMerge(buttonVariants({ variant, size }), className)} {...props} />
}
