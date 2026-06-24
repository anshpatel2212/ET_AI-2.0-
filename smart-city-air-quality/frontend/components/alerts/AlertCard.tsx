'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Clock, MapPin, Bell, BellOff } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface AlertCardProps {
  alert: {
    id: string
    severity: string
    title: string
    message: string
    timestamp: string
    area: string
    status: string
  }
  onAcknowledge?: (id: string) => void
  onDispatch?: (id: string) => void
}

const severityConfig: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
  red: { icon: AlertTriangle, color: 'text-neon-danger', bg: 'bg-neon-danger/10', border: 'border-neon-danger', label: 'Critical' },
  orange: { icon: AlertCircle, color: 'text-neon-warning', bg: 'bg-neon-warning/10', border: 'border-neon-warning', label: 'Severe' },
  yellow: { icon: Info, color: 'text-neon-warning', bg: 'bg-neon-warning/5', border: 'border-neon-warning/50', label: 'Moderate' },
  green: { icon: CheckCircle2, color: 'text-aqi-good', bg: 'bg-aqi-good/5', border: 'border-aqi-good', label: 'Resolved' },
}

export function AlertCard({ alert, onAcknowledge, onDispatch }: AlertCardProps) {
  const config = severityConfig[alert.severity] || severityConfig.yellow
  const Icon = config.icon
  const isCritical = alert.severity === 'red'

  return (
    <motion.div
      className={cn(
        'glass rounded-xl p-4 border-l-4 transition-all duration-300',
        config.border,
        config.bg,
        isCritical && 'animate-pulse-glow'
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      layout
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg shrink-0', config.bg)}>
          <Icon className={cn('h-5 w-5', config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-text-primary">{alert.title}</h4>
            <Badge variant={alert.severity === 'red' ? 'hazardous' : alert.severity === 'orange' ? 'very_unhealthy' : 'unhealthy_sensitive'}>
              {config.label}
            </Badge>
          </div>
          <p className="text-sm text-text-secondary mb-2">{alert.message}</p>
          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {alert.area}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {new Date(alert.timestamp).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {onAcknowledge && (
            <Button variant="neon" size="sm" onClick={() => onAcknowledge(alert.id)}>
              <Bell className="h-3.5 w-3.5" /> Acknowledge
            </Button>
          )}
          {onDispatch && isCritical && (
            <Button variant="destructive" size="sm" onClick={() => onDispatch(alert.id)}>
              Dispatch
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
