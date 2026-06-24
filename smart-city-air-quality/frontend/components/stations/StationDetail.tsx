'use client'

import { motion } from 'framer-motion'
import { cn, aqiColor } from '@/lib/utils'
import { AQILineChart } from '@/components/charts/AQILineChart'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { MapPin, Activity, Wind, Thermometer, Droplets, Gauge } from 'lucide-react'
import { MOCK_STATIONS, MOCK_FORECAST } from '@/lib/constants'

interface StationDetailProps {
  stationId: string
  className?: string
}

export function StationDetail({ stationId, className }: StationDetailProps) {
  const station = MOCK_STATIONS.find((s) => s.id === stationId) || MOCK_STATIONS[0]
  const color = aqiColor(station.aqi)

  return (
    <motion.div
      className={cn('space-y-6', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-neon-primary" />
          <div>
            <h2 className="text-xl font-display font-semibold text-text-primary">{station.name}</h2>
            <p className="text-sm text-text-secondary">{station.lat}, {station.lng}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-4xl font-display font-bold" style={{ color }}>{station.aqi}</span>
          <Badge variant={station.aqi > 150 ? 'unhealthy' : station.aqi > 100 ? 'unhealthy_sensitive' : 'moderate'} className="ml-2">
            Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Wind, label: 'PM2.5', value: `${Math.round(30 + Math.random() * 70)} µg/m³`, color: '#00D4FF' },
          { icon: Wind, label: 'PM10', value: `${Math.round(60 + Math.random() * 140)} µg/m³`, color: '#7B61FF' },
          { icon: Thermometer, label: 'Temperature', value: `${32 + Math.round(Math.random() * 8)}°C`, color: '#FFB800' },
          { icon: Droplets, label: 'Humidity', value: `${55 + Math.round(Math.random() * 30)}%`, color: '#00D4FF' },
        ].map((metric) => (
          <Card key={metric.label} className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${metric.color}15` }}>
              <metric.icon className="h-5 w-5" style={{ color: metric.color }} />
            </div>
            <div>
              <p className="text-[10px] text-text-secondary uppercase">{metric.label}</p>
              <p className="text-sm font-mono font-semibold text-text-primary">{metric.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-medium text-text-primary mb-3">24-Hour History</h3>
        <AQILineChart
          data={MOCK_FORECAST}
          pollutants={['aqi', 'pm25', 'pm10']}
          height={250}
        />
      </div>
    </motion.div>
  )
}
