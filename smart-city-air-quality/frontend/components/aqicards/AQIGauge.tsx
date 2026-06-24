'use client'

import { motion } from 'framer-motion'
import { aqiColor, aqiCategory } from '@/lib/utils'

interface AQIGaugeProps {
  value: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  animated?: boolean
}

export function AQIGauge({ value, size = 200, strokeWidth = 12, showLabel = true, animated = true }: AQIGaugeProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const maxAQI = 500
  const progress = Math.min(value / maxAQI, 1)
  const offset = circumference * (1 - progress)
  const color = aqiColor(value)
  const category = aqiCategory(value)

  const arcColor = (() => {
    if (value <= 50) return '#00E400'
    if (value <= 100) return '#FFFF00'
    if (value <= 150) return '#FF7E00'
    if (value <= 200) return '#FF0000'
    if (value <= 300) return '#8F3F97'
    return '#7E0023'
  })()

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={`gauge-grad-${value}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00E400" />
            <stop offset="20%" stopColor="#FFFF00" />
            <stop offset="40%" stopColor="#FF7E00" />
            <stop offset="60%" stopColor="#FF0000" />
            <stop offset="80%" stopColor="#8F3F97" />
            <stop offset="100%" stopColor="#7E0023" />
          </linearGradient>
          <filter id={`gauge-glow-${value}`}>
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(15,31,61,0.6)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={arcColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animated ? { strokeDashoffset: circumference } : undefined}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          filter={`url(#gauge-glow-${value})`}
          className="aqi-gauge-ring"
          style={{ filter: `drop-shadow(0 0 8px ${arcColor}40)` }}
        />
        {[0.2, 0.4, 0.6, 0.8, 1].map((tick) => {
          const angle = tick * 360 - 90
          const rad = (angle * Math.PI) / 180
          const x1 = size / 2 + (radius - strokeWidth / 2 - 4) * Math.cos(rad)
          const y1 = size / 2 + (radius - strokeWidth / 2 - 4) * Math.sin(rad)
          const x2 = size / 2 + (radius + strokeWidth / 2 + 4) * Math.cos(rad)
          const y2 = size / 2 + (radius + strokeWidth / 2 + 4) * Math.sin(rad)
          return (
            <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
          )
        })}
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-display font-bold tracking-tight"
            style={{ fontSize: size * 0.2, color }}
            initial={animated ? { opacity: 0, scale: 0.5 } : undefined}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {Math.round(value)}
          </motion.span>
          <span className="text-xs text-text-secondary mt-0.5 font-medium">{category}</span>
        </div>
      )}
    </div>
  )
}
