'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { aqiColor, aqiCategory } from '@/lib/utils'
import { SparklineChart } from '@/components/charts/SparklineChart'
import { MapPin } from 'lucide-react'

interface AQIWidgetProps {
  aqi: number
  name: string
  history?: number[]
  onClick?: () => void
}

export function AQIWidget({ aqi, name, history, onClick }: AQIWidgetProps) {
  const [timeStr, setTimeStr] = useState('')
  const color = aqiColor(aqi)
  const category = aqiCategory(aqi)

  useEffect(() => { setTimeStr(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })) }, [])

  return (
    <motion.div
      className="glass rounded-xl p-4 card-hover cursor-pointer"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-neon-primary" />
          <span className="text-sm text-text-primary font-medium truncate">{name}</span>
        </div>
        <span className="text-[10px] text-text-secondary uppercase tracking-wider">{category}</span>
      </div>
      <div className="flex items-end gap-3">
        <div className="flex flex-col">
          <motion.span
            className="text-3xl font-display font-bold leading-none"
            style={{ color }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {Math.round(aqi)}
          </motion.span>
          <span className="text-[10px] text-text-secondary mt-1">AQI</span>
        </div>
        {history && history.length > 0 && (
          <div className="flex-1 h-12">
            <SparklineChart data={history} color={color} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          {[...Array(5)].map((_, i) => {
            const level = (i + 1) * 100
            return (
              <div
                key={i}
                className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                  aqi >= level - 100 ? 'opacity-100' : 'opacity-20'
                }`}
                style={{ backgroundColor: aqiColor(level) }}
              />
            )
          })}
        </div>
        <span className="text-xs text-text-secondary font-mono">
          {timeStr}
        </span>
      </div>
    </motion.div>
  )
}
