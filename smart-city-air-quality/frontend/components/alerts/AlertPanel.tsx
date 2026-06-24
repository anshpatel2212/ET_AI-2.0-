'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCard } from './AlertCard'
import { cn } from '@/lib/utils'
import { Bell, BellOff, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface AlertPanelProps {
  alerts: any[]
  className?: string
  onAcknowledge?: (id: string) => void
  onDispatch?: (id: string) => void
}

export function AlertPanel({ alerts, className, onAcknowledge, onDispatch }: AlertPanelProps) {
  const [filter, setFilter] = useState<string>('all')
  const [showAll, setShowAll] = useState(false)

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter)
  const displayed = showAll ? filtered : filtered.slice(0, 3)
  const activeCount = alerts.filter((a) => a.status === 'active').length

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeCount > 0 ? (
            <Bell className="h-5 w-5 text-neon-danger animate-pulse" />
          ) : (
            <BellOff className="h-5 w-5 text-text-secondary" />
          )}
          <h3 className="text-lg font-display font-semibold text-text-primary">
            Active Alerts
            {activeCount > 0 && <span className="text-neon-danger text-sm ml-2">({activeCount})</span>}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {['all', 'red', 'orange', 'yellow'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                filter === s
                  ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              )}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {displayed.length === 0 ? (
          <motion.div
            className="glass rounded-xl p-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <BellOff className="h-8 w-8 text-text-secondary mx-auto mb-2" />
            <p className="text-text-secondary">No active alerts</p>
          </motion.div>
        ) : (
          displayed.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={onAcknowledge}
              onDispatch={onDispatch}
            />
          ))
        )}
      </AnimatePresence>

      {filtered.length > 3 && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show less' : `Show all ${filtered.length} alerts`}
        </Button>
      )}
    </div>
  )
}
