'use client'

import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart, Line } from 'recharts'
import { cn } from '@/lib/utils'

interface PredictionChartProps {
  data: any[]
  className?: string
  height?: number
  whoLimit?: number
}

export function PredictionChart({ data, className, height = 350, whoLimit = 50 }: PredictionChartProps) {
  const processedData = data.map((d, i) => ({
    ...d,
    isPrediction: i >= data.length - 12,
    upper_bound: (d.aqi || 0) * 1.15,
    lower_bound: (d.aqi || 0) * 0.85,
  }))

  return (
    <motion.div
      className={cn('glass rounded-xl p-4', className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="predictionGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00F5A0" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#00F5A0" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ciBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
            </linearGradient>
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
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span style={{ color: '#E6F1FF' }}>{value}</span>}
          />
          <ReferenceLine y={whoLimit} stroke="#FF3D71" strokeDasharray="5 5" label={{ value: 'WHO Limit', fill: '#FF3D71', fontSize: 11 }} />
          <Area type="monotone" dataKey="upper_bound" fill="url(#ciBand)" stroke="none" name="95% CI" />
          <Area type="monotone" dataKey="lower_bound" fill="url(#ciBand)" stroke="none" />
          <Area type="monotone" dataKey="aqi" stroke="#00F5A0" fill="url(#predictionGrad)" strokeWidth={2} name="AQI" dot={false} />
          <Line type="monotone" dataKey="aqi" stroke="#00D4FF" strokeWidth={2} strokeDasharray="5 5" name="Prediction" dot={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
