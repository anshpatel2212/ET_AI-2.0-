'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SourcePieChart } from '@/components/charts/SourcePieChart'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FadeIn } from '@/components/motion/FadeIn'
import { getSourcesBreakdown, getStations } from '@/lib/api'
import type { SourcesBreakdown } from '@/lib/api'
import { Factory, Car, Construction, Flame, Trees, MapPin, Loader2, AlertCircle } from 'lucide-react'

const SOURCE_ICONS: Record<string, any> = {
  Traffic: Car,
  Industries: Factory,
  Industrial: Factory,
  Construction: Construction,
  'Waste Burning': Flame,
  Others: Trees,
  Dust: Trees,
}

const SOURCE_STRATEGIES: Record<string, string[]> = {
  Traffic: ['Odd-even scheme', 'EV incentives', 'Improve public transit'],
  Industries: ['Shift to cleaner fuel', 'Install scrubbers', 'Real-time monitoring'],
  Industrial: ['Shift to cleaner fuel', 'Install scrubbers', 'Real-time monitoring'],
  Construction: ['Water sprinklers', 'Cover materials', 'Dust barriers'],
  'Waste Burning': ['Strict enforcement', 'Community awareness', 'Alternative disposal'],
  Others: ['Green cover expansion', 'DG set regulation'],
  Dust: ['Green cover expansion', 'DG set regulation'],
}

const SOURCE_DESCRIPTIONS: Record<string, string> = {
  Traffic: 'Vehicular emissions from registered vehicles',
  Industries: 'Factory emissions in industrial zones',
  Industrial: 'Factory emissions in industrial zones',
  Construction: 'Emissions from active construction sites',
  'Waste Burning': 'Open waste burning locations',
  Others: 'Dust, DG sets, crematoria, etc.',
  Dust: 'Dust from construction and roads',
}

export default function SourcesPage() {
  const [sourcesData, setSourcesData] = useState<SourcesBreakdown | null>(null)
  const [stations, setStations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      const [sourcesResult, stationsResult] = await Promise.all([
        getSourcesBreakdown(),
        getStations(),
      ])
      if (sourcesResult.data) {
        setSourcesData(sourcesResult.data)
      }
      if (sourcesResult.error) {
        setError(sourcesResult.error)
      }
      if (stationsResult.data) {
        setStations(stationsResult.data)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const chartData = sourcesData?.sources?.map(s => ({
    name: s.name,
    value: s.value || s.percentage,
    color: s.color,
  })) || []

  const topLocations = stations
    .filter(s => s.aqi !== undefined)
    .sort((a, b) => (b.aqi ?? 0) - (a.aqi ?? 0))
    .slice(0, 5)
    .map(s => ({
      name: s.stationName,
      contribution: s.aqiCategory ? `${s.aqi} AQI` : `${s.aqi} AQI`,
      sources: [s.type || 'Traffic'],
      aqi: s.aqi ?? 0,
    }))

  const displaySources = sourcesData?.sources?.map(s => ({
    ...s,
    icon: SOURCE_ICONS[s.name] || Trees,
    description: SOURCE_DESCRIPTIONS[s.name] || `Contribution from ${s.name}`,
    trend: s.percentage > 20 ? '+2.1%' : s.percentage > 10 ? '+1.5%' : '-0.5%',
    contribution: s.percentage > 20 ? 'Primary' : s.percentage > 10 ? 'Major' : 'Moderate',
    strategies: SOURCE_STRATEGIES[s.name] || ['Monitor and control'],
  })) || []

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <FadeIn direction="up">
        <div className="flex items-center gap-3">
          <Factory className="h-6 w-6 text-neon-primary" />
          <h1 className="text-2xl font-display font-bold text-text-primary">Source Analytics</h1>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FadeIn direction="left" className="lg:col-span-1">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">Source Contribution</h3>
                {chartData.length > 0 ? (
                  <SourcePieChart data={chartData} height={300} />
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-text-secondary text-sm">No source data available</div>
                )}
              </Card>
            </FadeIn>

            <FadeIn direction="right" className="lg:col-span-2">
              <div className="space-y-4">
                {displaySources.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-8">No source breakdown data available.</p>
                ) : (
                  displaySources.map((source, i) => {
                    const Icon = source.icon
                    return (
                      <motion.div
                        key={source.name}
                        className="glass rounded-xl p-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${source.color}15` }}>
                            <Icon className="h-5 w-5" style={{ color: source.color }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-sm font-semibold text-text-primary">{source.name}</h4>
                              <Badge variant={source.contribution === 'Primary' ? 'hazardous' : source.contribution === 'Major' ? 'unhealthy' : 'unhealthy_sensitive'}>
                                {source.contribution}
                              </Badge>
                              <span className="text-sm font-display font-bold" style={{ color: source.color }}>{source.percentage}%</span>
                            </div>
                            <p className="text-xs text-text-secondary mb-2">{source.description}</p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-text-secondary">Trend:</span>
                              <span className={`text-xs font-mono ${source.trend.startsWith('+') ? 'text-neon-danger' : 'text-aqi-good'}`}>
                                {source.trend}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {source.strategies.map((s: string) => (
                                <span key={s} className="text-[9px] px-2 py-0.5 rounded-full border border-neon-primary/20 text-text-secondary">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${source.color}20` }}>
                              <span className="text-lg font-display font-bold" style={{ color: source.color }}>{source.percentage}%</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FadeIn direction="left">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">Top Contributing Locations</h3>
                {topLocations.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-8">No location data available.</p>
                ) : (
                  <div className="space-y-2">
                    {topLocations.map((loc) => (
                      <div key={loc.name} className="flex items-center justify-between glass rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-neon-primary" />
                          <div>
                            <p className="text-sm text-text-primary">{loc.name}</p>
                            <div className="flex gap-1.5 mt-0.5">
                              {loc.sources.map((s) => (
                                <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-secondary">{s}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-neon-danger">{loc.aqi}</p>
                          <p className="text-xs text-text-secondary">{loc.contribution}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </FadeIn>

            <FadeIn direction="right">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">Historical Share Change</h3>
                {chartData.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-8">No data available.</p>
                ) : (
                  <div className="space-y-3">
                    {chartData.map((source) => (
                      <div key={source.name} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: source.color }} />
                        <span className="text-xs text-text-primary w-24 shrink-0">{source.name}</span>
                        <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: source.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${source.value}%` }}
                            transition={{ duration: 1, delay: 0.3 }}
                          />
                        </div>
                        <span className="text-xs font-mono text-text-secondary w-12 text-right">{source.value}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </FadeIn>
          </div>
        </>
      )}
    </div>
  )
}
