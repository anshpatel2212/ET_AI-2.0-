'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { FadeIn } from '@/components/motion/FadeIn'
import { getStations, getActiveAlerts, getInterventions } from '@/lib/api'
import type { StationInfo, Alert, InterventionsResponse } from '@/lib/api'
import { Command, MapPin, Users, AlertTriangle, Target, FileText, CheckCircle2, Clock, Shield, TrendingUp, List, Loader2, AlertCircle } from 'lucide-react'

const RESOURCE_DEPLOYMENT = [
  { resource: 'Water Cannons', deployed: 4, available: 6, total: 10 },
  { resource: 'Air Purifiers', deployed: 8, available: 4, total: 12 },
  { resource: 'Patrol Units', deployed: 15, available: 10, total: 25 },
  { resource: 'Medical Camps', deployed: 3, available: 2, total: 5 },
  { resource: 'Monitoring Drones', deployed: 5, available: 3, total: 8 },
]

function getSeverity(aqi: number): string {
  if (aqi <= 50) return 'good'
  if (aqi <= 100) return 'moderate'
  if (aqi <= 150) return 'unhealthy_sensitive'
  if (aqi <= 200) return 'unhealthy'
  if (aqi <= 300) return 'very_unhealthy'
  return 'hazardous'
}

const severityColors: Record<string, string> = {
  hazardous: 'bg-[#7E0023] text-white',
  very_unhealthy: 'bg-[#8F3F97] text-white',
  unhealthy: 'bg-[#FF0000] text-white',
  unhealthy_sensitive: 'bg-[#FF7E00] text-white',
  moderate: 'bg-[#FFFF00] text-black',
  good: 'bg-[#00E400] text-black',
}

export default function CommandPage() {
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [stations, setStations] = useState<StationInfo[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [interventions, setInterventions] = useState<InterventionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      const [stationsResult, alertsResult, interventionsResult] = await Promise.all([
        getStations(),
        getActiveAlerts(),
        getInterventions(),
      ])
      if (stationsResult.data) {
        setStations(stationsResult.data)
      }
      if (alertsResult.data) {
        setAlerts(alertsResult.data)
      }
      if (interventionsResult.data) {
        setInterventions(interventionsResult.data)
      }
      if (stationsResult.error) {
        setError(stationsResult.error)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const topAreas = stations
    .filter(s => s.aqi !== undefined)
    .sort((a, b) => (b.aqi ?? 0) - (a.aqi ?? 0))
    .slice(0, 10)
    .map((s, i) => {
      const aqi = s.aqi ?? 0
      const severity = getSeverity(aqi)
      const actions: Record<string, string> = {
        hazardous: 'Activate Emergency Protocol - Level 3',
        very_unhealthy: 'Issue health advisory + Traffic diversion',
        unhealthy: 'Restrict heavy vehicles + Monitor hotspots',
        unhealthy_sensitive: 'Issue advisory for sensitive groups',
        moderate: 'Routine monitoring',
        good: 'Maintain current status',
      }
      const resources: Record<string, string[]> = {
        hazardous: ['2 Water cannons', '3 Air purifiers', 'Medical camp'],
        very_unhealthy: ['1 Water cannon', '5 patrol units'],
        unhealthy: ['Monitoring team', 'Signage deployment'],
        unhealthy_sensitive: ['Health checkup camp'],
        moderate: [],
        good: [],
      }
      return {
        rank: i + 1,
        name: s.stationName,
        aqi,
        population: Math.round(100000 + Math.random() * 200000),
        severity,
        action: actions[severity] || 'Monitor situation',
        resources: resources[severity] || [],
      }
    })

  const totalAffected = topAreas.reduce((sum, a) => sum + a.population, 0)
  const criticalCount = topAreas.filter(a => a.severity === 'hazardous' || a.severity === 'very_unhealthy').length
  const activeInterventionsCount = interventions?.queue?.length ?? 0
  const resourcesDeployed = RESOURCE_DEPLOYMENT.reduce((s, r) => s + r.deployed, 0)
  const interventionEffectiveness = interventions?.effectiveness ?? 76

  const auditLog = alerts
    .slice(0, 5)
    .map(a => ({
      action: `${a.severity.toUpperCase()}: ${a.title}`,
      timestamp: a.timestamp,
      user: 'System',
    }))

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <FadeIn direction="up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Command className="h-6 w-6 text-neon-primary" />
            <h1 className="text-2xl font-display font-bold text-text-primary">Command Center</h1>
          </div>
          <Badge variant="hazardous" className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" /> Admin Access
          </Badge>
        </div>
      </FadeIn>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-neon-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-10 w-10 text-neon-danger mb-3" />
          <p className="text-text-secondary">{error}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Population Affected', value: `${(totalAffected / 100000).toFixed(1)}L`, icon: Users, color: '#FF3D71' },
              { label: 'Critical Areas', value: criticalCount.toString(), icon: AlertTriangle, color: '#FFB800' },
              { label: 'Active Interventions', value: activeInterventionsCount.toString(), icon: Target, color: '#00D4FF' },
              { label: 'Resources Deployed', value: resourcesDeployed.toString(), icon: Shield, color: '#00F5A0' },
            ].map((stat) => (
              <FadeIn key={stat.label} direction="up">
                <Card className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${stat.color}15` }}>
                    <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-text-secondary uppercase">{stat.label}</p>
                    <p className="text-xl font-display font-bold text-text-primary">{stat.value}</p>
                  </div>
                </Card>
              </FadeIn>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FadeIn direction="left" className="lg:col-span-2">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-neon-primary" /> Top Polluted Areas
                </h3>
                {topAreas.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-8">No station data available.</p>
                ) : (
                  <div className="space-y-1">
                    {topAreas.map((area) => (
                      <motion.div
                        key={area.rank}
                        className={`flex items-center gap-3 glass rounded-lg p-2.5 cursor-pointer transition-all ${
                          selectedArea === area.name ? 'border border-neon-primary/40 shadow-neon-sm' : ''
                        }`}
                        onClick={() => setSelectedArea(selectedArea === area.name ? null : area.name)}
                        whileHover={{ scale: 1.01 }}
                      >
                        <span className="w-5 h-5 rounded-full bg-bg-tertiary flex items-center justify-center text-[10px] font-bold text-text-secondary shrink-0">
                          {area.rank}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-text-primary font-medium">{area.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${severityColors[area.severity]}`}>
                              {area.aqi}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                            <Users className="h-3 w-3" /> {(area.population / 1000).toFixed(0)}K affected
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-lg font-display font-bold" style={{
                            color: area.aqi > 200 ? '#7E0023' : area.aqi > 150 ? '#FF0000' : area.aqi > 100 ? '#FF7E00' : '#FFFF00',
                          }}>
                            {area.aqi}
                          </span>
                        </div>

                        {selectedArea === area.name && (
                          <motion.div
                            className="col-span-full mt-2 p-3 bg-bg-tertiary/50 rounded-lg"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                          >
                            <p className="text-xs text-neon-primary font-medium mb-1">Recommended Action:</p>
                            <p className="text-xs text-text-primary mb-2">{area.action}</p>
                            {area.resources.length > 0 && (
                              <>
                                <p className="text-xs text-neon-secondary font-medium mb-1">Resources:</p>
                                <div className="flex flex-wrap gap-1">
                                  {area.resources.map((r) => (
                                    <span key={r} className="text-[9px] px-2 py-0.5 rounded border border-neon-primary/20 text-text-secondary">{r}</span>
                                  ))}
                                </div>
                              </>
                            )}
                            <Button variant="neon" size="sm" className="mt-2">
                              <Target className="h-3 w-3" /> Activate Plan
                            </Button>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </FadeIn>

            <FadeIn direction="right">
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-neon-primary" /> Pollution Reduction Score
                  </h3>
                  <div className="text-center mb-3">
                    <p className="text-4xl font-display font-bold text-neon-primary">{interventionEffectiveness}%</p>
                    <p className="text-xs text-text-secondary">Target: 80% by Dec 2026</p>
                  </div>
                  <Progress value={interventionEffectiveness} color="neon" showLabel />
                </Card>

                <Card className="p-4">
                  <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-neon-primary" /> Resource Deployment
                  </h3>
                  <div className="space-y-2">
                    {RESOURCE_DEPLOYMENT.map((r) => (
                      <div key={r.resource}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-text-primary">{r.resource}</span>
                          <span className="text-text-secondary">{r.deployed}/{r.total}</span>
                        </div>
                        <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-neon-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${(r.deployed / r.total) * 100}%` }}
                            transition={{ duration: 1 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-neon-primary" /> Audit Log
                  </h3>
                  {auditLog.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-4">No recent alerts.</p>
                  ) : (
                    <div className="space-y-2">
                      {auditLog.map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <Clock className="h-3 w-3 text-text-secondary mt-0.5 shrink-0" />
                          <div>
                            <p className="text-text-primary">{entry.action}</p>
                            <p className="text-text-secondary">{new Date(entry.timestamp).toLocaleTimeString('en-IN')} · {entry.user}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-4">
                  <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                    <List className="h-4 w-4 text-neon-primary" /> Intervention Effectiveness
                  </h3>
                  <div className="text-center">
                    <p className="text-3xl font-display font-bold text-neon-primary">{interventionEffectiveness}%</p>
                    <p className="text-xs text-text-secondary">
                      {interventions?.total_reduction ? `Reduction: ${interventions.total_reduction}` : 'Based on active interventions'}
                    </p>
                  </div>
                </Card>
              </div>
            </FadeIn>
          </div>
        </>
      )}
    </div>
  )
}
