'use client'

import { forwardRef, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={id}
            ref={ref}
            className={cn(
              'flex h-10 w-full rounded-lg border border-neon-primary/20 bg-bg-secondary/50 px-3 py-2 text-sm text-text-primary backdrop-blur-sm transition-all duration-300 focus:border-neon-primary focus:shadow-neon-sm focus:outline-none appearance-none cursor-pointer',
              error && 'border-neon-danger',
              className
            )}
            {...props}
          >
            {placeholder && <option value="" className="bg-bg-secondary">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-bg-secondary text-text-primary">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <svg className="h-4 w-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="text-xs text-neon-danger">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
