'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertPanel } from '@/components/alerts/AlertPanel'
import { AlertHistory } from '@/components/alerts/AlertHistory'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FadeIn } from '@/components/motion/FadeIn'
import { Tabs } from '@/components/ui/Tabs'
import { getActiveAlerts } from '@/lib/api'
import type { Alert } from '@/lib/api'
import { AlertTriangle, Bell, BellOff, Settings, Smartphone, Mail, MessageSquare, RefreshCw, AlertCircle } from 'lucide-react'

const ALERT_RULES = [
  { pollutant: 'PM2.5', threshold: '60 µg/m³', severity: 'orange', enabled: true },
  { pollutant: 'PM10', threshold: '100 µg/m³', severity: 'orange', enabled: true },
  { pollutant: 'AQI', threshold: '200', severity: 'red', enabled: true },
  { pollutant: 'O3', threshold: '80 ppb', severity: 'yellow', enabled: false },
]

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('active')
  const [deliveryChannel, setDeliveryChannel] = useState('all')
  const [lastFetched, setLastFetched] = useState<string | null>(null)

  useEffect(() => {
    fetchAlerts()
  }, [])

  async function fetchAlerts() {
    setLoading(true)
    setError(null)
    const result = await getActiveAlerts()
    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setAlerts(result.data)
      setLastFetched(new Date().toISOString())
    }
    setLoading(false)
  }

  const activeAlerts = alerts.filter((a) => a.status === 'active')
  const criticalCount = activeAlerts.filter((a) => a.severity === 'red').length
  const resolvedCount = alerts.filter((a) => a.status === 'resolved' || a.severity === 'green').length

  const todayCount = alerts.filter((a) => {
    const alertDate = new Date(a.timestamp).toDateString()
    return alertDate === new Date().toDateString()
  }).length

  function LoadingSkeleton() {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass rounded-xl p-8 text-center">
          <RefreshCw className="h-8 w-8 text-neon-primary mx-auto animate-spin mb-3" />
          <p className="text-text-secondary">Loading alerts...</p>
        </div>
      </div>
    )
  }

  function ErrorState() {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass rounded-xl p-8 text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-neon-danger mx-auto mb-3" />
          <p className="text-text-primary font-medium mb-2">Unable to load alerts</p>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
          <button
            onClick={fetchAlerts}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-neon-primary/20 text-neon-primary border border-neon-primary/30 hover:bg-neon-primary/30 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <FadeIn direction="up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-neon-primary" />
            <h1 className="text-2xl font-display font-bold text-text-primary">Smart Alerts</h1>
          </div>
          <div className="flex items-center gap-2">
            {lastFetched && (
              <span className="text-[10px] text-text-secondary mr-2">
                Fetched {new Date(lastFetched).toLocaleTimeString('en-IN')}
              </span>
            )}
            <Badge variant={activeAlerts.length > 0 ? 'hazardous' : 'good'} className="flex items-center gap-1">
              <Bell className="h-3.5 w-3.5 animate-pulse" /> {loading ? '...' : activeAlerts.length} Active
            </Badge>
          </div>
        </div>
      </FadeIn>

      {loading ? (
        <LoadingSkeleton />
      ) : error && alerts.length === 0 ? (
        <ErrorState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FadeIn direction="left" className="lg:col-span-2">
            <div className="space-y-4">
              <div className="flex gap-2">
                {['active', 'history', 'rules'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                        : 'text-text-secondary hover:text-text-primary border border-transparent'
                    }`}
                  >
                    {tab === 'active' ? 'Active Alerts' : tab === 'history' ? 'Alert History' : 'Alert Rules'}
                  </button>
                ))}
              </div>

              {activeTab === 'active' && (
                <AlertPanel
                  alerts={activeAlerts}
                  onAcknowledge={(id) => console.log('Acknowledged:', id)}
                  onDispatch={(id) => console.log('Dispatched:', id)}
                />
              )}

              {activeTab === 'history' && <AlertHistory />}

              {activeTab === 'rules' && (
                <div className="space-y-3">
                  {ALERT_RULES.map((rule) => (
                    <Card key={rule.pollutant} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${rule.severity === 'red' ? 'bg-neon-danger' : rule.severity === 'orange' ? 'bg-neon-warning' : 'bg-neon-warning/60'}`} />
                        <div>
                          <p className="text-sm text-text-primary font-medium">{rule.pollutant} &gt; {rule.threshold}</p>
                          <p className="text-xs text-text-secondary">Severity: {rule.severity}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={rule.enabled} className="sr-only peer" />
                        <div className="w-9 h-5 bg-bg-tertiary rounded-full peer peer-checked:bg-neon-primary/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neon-primary after:rounded-full after:h-4 after:w-4 after:transition-all" />
                      </label>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </FadeIn>

          <FadeIn direction="right">
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-neon-primary" /> Delivery Channels
                </h3>
                <div className="space-y-2">
                  {[
                    { id: 'push', icon: Bell, label: 'Push Notification', color: '#00F5A0' },
                    { id: 'sms', icon: Smartphone, label: 'SMS Alert', color: '#00D4FF' },
                    { id: 'email', icon: Mail, label: 'Email', color: '#7B61FF' },
                    { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp', color: '#00E400' },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setDeliveryChannel(ch.id)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all ${
                        deliveryChannel === ch.id
                          ? 'bg-neon-primary/10 text-neon-primary border border-neon-primary/30'
                          : 'text-text-secondary hover:text-text-primary border border-transparent'
                      }`}
                    >
                      <ch.icon className="h-4 w-4" style={{ color: ch.color }} />
                      {ch.label}
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">Alert Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Total Today</span>
                    <span className="text-text-primary font-mono">{todayCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Critical</span>
                    <span className="text-neon-danger font-mono">{criticalCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Resolved</span>
                    <span className="text-aqi-good font-mono">{resolvedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Data Source</span>
                    <span className="text-text-primary font-mono">
                      {lastFetched ? 'API' : 'N/A'}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">Recommendations</h3>
                <div className="space-y-2">
                  {activeAlerts.length > 0 ? (
                    activeAlerts.slice(0, 3).map((alert) => (
                      <div key={alert.id} className="glass rounded-lg p-3 text-xs">
                        <p className="text-neon-primary font-medium mb-1">{alert.area}</p>
                        <p className="text-text-secondary">{alert.message}</p>
                        {alert.recommendations && alert.recommendations.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {alert.recommendations.map((rec, i) => (
                              <li key={i} className="text-text-secondary">- {rec}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="glass rounded-lg p-3 text-xs text-text-secondary text-center">
                      No active alerts to show recommendations
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  )
}
