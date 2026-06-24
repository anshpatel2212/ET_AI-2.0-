'use client'

import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn } from '@/lib/utils'

interface AQILineChartProps {
  data: any[]
  pollutants?: string[]
  className?: string
  height?: number
}

const POLLUTANT_CONFIG: Record<string, { color: string; name: string }> = {
  aqi: { color: '#00F5A0', name: 'AQI' },
  pm25: { color: '#00D4FF', name: 'PM2.5' },
  pm10: { color: '#7B61FF', name: 'PM10' },
  no2: { color: '#FFB800', name: 'NO2' },
  so2: { color: '#FF3D71', name: 'SO2' },
  co: { color: '#FF6B6B', name: 'CO' },
  o3: { color: '#FF8C42', name: 'O3' },
}

export function AQILineChart({ data, pollutants = ['aqi'], className, height = 300 }: AQILineChartProps) {
  return (
    <motion.div
      className={cn('glass rounded-xl p-4', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {pollutants.map((p) => (
              <linearGradient key={p} id={`gradient-${p}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={POLLUTANT_CONFIG[p]?.color || '#00F5A0'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={POLLUTANT_CONFIG[p]?.color || '#00F5A0'} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="hour"
            tick={{ fill: '#8892B0', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickFormatter={(v) => {
              const d = new Date(v)
              return `${d.getHours().toString().padStart(2, '0')}:00`
            }}
          />
          <YAxis tick={{ fill: '#8892B0', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15,31,61,0.9)',
              border: '1px solid rgba(0,245,160,0.18)',
              borderRadius: '8px',
              backdropFilter: 'blur(16px)',
              color: '#E6F1FF',
            }}
            labelFormatter={(v) => new Date(v).toLocaleString('en-IN')}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#8892B0' }}
            formatter={(value) => <span style={{ color: '#E6F1FF' }}>{POLLUTANT_CONFIG[value]?.name || value}</span>}
          />
          {pollutants.map((p) => (
            <Area
              key={p}
              type="monotone"
              dataKey={p}
              stroke={POLLUTANT_CONFIG[p]?.color || '#00F5A0'}
              fill={`url(#gradient-${p})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: POLLUTANT_CONFIG[p]?.color || '#00F5A0', strokeWidth: 2, stroke: '#050B1A' }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
