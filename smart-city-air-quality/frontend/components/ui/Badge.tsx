'use client'

import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30',
        good: 'bg-aqi-good/20 text-aqi-good border border-aqi-good/30',
        moderate: 'bg-aqi-moderate/20 text-aqi-moderate border border-aqi-moderate/30',
        unhealthy_sensitive: 'bg-aqi-unhealthy-sensitive/20 text-aqi-unhealthy-sensitive border border-aqi-unhealthy-sensitive/30',
        unhealthy: 'bg-aqi-unhealthy/20 text-aqi-unhealthy border border-aqi-unhealthy/30',
        very_unhealthy: 'bg-aqi-very-unhealthy/20 text-aqi-very-unhealthy border border-aqi-very-unhealthy/30',
        hazardous: 'bg-aqi-hazardous/20 text-aqi-hazardous border border-aqi-hazardous/30',
        outline: 'border border-text-secondary/30 text-text-secondary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => {
  return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
})
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
