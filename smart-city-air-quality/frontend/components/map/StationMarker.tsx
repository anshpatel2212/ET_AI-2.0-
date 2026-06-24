'use client'

import { motion } from 'framer-motion'
import { aqiColor } from '@/lib/utils'

interface StationMarkerProps {
  aqi: number
  name: string
  selected?: boolean
  onClick?: () => void
}

export function StationMarker({ aqi, name, selected, onClick }: StationMarkerProps) {
  const color = aqiColor(aqi)
  const size = selected ? 48 : 36
  const pulseSize = selected ? 64 : 48

  return (
    <div className="relative flex items-center justify-center" style={{ width: pulseSize, height: pulseSize }}>
      <motion.div
        className="absolute rounded-full"
        style={{
          width: pulseSize,
          height: pulseSize,
          backgroundColor: `${color}20`,
          border: `2px solid ${color}`,
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0.2, 0.5],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full flex items-center justify-center cursor-pointer z-10"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          boxShadow: `0 0 12px ${color}`,
        }}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
      >
        <span className="text-[10px] font-bold text-white font-mono">{Math.round(aqi)}</span>
      </motion.div>
      {name && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[9px] text-text-primary font-medium bg-bg-primary/80 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(5,11,26,0.8)' }}>
            {name}
          </span>
        </div>
      )}
    </div>
  )
}
