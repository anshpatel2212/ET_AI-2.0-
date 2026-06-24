'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { FadeIn } from '@/components/motion/FadeIn'
import { getStations, getStationHistory } from '@/lib/api'
import { downloadCSV } from '@/lib/utils'
import { Globe, Download, Code, Key, FileJson, FileText, ExternalLink, Copy, CheckCircle2, Loader2 } from 'lucide-react'

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/aqi/current', description: 'Get current AQI for a city', params: 'city: string', auth: false },
  { method: 'GET', path: '/api/v1/stations', description: 'List all monitoring stations', params: '-', auth: false },
  { method: 'GET', path: '/api/v1/stations/:id/history', description: 'Get station history', params: 'id: string, from: date, to: date', auth: false },
  { method: 'GET', path: '/api/v1/forecast/:city', description: 'Get AQI forecast', params: 'city: string, horizon: string', auth: false },
  { method: 'GET', path: '/api/v1/alerts/active', description: 'Get active alerts', params: 'city: string', auth: false },
  { method: 'POST', path: '/api/v1/citizen/reports', description: 'Submit a pollution report', params: 'FormData (multipart)', auth: true },
  { method: 'GET', path: '/api/v1/sources/:city', description: 'Get source breakdown', params: 'city: string', auth: false },
  { method: 'GET', path: '/api/v1/interventions', description: 'List interventions', params: '-', auth: true },
]

export default function OpenDataPage() {
  const [showKeyForm, setShowKeyForm] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [keyGenerated, setKeyGenerated] = useState('')
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const generateKey = () => {
    const key = `aqi_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`
    setKeyGenerated(key)
    setCopied(false)
  }

  const copyKey = () => {
    navigator.clipboard.writeText(keyGenerated)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = useCallback(async (id: string, name: string, format: string) => {
    setDownloading(id)
    try {
      if (id === 'stations') {
        const result = await getStations()
        if (result.data) {
          const csvData = result.data.map(s => ({
            stationId: s.stationId,
            stationName: s.stationName,
            city: s.city,
            ward: s.ward,
            lat: s.location.coordinates[1],
            lng: s.location.coordinates[0],
            status: s.status,
            type: s.type,
            aqi: s.aqi ?? '',
            aqiCategory: s.aqiCategory ?? '',
          }))
          downloadCSV(csvData, 'stations-metadata.csv')
        }
      } else if (id === 'aqi-history') {
        const stationsResult = await getStations()
        const stationId = stationsResult.data?.[0]?.stationId || 'default'
        const to = new Date().toISOString().split('T')[0]
        const from = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0]
        const historyResult = await getStationHistory(stationId, from, to)
        if (historyResult.data) {
          downloadCSV(historyResult.data, 'aqi-history.csv')
        }
      } else if (id === 'daily-summary') {
        const stationsResult = await getStations()
        const stationId = stationsResult.data?.[0]?.stationId || 'default'
        const to = new Date().toISOString().split('T')[0]
        const from = new Date(Date.now() - 6 * 365 * 86400000).toISOString().split('T')[0]
        const historyResult = await getStationHistory(stationId, from, to)
        if (historyResult.data) {
          const daily = historyResult.data.map(d => ({
            date: d.timestamp?.split('T')[0] || d.timestamp,
            aqi: d.aqi ?? '',
            pm25: d.pm25 ?? '',
            pm10: d.pm10 ?? '',
            no2: d.no2 ?? '',
            so2: d.so2 ?? '',
            o3: d.o3 ?? '',
          }))
          downloadCSV(daily, 'daily-aqi-summary.csv')
        }
      }
    } catch {
      // silent fail - file will not download
    }
    setDownloading(null)
  }, [])

  const DOWNLOAD_SECTION = [
    { id: 'stations', name: 'Station Locations & Metadata', format: 'CSV', size: '~48 KB', rows: 'All stations', icon: FileText },
    { id: 'aqi-history', name: 'Recent AQI History', format: 'CSV', size: '~2 MB', rows: 'Last 365 days', icon: FileJson },
    { id: 'daily-summary', name: 'Daily AQI Summary', format: 'CSV', size: '~8 MB', rows: '6 years', icon: FileText },
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <FadeIn direction="up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-neon-primary" />
            <h1 className="text-2xl font-display font-bold text-text-primary">Open Data Portal</h1>
          </div>
          <Badge variant="default">v2.4 API</Badge>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FadeIn direction="left" className="lg:col-span-2">
          <div className="space-y-6">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                <Code className="h-4 w-4 text-neon-primary" /> API Documentation
              </h3>
              <div className="space-y-2">
                {API_ENDPOINTS.map((ep) => (
                  <div key={ep.path} className="glass rounded-lg p-3 flex items-start gap-3">
                    <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded shrink-0 ${
                      ep.method === 'GET' ? 'bg-aqi-good/20 text-aqi-good' : 'bg-neon-primary/20 text-neon-primary'
                    }`}>
                      {ep.method}
                    </span>
                    <div className="flex-1 min-w-0">
                      <code className="text-xs font-mono text-neon-primary">{ep.path}</code>
                      <p className="text-xs text-text-secondary mt-0.5">{ep.description}</p>
                      <p className="text-[10px] text-text-secondary/60 mt-0.5">Params: {ep.params}</p>
                    </div>
                    <Badge variant={ep.auth ? 'unhealthy' : 'good'}>
                      {ep.auth ? 'Auth' : 'Public'}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                <Download className="h-4 w-4 text-neon-primary" /> Data Downloads
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DOWNLOAD_SECTION.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.id} className="glass rounded-lg p-3 card-hover">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-4 w-4 text-neon-primary" />
                        <span className="text-sm text-text-primary font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-text-secondary">
                        <span>{item.format} · {item.size}</span>
                        <span>{item.rows}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => handleDownload(item.id, item.name, item.format)}
                        disabled={downloading === item.id}
                      >
                        {downloading === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        {downloading === item.id ? 'Downloading...' : `Download ${item.format}`}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </FadeIn>

        <FadeIn direction="right">
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                <Key className="h-4 w-4 text-neon-primary" /> API Key Management
              </h3>
              {!showKeyForm && !keyGenerated ? (
                <Button variant="neon" className="w-full" onClick={() => setShowKeyForm(true)}>
                  <Key className="h-4 w-4" /> Request API Key
                </Button>
              ) : keyGenerated ? (
                <div className="space-y-3">
                  <div className="glass rounded-lg p-3">
                    <p className="text-xs text-text-secondary mb-1">Your API Key:</p>
                    <code className="text-xs font-mono text-neon-primary break-all">{keyGenerated}</code>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="neon" size="sm" className="flex-1" onClick={copyKey}>
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied!' : 'Copy Key'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setKeyGenerated(''); setShowKeyForm(false) }}>
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input label="Application Name" placeholder="My App" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
                  <Button variant="neon" className="w-full" onClick={generateKey}>
                    <Key className="h-4 w-4" /> Generate Key
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowKeyForm(false)}>
                    Cancel
                  </Button>
                </div>
              )}
              <div className="mt-3 text-xs text-text-secondary/60 space-y-1">
                <p>Rate Limit: 1000 requests/day</p>
                <p>API keys are for non-commercial use</p>
                <p>Attribution required for published data</p>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">Quick Integration</h3>
              <div className="glass rounded-lg p-3">
                <code className="text-[10px] font-mono text-text-primary leading-relaxed block">
                  {`// Example: Get Current AQI
fetch('https://api.smartcityaqi.in/api/v1/aqi/current?city=Ahmedabad')
  .then(res => res.json())
  .then(data => console.log(data.aqi))`}
                </code>
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full">
                <ExternalLink className="h-3.5 w-3.5" /> API Playground
              </Button>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">Government Dashboard</h3>
              <div className="glass rounded-lg p-4 text-center">
                <Globe className="h-8 w-8 text-text-secondary mx-auto mb-2" />
                <p className="text-sm text-text-primary">CPCB Dashboard</p>
                <p className="text-xs text-text-secondary">Integrated with National Clean Air Programme</p>
                <Button variant="outline" size="sm" className="mt-2">
                  <ExternalLink className="h-3.5 w-3.5" /> Visit Portal
                </Button>
              </div>
            </Card>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}
