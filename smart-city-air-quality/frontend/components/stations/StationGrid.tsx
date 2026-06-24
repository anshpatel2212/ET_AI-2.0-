'use client'

import { motion } from 'framer-motion'
import { StationCard } from './StationCard'
import { cn } from '@/lib/utils'
import { StaggerContainer } from '@/components/motion/StaggerContainer'

interface StationGridProps {
  stations: any[]
  onSelect?: (id: string) => void
  className?: string
  columns?: 2 | 3 | 4
}

export function StationGrid({ stations, onSelect, className, columns = 3 }: StationGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <StaggerContainer className={cn('grid gap-4', gridCols[columns], className)}>
      {stations.map((station) => (
        <StationCard
          key={station.id}
          station={station}
          history={Array.from({ length: 24 }, () => Math.round(station.aqi + (Math.random() - 0.5) * 30))}
          onClick={() => onSelect?.(station.id)}
        />
      ))}
    </StaggerContainer>
  )
}
