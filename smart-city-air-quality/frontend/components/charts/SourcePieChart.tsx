'use client'

import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { cn } from '@/lib/utils'

interface SourcePieChartProps {
  data: { name: string; value: number; color: string }[]
  className?: string
  height?: number
  innerRadius?: number
  outerRadius?: number
}

export function SourcePieChart({ data, className, height = 300, innerRadius = 60, outerRadius = 100 }: SourcePieChartProps) {
  return (
    <motion.div
      className={cn('glass rounded-xl p-4', className)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            dataKey="value"
            animationBegin={200}
            animationDuration={1500}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.05)" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15,31,61,0.9)',
              border: '1px solid rgba(0,245,160,0.18)',
              borderRadius: '8px',
              backdropFilter: 'blur(16px)',
              color: '#E6F1FF',
            }}
            formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span style={{ color: '#E6F1FF' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
