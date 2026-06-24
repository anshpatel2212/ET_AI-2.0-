'use client'

import { useEffect, useRef } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

interface CounterProps {
  value: number
  duration?: number
  className?: string
  suffix?: string
  prefix?: string
  decimals?: number
  format?: boolean
}

export function Counter({ value, duration = 1.5, className, suffix = '', prefix = '', decimals = 0, format = true }: CounterProps) {
  const springValue = useSpring(0, {
    stiffness: 40,
    damping: 15,
    duration,
  })

  useEffect(() => {
    springValue.set(value)
  }, [value, springValue])

  const displayValue = useTransform(springValue, (v) => {
    const formatted = v.toFixed(decimals)
    return `${prefix}${formatted}${suffix}`
  })

  return (
    <motion.span className={className}>
      {displayValue}
    </motion.span>
  )
}
