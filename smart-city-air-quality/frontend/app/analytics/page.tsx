'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AQILineChart } from '@/components/charts/AQILineChart'
import { AQIBarChart } from '@/components/charts/AQIBarChart'
import { CalendarHeatmap } from '@/components/charts/CalendarHeatmap'
import { RadialBarChartComponent } from '@/components/charts/RadialBarChart'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FadeIn } from '@/components/motion/FadeIn'
import { getStations, getStationHistory } from '@/lib/api'
import type { StationInfo, HistoryReading } from '@/lib/api'
import { downloadCSV } from '@/lib/utils'
import { BarChart3, Download, TrendingUp, TrendingDown, Calendar, Activity, Loader2, AlertCircle } from 'lucide-react'

const TIME_RANGES = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' },
]

function toISODate(d: Date): string { return d.toISOString().split('T')[0] }

function dateRangeFromRange(range: string): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  switch (range) {
    case 'day': from.setDate(to.getDate() - 1); break
    case 'week': from.setDate(to.getDate() - 7); break
    case 'month': from.setDate(to.getDate() - 30); break
    case 'quarter': from.setDate(to.getDate() - 90); break
    case 'year': from.setDate(to.getDate() - 365); break
    default: from.setDate(to.getDate() - 30); break
  }
  return { from: toISODate(from), to: toISODate(to) }
}

function computeStats(data: HistoryReading[]) {
  const aqis = data.map(d => d.aqi).filter((v): v is number => v !== undefined)
  if (aqis.length === 0) return null
  const mean = aqis.reduce((s, v) => s + v, 0) / aqis.length
  const sorted = [...aqis].sort((a, b) => a - b)
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]
  const max = sorted[sorted.length - 1]
  const min = sorted[0]
  const variance = aqis.reduce((s, v) => s + (v - mean) ** 2, 0) / aqis.length
  const stdDev = Math.sqrt(variance)
  const aboveWHO = aqis.filter(v => v > 50).length / aqis.length * 100

  const diff = (current: number, previous: number) => {
    if (previous === 0) return '+0%'
    const pct = ((current - previous) / previous) * 100
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
  }

  const half = Math.floor(aqis.length / 2)
  const firstHalfMean = aqis.slice(0, half).reduce((s, v) => s + v, 0) / half
  const secondHalfMean = aqis.slice(half).reduce((s, v) => s + v, 0) / (aqis.length - half)

  return [
    { label: 'Mean AQI', value: mean.toFixed(1), change: diff(mean, firstHalfMean), color: '#FFB800', up: mean > firstHalfMean },
    { label: 'Median AQI', value: median.toFixed(0), change: diff(median, sorted[Math.floor(half / 2)] || median), color: '#FF7E00', up: median > (sorted[Math.floor(half / 2)] || median) },
    { label: 'Max AQI', value: max.toString(), change: diff(max, min), color: '#FF3D71', up: max > min },
    { label: 'Min AQI', value: min.toString(), change: diff(min, max), color: '#00E400', up: min < max },
    { label: 'Std Dev', value: stdDev.toFixed(1), change: '+0%', color: '#00D4FF', up: true },
    { label: '% Above WHO', value: `${aboveWHO.toFixed(1)}%`, change: diff(aboveWHO, 50), color: '#FF3D71', up: aboveWHO > 50 },
  ]
}

function computeWHOData(data: HistoryReading[]) {
  const aqis = data.filter(d => d.aqi !== undefined && d.pm25 !== undefined && d.pm10 !== undefined)
  const total = aqis.length || 1
  const pm25Above = aqis.filter(d => (d.pm25 ?? 0) > 15).length
  const pm10Above = aqis.filter(d => (d.pm10 ?? 0) > 45).length
  const no2Above = aqis.filter(d => (d.no2 ?? 0) > 25).length
  const so2Above = aqis.filter(d => (d.so2 ?? 0) > 40).length
  const o3Above = aqis.filter(d => (d.o3 ?? 0) > 50).length
  return [
    { pollutant: 'PM2.5', daysAbove: pm25Above, totalDays: total, limit: '15 µg/m³' },
    { pollutant: 'PM10', daysAbove: pm10Above, totalDays: total, limit: '45 µg/m³' },
    { pollutant: 'NO2', daysAbove: no2Above, totalDays: total, limit: '25 ppb' },
    { pollutant: 'SO2', daysAbove: so2Above, totalDays: total, limit: '40 ppb' },
    { pollutant: 'O3', daysAbove: o3Above, totalDays: total, limit: '50 ppb' },
  ]
}

function computeLatestPollutants(data: HistoryReading[]) {
  if (data.length === 0) return []
  const latest = data[data.length - 1]
  return [
    { name: 'PM2.5', value: latest.pm25 ?? 0, fill: '#00D4FF' },
    { name: 'PM10', value: latest.pm10 ?? 0, fill: '#7B61FF' },
    { name: 'NO2', value: latest.no2 ?? 0, fill: '#FF6B6B' },
    { name: 'SO2', value: latest.so2 ?? 0, fill: '#FF3D71' },
    { name: 'O3', value: latest.o3 ?? 0, fill: '#FF8C42' },
  ]
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('month')
  const [stations, setStations] = useState<StationInfo[]>([])
  const [history, setHistory] = useState<HistoryReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      const stationsResult = await getStations()
      if (stationsResult.error) {
        setError(stationsResult.error)
        setLoading(false)
        return
      }
      if (!stationsResult.data || stationsResult.data.length === 0) {
        setError('No monitoring stations found.')
        setLoading(false)
        return
      }
      setStations(stationsResult.data)
      const firstStation = stationsResult.data[0]
      const { from, to } = dateRangeFromRange(timeRange)
      const historyResult = await getStationHistory(firstStation.stationId, from, to)
      if (historyResult.data) {
        setHistory(historyResult.data)
      }
      if (historyResult.error) {
        setError(historyResult.error)
      }
      setLoading(false)
    }
    fetchData()
  }, [timeRange])

  const stats = useMemo(() => computeStats(history), [history])
  const whoData = useMemo(() => computeWHOData(history), [history])
  const latestPollutants = useMemo(() => computeLatestPollutants(history), [history])
  const heatmapData = useMemo(() =>
    history.map(d => ({ date: d.timestamp, value: d.aqi ?? 0 })),
    [history]
  )

  const chartData = useMemo(() =>
    history.map(d => ({ date: d.timestamp, aqi: d.aqi ?? 0, pm25: d.pm25 ?? 0, pm10: d.pm10 ?? 0, no2: d.no2 ?? 0, so2: d.so2 ?? 0, co: d.co ?? 0, o3: d.o3 ?? 0 })),
    [history]
  )

  const monthlyData = useMemo(() => {
    const grouped: Record<string, { aqi: number[]; pm25: number[]; pm10: number[] }> = {}
    history.forEach(d => {
      const month = new Date(d.timestamp).toLocaleString('default', { month: 'short' })
      if (!grouped[month]) grouped[month] = { aqi: [], pm25: [], pm10: [] }
      if (d.aqi !== undefined) grouped[month].aqi.push(d.aqi)
      if (d.pm25 !== undefined) grouped[month].pm25.push(d.pm25)
      if (d.pm10 !== undefined) grouped[month].pm10.push(d.pm10)
    })
    return Object.entries(grouped).map(([date, vals]) => ({
      date,
      aqi: Math.round(vals.aqi.reduce((s, v) => s + v, 0) / vals.aqi.length),
      pm25: vals.pm25.length > 0 ? Math.round(vals.pm25.reduce((s, v) => s + v, 0) / vals.pm25.length) : 0,
      pm10: vals.pm10.length > 0 ? Math.round(vals.pm10.reduce((s, v) => s + v, 0) / vals.pm10.length) : 0,
    }))
  }, [history])

  const handleExportCSV = () => {
    if (chartData.length > 0) {
      downloadCSV(chartData, `aqi-history-${timeRange}.csv`)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <FadeIn direction="up">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-neon-primary" />
            <h1 className="text-2xl font-display font-bold text-text-primary">Historical Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={chartData.length === 0}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn direction="up" delay={0.1}>
        <div className="flex gap-2 flex-wrap">
          {TIME_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === r.value
                  ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              {r.label}
            </button>
          ))}
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
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {stats.map((stat) => (
                <FadeIn key={stat.label} direction="up" delay={0.1}>
                  <Card className="text-center p-3">
                    <p className="text-[10px] text-text-secondary uppercase mb-1">{stat.label}</p>
                    <p className="text-xl font-display font-bold text-text-primary">{stat.value}</p>
                    <div className={`flex items-center justify-center gap-0.5 text-xs mt-1 ${stat.up ? 'text-neon-danger' : 'text-neon-primary'}`}>
                      {stat.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {stat.change}
                    </div>
                  </Card>
                </FadeIn>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FadeIn direction="left">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">AQI Trend</h3>
                {chartData.length > 0 ? (
                  <AQILineChart data={chartData} pollutants={['aqi']} height={280} />
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-text-secondary text-sm">No data available</div>
                )}
              </Card>
            </FadeIn>
            <FadeIn direction="right">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">Monthly Comparison</h3>
                {monthlyData.length > 0 ? (
                  <AQIBarChart data={monthlyData} height={280} />
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-text-secondary text-sm">No data available</div>
                )}
              </Card>
            </FadeIn>
          </div>

          <FadeIn direction="up">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-neon-primary" /> AQI Calendar
              </h3>
              {heatmapData.length > 0 ? (
                <CalendarHeatmap data={heatmapData} />
              ) : (
                <div className="flex items-center justify-center h-[120px] text-text-secondary text-sm">No data available</div>
              )}
            </Card>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FadeIn direction="left">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">Multi-Pollutant Radial</h3>
                <RadialBarChartComponent data={latestPollutants} height={280} />
              </Card>
            </FadeIn>
            <FadeIn direction="right">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">WHO Limit Breach Analysis</h3>
                <div className="space-y-3">
                  {whoData.map((item) => {
                    const pct = (item.daysAbove / item.totalDays) * 100
                    return (
                      <div key={item.pollutant} className="glass rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-text-primary font-medium">{item.pollutant}</span>
                          <span className="text-xs text-text-secondary">Limit: {item.limit}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: pct > 80 ? '#FF3D71' : pct > 50 ? '#FFB800' : '#00F5A0' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1 }}
                            />
                          </div>
                          <span className="text-xs font-mono text-text-secondary w-16 text-right">
                            {item.daysAbove}/{item.totalDays} days
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </FadeIn>
          </div>
        </>
      )}
    </div>
  )
}
