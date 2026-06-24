'use client'

import { motion } from 'framer-motion'
import { cn, aqiColor } from '@/lib/utils'
import { MapPin, Activity, Circle } from 'lucide-react'
import { SparklineChart } from '@/components/charts/SparklineChart'
import { Badge } from '@/components/ui/Badge'

interface StationCardProps {
  station: {
    id: string
    name: string
    aqi: number
    status: string
    lat?: number
    lng?: number
  }
  history?: number[]
  onClick?: () => void
  className?: string
}

export function StationCard({ station, history, onClick, className }: StationCardProps) {
  const color = aqiColor(station.aqi)

  return (
    <motion.div
      className={cn('glass rounded-xl p-4 card-hover cursor-pointer', className)}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-neon-primary" />
          <span className="text-sm font-medium text-text-primary">{station.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle
            className={cn('h-2.5 w-2.5', station.status === 'active' ? 'text-aqi-good' : 'text-neon-danger')}
            fill={station.status === 'active' ? '#00E400' : '#FF3D71'}
          />
          <span className="text-[10px] text-text-secondary uppercase">{station.status}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="flex flex-col">
          <span className="text-3xl font-display font-bold" style={{ color }}>
            {Math.round(station.aqi)}
          </span>
          <span className="text-[10px] text-text-secondary">AQI</span>
        </div>
        {history && history.length > 0 && (
          <div className="flex-1 h-14">
            <SparklineChart data={history} color={color} height={56} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {[50, 100, 150, 200, 300].map((level) => (
            <div
              key={level}
              className={cn(
                'h-1.5 w-full rounded-full transition-all',
                station.aqi >= level ? 'opacity-100' : 'opacity-20'
              )}
              style={{ backgroundColor: aqiColor(level) }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          <Activity className="h-3 w-3" />
          <span>{station.lat?.toFixed(4)}, {station.lng?.toFixed(4)}</span>
        </div>
      </div>
    </motion.div>
  )
}
