'use client'

import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'
import { AQIGauge } from './AQIGauge'
import { aqiColor, aqiCategory } from '@/lib/utils'
import { Thermometer, Droplets, Wind, Eye, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface WeatherData {
  temperature: number
  humidity: number
  windSpeed: number
  visibility: number
}

interface AQIHeroCardProps {
  aqi: number
  weather?: WeatherData
  change?: number
  location?: string
}

export function AQIHeroCard({ aqi, weather, change = 0, location = 'Ahmedabad' }: AQIHeroCardProps) {
  const [timeStr, setTimeStr] = useState('')
  const springValue = useSpring(0, { stiffness: 50, damping: 20 })
  const displayValue = useTransform(springValue, (v) => Math.round(v))
  const color = aqiColor(aqi)
  const category = aqiCategory(aqi)

  useEffect(() => {
    springValue.set(aqi)
    setTimeStr(new Date().toLocaleTimeString('en-IN'))
  }, [aqi, springValue])

  const ChangeIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus
  const changeColor = change > 0 ? 'text-neon-danger' : change < 0 ? 'text-neon-primary' : 'text-text-secondary'

  const weatherItems = weather ? [
    { icon: Thermometer, label: 'Temperature', value: `${weather.temperature}°C` },
    { icon: Droplets, label: 'Humidity', value: `${weather.humidity}%` },
    { icon: Wind, label: 'Wind', value: `${weather.windSpeed} km/h` },
    { icon: Eye, label: 'Visibility', value: `${weather.visibility} km` },
  ] : []

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-neon-glow opacity-30 rounded-3xl" />
      <div className="relative glass rounded-3xl p-8 md:p-12 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <motion.p
              className="text-text-secondary text-sm md:text-base font-medium tracking-wider uppercase mb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Live AQI · {location}
            </motion.p>
            <motion.h1
              className="font-display font-bold text-7xl md:text-9xl lg:text-[8rem] leading-none tracking-tighter"
              style={{ color }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, type: 'spring' }}
            >
              <motion.span>{displayValue}</motion.span>
            </motion.h1>
            <motion.div
              className="flex items-center gap-3 mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-xl md:text-2xl font-display font-semibold" style={{ color }}>{category}</span>
              <div className={`flex items-center gap-1 text-sm ${changeColor}`}>
                <ChangeIcon className="h-4 w-4" />
                <span>{Math.abs(change).toFixed(1)}%</span>
              </div>
            </motion.div>
            <motion.p
              className="text-text-secondary text-sm mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
               Last updated: {timeStr}
            </motion.p>
          </div>

          <div className="flex flex-col items-center gap-6">
            <AQIGauge value={aqi} size={220} strokeWidth={14} />
            {weatherItems.length > 0 && (
              <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, staggerChildren: 0.1 }}
              >
                {weatherItems.map((item, i) => (
                  <motion.div
                    key={item.label}
                    className="glass rounded-xl p-3 flex flex-col items-center gap-1.5 card-hover"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                  >
                    <item.icon className="h-4 w-4 text-neon-primary" />
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider">{item.label}</span>
                    <span className="text-sm font-semibold font-mono text-text-primary">{item.value}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-neon-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>
    </div>
  )
}
