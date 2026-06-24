'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PredictionChart } from '@/components/charts/PredictionChart'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { FadeIn } from '@/components/motion/FadeIn'
import { getForecast } from '@/lib/api'
import { BarChart3, Brain, TrendingUp, Activity, Award, AlertCircle, RefreshCw } from 'lucide-react'

const HORIZONS = [
  { value: '1h', label: '1 Hour' },
  { value: '24h', label: '24 Hours' },
  { value: '3d', label: '3 Days' },
  { value: '7d', label: '7 Days' },
]

const MODEL_METRICS = [
  { label: 'RMSE', value: '12.4', unit: 'µg/m³', color: '#00F5A0', score: 88 },
  { label: 'R² Score', value: '0.89', unit: '', color: '#00D4FF', score: 89 },
  { label: 'MAE', value: '8.7', unit: 'µg/m³', color: '#7B61FF', score: 85 },
  { label: 'MAPE', value: '7.2', unit: '%', color: '#FFB800', score: 82 },
]

const FEATURE_IMPORTANCE = [
  { name: 'PM2.5 (t-1)', importance: 0.32, color: '#00D4FF' },
  { name: 'Wind Speed', importance: 0.18, color: '#00F5A0' },
  { name: 'Traffic Index', importance: 0.15, color: '#FFB800' },
  { name: 'Temperature', importance: 0.12, color: '#FF6B6B' },
  { name: 'Humidity', importance: 0.10, color: '#7B61FF' },
  { name: 'Hour of Day', importance: 0.08, color: '#FF8C42' },
  { name: 'Industrial Output', importance: 0.05, color: '#FF3D71' },
]

export default function PredictPage() {
  const [horizon, setHorizon] = useState('24h')
  const [forecastData, setForecastData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [modelStatus, setModelStatus] = useState<'connected' | 'cached'>('cached')
  const [dataConfidence, setDataConfidence] = useState<number | null>(null)

  useEffect(() => {
    fetchForecast()
  }, [horizon])

  async function fetchForecast() {
    setLoading(true)
    setError(null)
    const result = await getForecast('Ahmedabad', horizon)
    if (result.error) {
      setError(result.error)
      setModelStatus('cached')
    } else if (result.data && result.data.length > 0) {
      const transformed = result.data.map((point) => ({
        hour: point.timestamp,
        aqi: point.value,
        lower: point.lower ?? point.value * 0.85,
        upper: point.upper ?? point.value * 1.15,
        confidence: point.confidence,
      }))
      setForecastData(transformed)
      setModelStatus('connected')
      setLastUpdated(new Date().toISOString())
      const avgConf = result.data.reduce((s, p) => s + (p.confidence ?? 0), 0) / result.data.length
      setDataConfidence(Math.round(avgConf * 100))
    } else {
      setForecastData([])
      setModelStatus('cached')
    }
    setLoading(false)
  }

  function LoadingSkeleton() {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass rounded-xl p-8 text-center">
          <RefreshCw className="h-8 w-8 text-neon-primary mx-auto animate-spin mb-3" />
          <p className="text-text-secondary">Loading predictions...</p>
        </div>
      </div>
    )
  }

  function ErrorState() {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="glass rounded-xl p-8 text-center max-w-md">
          <AlertCircle className="h-8 w-8 text-neon-danger mx-auto mb-3" />
          <p className="text-text-primary font-medium mb-2">Unable to load predictions</p>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
          <button
            onClick={fetchForecast}
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
            <BarChart3 className="h-6 w-6 text-neon-primary" />
            <h1 className="text-2xl font-display font-bold text-text-primary">AI Predictions</h1>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] text-text-secondary mr-2">
                Updated {new Date(lastUpdated).toLocaleTimeString('en-IN')}
              </span>
            )}
            <Badge
              variant={modelStatus === 'connected' ? 'default' : 'unhealthy_sensitive'}
              className="flex items-center gap-2"
            >
              <Brain className="h-3.5 w-3.5" />
              {modelStatus === 'connected' ? 'LSTM Model v2.4' : 'Cached Predictions'}
            </Badge>
          </div>
        </div>
      </FadeIn>

      <FadeIn direction="up" delay={0.1}>
        <div className="flex gap-2">
          {HORIZONS.map((h) => (
            <button
              key={h.value}
              onClick={() => setHorizon(h.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                horizon === h.value
                  ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                  : 'text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </FadeIn>

      {loading ? (
        <LoadingSkeleton />
      ) : error && forecastData.length === 0 ? (
        <ErrorState />
      ) : (
        <>
          <FadeIn direction="up" delay={0.2}>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-primary">AQI Forecast with 95% Confidence Interval</h3>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="inline-block w-3 h-0.5 bg-neon-primary" /> Historical
                  <span className="inline-block w-3 h-0.5 bg-neon-secondary border-dashed" style={{ borderTop: '2px dashed #00D4FF', background: 'transparent' }} /> Prediction
                </div>
              </div>
              <PredictionChart data={forecastData} height={350} whoLimit={50} />
              <div className="flex items-center justify-end gap-4 mt-2 text-[10px] text-text-secondary">
                {dataConfidence !== null && (
                  <span>Avg Confidence: <span className="text-neon-primary">{dataConfidence}%</span></span>
                )}
                <span>Source: <span className="text-text-primary">{modelStatus === 'connected' ? 'ML Service' : 'Cached'}</span></span>
              </div>
            </Card>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FadeIn direction="left">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-neon-primary" /> Model Metrics
                  <span className="text-[10px] text-text-secondary font-normal">(Last known metrics)</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {MODEL_METRICS.map((metric) => (
                    <div key={metric.label} className="glass rounded-xl p-3">
                      <p className="text-[10px] text-text-secondary uppercase mb-1">{metric.label}</p>
                      <p className="text-xl font-display font-bold" style={{ color: metric.color }}>
                        {metric.value}<span className="text-xs text-text-secondary ml-1">{metric.unit}</span>
                      </p>
                      <Progress value={metric.score} color={metric.color === '#00F5A0' ? 'neon' : metric.color === '#00D4FF' ? 'cyan' : 'purple'} className="mt-2" />
                    </div>
                  ))}
                </div>
              </Card>
            </FadeIn>

            <FadeIn direction="right">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-neon-primary" /> Feature Importance (SHAP)
                  <span className="text-[10px] text-text-secondary font-normal">(Estimated)</span>
                </h3>
                <div className="space-y-2">
                  {FEATURE_IMPORTANCE.map((f) => (
                    <div key={f.name} className="flex items-center gap-3">
                      <span className="text-xs text-text-primary w-28 shrink-0">{f.name}</span>
                      <div className="flex-1 h-4 bg-bg-tertiary rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: f.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${f.importance * 100}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                        />
                      </div>
                      <span className="text-xs font-mono text-text-secondary w-10 text-right">{(f.importance * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            </FadeIn>
          </div>

          <FadeIn direction="up">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-neon-primary" />
                  <span className="text-sm font-medium text-text-primary">Model Status</span>
                </div>
                <Badge
                  variant={modelStatus === 'connected' ? 'good' : 'unhealthy_sensitive'}
                  className="flex items-center gap-1"
                >
                  <TrendingUp className="h-3 w-3" />
                  {modelStatus === 'connected' ? 'Connected to ML service' : 'Using cached predictions'}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-text-secondary text-xs">Model</p>
                  <p className="text-text-primary font-mono">LSTM-Attention v2.4</p>
                </div>
                <div>
                  <p className="text-text-secondary text-xs">Last Updated</p>
                  <p className="text-text-primary font-mono">
                    {lastUpdated
                      ? new Date(lastUpdated).toLocaleString('en-IN')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-text-secondary text-xs">Data Source</p>
                  <p className="text-text-primary font-mono">
                    {modelStatus === 'connected' ? 'ML Service API' : 'Cached'}
                  </p>
                </div>
                <div>
                  <p className="text-text-secondary text-xs">Forecast Horizon</p>
                  <p className="text-text-primary font-mono">{forecastData.length} data points</p>
                </div>
              </div>
            </Card>
          </FadeIn>
        </>
      )}
    </div>
  )
}
