'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AQILineChart } from '@/components/charts/AQILineChart'
import { RadialBarChartComponent } from '@/components/charts/RadialBarChart'
import { AQIWidget } from '@/components/aqicards/AQIWidget'
import { StationGrid } from '@/components/stations/StationGrid'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FadeIn } from '@/components/motion/FadeIn'
import { StaggerContainer } from '@/components/motion/StaggerContainer'
import { getCurrentAQI, getStations, getStationHistory } from '@/lib/api'
import type { AqiCurrentResponse, StationInfo, HistoryReading } from '@/lib/api'
import { Activity, RefreshCw, Radio, Wind, Thermometer, Droplets, Eye, Gauge, Clock, Loader2, AlertTriangle } from 'lucide-react'

const POLLUTANT_META: Record<string, { label: string; unit: string; color: string; icon: typeof Wind }> = {
  pm25: { label: 'PM2.5', unit: 'µg/m³', color: '#00D4FF', icon: Wind },
  pm10: { label: 'PM10', unit: 'µg/m³', color: '#7B61FF', icon: Wind },
  co: { label: 'CO', unit: 'ppm', color: '#FFB800', icon: Wind },
  no2: { label: 'NO2', unit: 'ppb', color: '#FF6B6B', icon: Wind },
  so2: { label: 'SO2', unit: 'ppb', color: '#FF3D71', icon: Wind },
  o3: { label: 'O3', unit: 'ppb', color: '#FF8C42', icon: Wind },
  nh3: { label: 'NH3', unit: 'ppb', color: '#7B61FF', icon: Wind },
  temperature: { label: 'Temperature', unit: '°C', color: '#FFB800', icon: Thermometer },
  humidity: { label: 'Humidity', unit: '%', color: '#00D4FF', icon: Droplets },
  windSpeed: { label: 'Wind Speed', unit: 'km/h', color: '#00F5A0', icon: Wind },
  visibility: { label: 'Visibility', unit: 'km', color: '#E6F1FF', icon: Eye },
}

const WHO_LIMIT_VALUES: Record<string, { limit: number; unit: string; label: string }> = {
  pm25: { limit: 25, unit: 'µg/m³', label: 'PM2.5' },
  pm10: { limit: 45, unit: 'µg/m³', label: 'PM10' },
  no2: { limit: 53, unit: 'ppb', label: 'NO2' },
  so2: { limit: 40, unit: 'ppb', label: 'SO2' },
  o3: { limit: 50, unit: 'ppb', label: 'O3' },
  co: { limit: 4, unit: 'ppm', label: 'CO' },
}

function elapsedSeconds(since: string): number {
  return Math.round((Date.now() - new Date(since).getTime()) / 1000)
}

export default function MonitorPage() {
  const [aqiData, setAqiData] = useState<AqiCurrentResponse | null>(null)
  const [stations, setStations] = useState<StationInfo[]>([])
  const [historyData, setHistoryData] = useState<HistoryReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  useEffect(() => {
    if (!lastUpdated) return
    const interval = setInterval(() => setSecondsAgo(elapsedSeconds(lastUpdated)), 1000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  const fetchAll = useCallback(async () => {
    const [aqiResult, stationsResult] = await Promise.all([
      getCurrentAQI(),
      getStations(),
    ])

    if (aqiResult.error && stationsResult.error) {
      setError(aqiResult.error)
      setLoading(false)
      return
    }

    const aqi = aqiResult.data
    const stationList = stationsResult.data || []

    setAqiData(aqi)
    setStations(stationList)
    setLastUpdated(aqi?.lastUpdated || new Date().toISOString())

    if (stationList.length > 0) {
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const historyResult = await getStationHistory(stationList[0].stationId, from)
      if (historyResult.data) setHistoryData(historyResult.data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const buildPollutantEntry = (key: string, value: number | undefined) => {
    if (value === undefined || value === null) return null
    const meta = POLLUTANT_META[key]
    if (!meta) return null
    const status =
      key === 'pm25' ? (value > 25 ? 'unhealthy' : value > 15 ? 'moderate' : 'good') :
      key === 'pm10' ? (value > 100 ? 'unhealthy' : value > 50 ? 'moderate' : 'good') :
      key === 'no2' ? (value > 53 ? 'unhealthy' : value > 25 ? 'moderate' : 'good') :
      key === 'so2' ? (value > 40 ? 'unhealthy' : value > 20 ? 'moderate' : 'good') :
      key === 'o3' ? (value > 50 ? 'unhealthy' : value > 30 ? 'moderate' : 'good') :
      key === 'co' ? (value > 4 ? 'unhealthy' : value > 2 ? 'moderate' : 'good') :
      'good'
    return { key, label: meta.label, value: value.toFixed(1), unit: meta.unit, color: meta.color, Icon: meta.icon, status }
  }

  const pollutantKeys: (keyof AqiCurrentResponse)[] = ['pm25', 'pm10', 'co', 'no2', 'so2', 'o3', 'nh3', 'temperature', 'humidity', 'windSpeed', 'visibility']

  const pollutantEntries: NonNullable<ReturnType<typeof buildPollutantEntry>>[] = aqiData
    ? pollutantKeys.map((k) => buildPollutantEntry(k, aqiData[k] as number | undefined)).filter((e): e is NonNullable<typeof e> => e !== null)
    : []

  const radialData = aqiData
    ? [
        { name: 'PM2.5', value: aqiData.pm25 ?? 0, fill: '#00D4FF' },
        { name: 'PM10', value: aqiData.pm10 ?? 0, fill: '#7B61FF' },
        { name: 'NO2', value: aqiData.no2 ?? 0, fill: '#FF6B6B' },
        { name: 'SO2', value: aqiData.so2 ?? 0, fill: '#FF3D71' },
        { name: 'O3', value: aqiData.o3 ?? 0, fill: '#FF8C42' },
        { name: 'CO', value: Math.round((aqiData.co ?? 0) * 10), fill: '#FFB800' },
      ]
    : []

  const whoComparisons = aqiData
    ? Object.entries(WHO_LIMIT_VALUES)
        .map(([key, w]) => {
          const current = aqiData[key as keyof AqiCurrentResponse] as number | undefined
          if (current === undefined || current === null) return null
          return {
            pollutant: w.label,
            current,
            limit: w.limit,
            unit: w.unit,
            exceeding: current > w.limit,
          }
        })
        .filter(Boolean) as Array<{ pollutant: string; current: number; limit: number; unit: string; exceeding: boolean }>
    : []

  const chartData = historyData.map((h) => ({
    hour: h.timestamp,
    pm25: h.pm25,
    pm10: h.pm10,
    no2: h.no2,
    o3: h.o3,
  }))

  const stationGridData = stations.map((s) => ({
    id: s.stationId,
    name: s.stationName,
    aqi: s.aqi ?? 0,
    status: s.status,
    lat: s.location.coordinates[1],
    lng: s.location.coordinates[0],
  }))

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-neon-primary/20 border-t-neon-primary animate-spin" />
            <div className="absolute inset-0 h-12 w-12 rounded-full bg-neon-primary/5 blur-xl" />
          </div>
          <p className="text-text-secondary text-sm font-mono">Fetching live monitoring data...</p>
        </div>
      </div>
    )
  }

  if (error && !aqiData) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="glass rounded-2xl p-8 max-w-md text-center">
            <AlertTriangle className="h-12 w-12 text-neon-danger mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-text-primary mb-2">Unable to Load Data</h2>
            <p className="text-text-secondary text-sm mb-4">{error}</p>
            <button
              onClick={() => { setLoading(true); setError(null); fetchAll() }}
              className="px-4 py-2 rounded-lg bg-neon-primary/10 text-neon-primary text-sm hover:bg-neon-primary/20 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <FadeIn direction="up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-neon-primary" />
            <h1 className="text-2xl font-display font-bold text-text-primary">Real-Time Monitoring</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="default" className="flex items-center gap-2">
              <Radio className="h-3 w-3 animate-pulse" /> Live
            </Badge>
            <button
              onClick={() => { setLoading(true); fetchAll() }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neon-primary/20 text-sm text-text-secondary hover:border-neon-primary/40 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </FadeIn>

      {lastUpdated && (
        <FadeIn direction="up" delay={0.05}>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Clock className="h-3 w-3" />
            Last updated: {secondsAgo}s ago
            {aqiData && (
              <>
                <span className="w-px h-3 bg-bg-tertiary" />
                <span>Source: {aqiData.source}</span>
                <span className="w-px h-3 bg-bg-tertiary" />
                <span>Confidence: {(aqiData.confidence * 100).toFixed(0)}%</span>
              </>
            )}
          </div>
        </FadeIn>
      )}

      <FadeIn direction="up" delay={0.1}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {pollutantEntries.length > 0 ? (
            pollutantEntries.map((p) => {
              const Icon = p.Icon
              return (
                <Card key={p.key} className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${p.color}15` }}>
                    <Icon className="h-4 w-4" style={{ color: p.color }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-text-secondary uppercase">{p.label}</p>
                    <p className="text-sm font-mono font-semibold" style={{ color: p.color }}>
                      {p.value} <span className="text-[10px] text-text-secondary">{p.unit}</span>
                    </p>
                  </div>
                </Card>
              )
            })
          ) : (
            <div className="col-span-full text-center text-text-secondary text-sm py-8">
              No pollutant data available.
            </div>
          )}
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FadeIn direction="left" className="lg:col-span-2">
          <Card className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">24-Hour Trend</h3>
            {chartData.length > 0 ? (
              <AQILineChart data={chartData} pollutants={['pm25', 'pm10', 'no2', 'o3']} height={280} />
            ) : (
              <div className="flex items-center justify-center h-[280px] text-text-secondary text-sm">
                No historical data available.
              </div>
            )}
          </Card>
        </FadeIn>

        <FadeIn direction="right">
          <Card className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">Current Snapshot</h3>
            {radialData.some((d) => d.value > 0) ? (
              <RadialBarChartComponent data={radialData} height={280} />
            ) : (
              <div className="flex items-center justify-center h-[280px] text-text-secondary text-sm">
                No snapshot data available.
              </div>
            )}
          </Card>
        </FadeIn>
      </div>

      <FadeIn direction="up">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">WHO Limit Comparison</h3>
          {whoComparisons.length > 0 ? (
            <div className="space-y-3">
              {whoComparisons.map((w) => (
                <div key={w.pollutant} className="flex items-center gap-4">
                  <span className="text-sm text-text-primary w-16 shrink-0">{w.pollutant}</span>
                  <div className="flex-1 h-3 bg-bg-tertiary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: w.exceeding ? '#FF3D71' : '#00F5A0' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((w.current / w.limit) * 100, 200)}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-xs font-mono text-text-secondary w-24 text-right">
                    {w.current.toFixed(1)}/{w.limit} {w.unit}
                  </span>
                  <Badge variant={w.exceeding ? 'hazardous' : 'good'}>
                    {w.exceeding ? 'Exceeds' : 'Within'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-text-secondary text-sm py-4">
              No WHO comparison data available.
            </div>
          )}
        </Card>
      </FadeIn>

      <FadeIn direction="up">
        <div className="space-y-4">
          <h2 className="text-lg font-display font-semibold text-text-primary">Monitoring Stations</h2>
          <StationGrid stations={stationGridData} />
        </div>
      </FadeIn>
    </div>
  )
}
