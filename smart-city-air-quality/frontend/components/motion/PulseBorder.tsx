'use client'

import { motion } from 'framer-motion'

interface PulseBorderProps {
  children: React.ReactNode
  color?: string
  className?: string
  active?: boolean
}

export function PulseBorder({ children, color = '#00F5A0', className, active = true }: PulseBorderProps) {
  return (
    <div className={`relative ${className || ''}`}>
      {active && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{ border: `2px solid ${color}` }}
          animate={{
            opacity: [0.2, 0.6, 0.2],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  )
}
