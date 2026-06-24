'use client'

import { motion } from 'framer-motion'
import { RadialBarChart as RechartsRadialBar, RadialBar, Legend, ResponsiveContainer, Tooltip } from 'recharts'
import { cn } from '@/lib/utils'

interface RadialBarChartProps {
  data: { name: string; value: number; fill: string }[]
  className?: string
  height?: number
}

export function RadialBarChartComponent({ data, className, height = 300 }: RadialBarChartProps) {
  return (
    <motion.div
      className={cn('glass rounded-xl p-4', className)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadialBar cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={20} data={data} startAngle={180} endAngle={0}>
          <RadialBar
            label={{ fill: '#E6F1FF', fontSize: 12, position: 'insideStart' }}
            background={{ fill: 'rgba(15,31,61,0.3)' }}
            dataKey="value"
            cornerRadius={10}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15,31,61,0.9)',
              border: '1px solid rgba(0,245,160,0.18)',
              borderRadius: '8px',
              backdropFilter: 'blur(16px)',
              color: '#E6F1FF',
            }}
            formatter={(value: number, name: string) => [`${value}`, name]}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, color: '#8892B0' }}
            formatter={(value) => <span style={{ color: '#E6F1FF' }}>{value}</span>}
          />
        </RechartsRadialBar>
      </ResponsiveContainer>
    </motion.div>
  )
}
