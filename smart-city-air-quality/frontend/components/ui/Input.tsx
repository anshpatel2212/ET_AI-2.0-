'use client'

import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm text-text-secondary">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-lg border border-neon-primary/20 bg-bg-secondary/50 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 backdrop-blur-sm transition-all duration-300 focus:border-neon-primary focus:shadow-neon-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-neon-danger focus:border-neon-danger focus:shadow-neon-danger',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-neon-danger">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
