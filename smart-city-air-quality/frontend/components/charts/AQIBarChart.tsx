'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn } from '@/lib/utils'

interface AQIBarChartProps {
  data: any[]
  className?: string
  height?: number
  bars?: { key: string; color: string; name: string }[]
}

export function AQIBarChart({ data, className, height = 300, bars }: AQIBarChartProps) {
  const defaultBars = [
    { key: 'aqi', color: '#00F5A0', name: 'AQI' },
    { key: 'pm25', color: '#00D4FF', name: 'PM2.5' },
    { key: 'pm10', color: '#7B61FF', name: 'PM10' },
  ]

  const chartBars = bars || defaultBars

  return (
    <motion.div
      className={cn('glass rounded-xl p-4', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fill: '#8892B0', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
          <YAxis tick={{ fill: '#8892B0', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15,31,61,0.9)',
              border: '1px solid rgba(0,245,160,0.18)',
              borderRadius: '8px',
              backdropFilter: 'blur(16px)',
              color: '#E6F1FF',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#8892B0' }}
            formatter={(value) => <span style={{ color: '#E6F1FF' }}>{value}</span>}
          />
          {chartBars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              fill={bar.color}
              name={bar.name}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
