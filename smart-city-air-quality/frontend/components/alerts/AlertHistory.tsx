'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Search, Calendar, Filter, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { MOCK_ALERTS } from '@/lib/constants'

interface AlertHistoryProps {
  className?: string
}

export function AlertHistory({ className }: AlertHistoryProps) {
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('all')

  const historyData = useMemo(() => {
    const allAlerts = [
      ...MOCK_ALERTS,
      { id: 'alert5', severity: 'green', title: 'Resolved: Bopal', message: 'AQI returned to normal levels.', timestamp: new Date(Date.now() - 86400000).toISOString(), area: 'Bopal', status: 'resolved' },
      { id: 'alert6', severity: 'orange', title: 'Dust Storm Warning', message: 'High particulate matter expected.', timestamp: new Date(Date.now() - 172800000).toISOString(), area: 'Gandhinagar', status: 'resolved' },
      { id: 'alert7', severity: 'yellow', title: 'Traffic Alert: SG Road', message: 'Peak hour congestion increasing AQI.', timestamp: new Date(Date.now() - 259200000).toISOString(), area: 'SG Highway', status: 'resolved' },
    ]

    return allAlerts.filter((a) => {
      if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.area.toLowerCase().includes(search.toLowerCase())) return false
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false
      return true
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [search, severityFilter])

  const severityColors: Record<string, string> = {
    red: 'bg-neon-danger/20 text-neon-danger border-neon-danger/30',
    orange: 'bg-neon-warning/20 text-neon-warning border-neon-warning/30',
    yellow: 'bg-neon-warning/10 text-neon-warning border-neon-warning/20',
    green: 'bg-aqi-good/20 text-aqi-good border-aqi-good/30',
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-neon-primary/20 bg-bg-secondary/50 text-sm text-text-primary placeholder:text-text-secondary/50 backdrop-blur-sm focus:border-neon-primary focus:shadow-neon-sm focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'red', 'orange', 'yellow', 'green'].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                severityFilter === s
                  ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              )}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {historyData.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Filter className="h-8 w-8 text-text-secondary mx-auto mb-2" />
            <p className="text-text-secondary">No alerts match your filters</p>
          </div>
        ) : (
          historyData.map((alert, i) => (
            <motion.div
              key={alert.id}
              className="glass rounded-xl p-3 flex items-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className={cn('w-2 h-2 rounded-full shrink-0', alert.severity === 'red' ? 'bg-neon-danger' : alert.severity === 'orange' ? 'bg-neon-warning' : alert.severity === 'yellow' ? 'bg-neon-warning/60' : 'bg-aqi-good')} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary truncate">{alert.title}</span>
                  <Badge variant={alert.severity === 'green' ? 'good' : alert.severity === 'red' ? 'hazardous' : 'unhealthy'}>
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary truncate">{alert.message}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-text-secondary">{new Date(alert.timestamp).toLocaleDateString('en-IN')}</p>
                <p className="text-[10px] text-text-secondary/60">{new Date(alert.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <Badge variant={alert.status === 'active' ? 'unhealthy' : 'good'}>
                {alert.status}
              </Badge>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
