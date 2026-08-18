import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { twMerge } from 'tailwind-merge'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-slate-950 text-white hover:bg-slate-800',
        secondary: 'bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50',
        outline: 'bg-transparent text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50',
        ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
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
