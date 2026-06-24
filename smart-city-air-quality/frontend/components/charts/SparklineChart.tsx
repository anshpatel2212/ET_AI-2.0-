'use client'

import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface SparklineChartProps {
  data: number[]
  color?: string
  height?: number
}

export function SparklineChart({ data, color = '#00F5A0', height = 50 }: SparklineChartProps) {
  const chartData = data.map((value, index) => ({ index, value }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sparkline-grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill={`url(#sparkline-grad-${color})`}
          strokeWidth={1.5}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
