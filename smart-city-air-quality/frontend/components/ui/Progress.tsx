'use client'

import { forwardRef } from 'react'
import * as RadixProgress from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  max?: number
  className?: string
  indicatorClassName?: string
  showLabel?: boolean
  color?: 'neon' | 'cyan' | 'purple' | 'warning' | 'danger' | 'good'
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ value, max = 100, className, indicatorClassName, showLabel, color = 'neon' }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    const colorMap = {
      neon: 'bg-gradient-to-r from-neon-primary to-neon-secondary',
      cyan: 'bg-gradient-to-r from-neon-secondary to-neon-primary',
      purple: 'bg-gradient-to-r from-neon-tertiary to-neon-secondary',
      warning: 'bg-gradient-to-r from-neon-warning to-neon-danger',
      danger: 'bg-neon-danger',
      good: 'bg-aqi-good',
    }

    return (
      <div className="flex items-center gap-3">
        <RadixProgress.Root
          ref={ref}
          value={percentage}
          className={cn('relative h-2 w-full overflow-hidden rounded-full bg-bg-tertiary', className)}
        >
          <RadixProgress.Indicator
            className={cn('h-full w-full rounded-full transition-all duration-1000 ease-out', colorMap[color], indicatorClassName)}
            style={{ transform: `translateX(-${100 - percentage}%)` }}
          />
        </RadixProgress.Root>
        {showLabel && (
          <span className="text-xs font-mono text-text-secondary min-w-[3ch] text-right">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    )
  }
)
Progress.displayName = 'Progress'

export { Progress }
