'use client'

import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: 'neon' | 'cyan' | 'purple' | 'warning' | 'danger' | 'none'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow = 'none', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass rounded-xl p-5 card-hover',
          glow === 'neon' && 'neon-glow',
          glow === 'cyan' && 'neon-glow-cyan',
          glow === 'purple' && 'neon-glow-purple',
          glow === 'warning' && 'neon-glow-warning',
          glow === 'danger' && 'neon-glow-danger',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'

export { Card }
