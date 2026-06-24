'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { FadeIn } from '@/components/motion/FadeIn'
import { HEALTH_PROFILES } from '@/lib/constants'
import { getCurrentAQI, getHealthAdvisory } from '@/lib/api'
import type { AqiCurrentResponse, HealthAdvisoryResponse } from '@/lib/api'
import { Heart, Activity, AlertTriangle, Clock, Wind, Baby, Sun, Bike, BookOpen, Users, Shield, Loader2, AlertCircle } from 'lucide-react'

const AQI_HEALTH_TABLE = [
  { range: '0-50', label: 'Good', color: '#00E400', advice: 'Air quality is satisfactory. No precautions needed.' },
  { range: '51-100', label: 'Moderate', color: '#FFFF00', advice: 'Unusually sensitive individuals should consider limiting prolonged outdoor exertion.' },
  { range: '101-150', label: 'Unhealthy for Sensitive', color: '#FF7E00', advice: 'Active children and adults, and people with respiratory disease, should limit prolonged outdoor exertion.' },
  { range: '151-200', label: 'Unhealthy', color: '#FF0000', advice: 'Everyone should limit prolonged outdoor exertion. Sensitive groups should avoid outdoor activities.' },
  { range: '201-300', label: 'Very Unhealthy', color: '#8F3F97', advice: 'Everyone should avoid all physical outdoor activities. Stay indoors with windows closed.' },
  { range: '301-500', label: 'Hazardous', color: '#7E0023', advice: 'Health emergency. Everyone should remain indoors. Use air purifiers. Seek medical help.' },
]

const profileIcons: Record<string, any> = {
  general: Users,
  children: Baby,
  elderly: Heart,
  pregnant: Heart,
  asthma: Wind,
  heart: Heart,
  outdoor: Sun,
  cyclists: Bike,
  students: BookOpen,
}

function computeSafeHours(aqi: number) {
  if (aqi <= 50) {
    return [
      { time: '00:00 - 23:59', safe: true, activity: 'All outdoor activities', risk: 'Low' },
    ]
  }
  if (aqi <= 100) {
    return [
      { time: '05:00 - 08:00', safe: true, activity: 'Morning Walk (Low intensity)', risk: 'Low' },
      { time: '08:00 - 11:00', safe: false, activity: 'Morning Commute', risk: 'Moderate' },
      { time: '11:00 - 16:00', safe: false, activity: 'Outdoor Activities', risk: 'Moderate' },
      { time: '16:00 - 19:00', safe: true, activity: 'Evening Walk', risk: 'Low' },
      { time: '19:00 - 21:00', safe: true, activity: 'Outdoor Sports (Moderate)', risk: 'Low' },
      { time: '21:00 - 05:00', safe: true, activity: 'Night (Indoor recommended)', risk: 'Low' },
    ]
  }
  if (aqi <= 150) {
    return [
      { time: '05:00 - 07:00', safe: true, activity: 'Morning Walk (Low intensity)', risk: 'Low' },
      { time: '07:00 - 09:00', safe: false, activity: 'Morning Commute', risk: 'Moderate' },
      { time: '09:00 - 12:00', safe: false, activity: 'Outdoor Work', risk: 'High' },
      { time: '12:00 - 15:00', safe: false, activity: 'Outdoor Activities', risk: 'High' },
      { time: '15:00 - 17:00', safe: false, activity: 'Afternoon Outdoors', risk: 'High' },
      { time: '17:00 - 19:00', safe: true, activity: 'Evening Walk', risk: 'Low' },
      { time: '19:00 - 21:00', safe: false, activity: 'Outdoor Sports', risk: 'Moderate' },
      { time: '21:00 - 05:00', safe: true, activity: 'Night (Indoor recommended)', risk: 'Low' },
    ]
  }
  if (aqi <= 200) {
    return [
      { time: '05:00 - 07:00', safe: false, activity: 'Morning Walk (Avoid)', risk: 'High' },
      { time: '07:00 - 09:00', safe: false, activity: 'Morning Commute (Limit)', risk: 'High' },
      { time: '09:00 - 12:00', safe: false, activity: 'Outdoor Work (Avoid)', risk: 'Very High' },
      { time: '12:00 - 15:00', safe: false, activity: 'Outdoor Activities (Avoid)', risk: 'Very High' },
      { time: '15:00 - 17:00', safe: false, activity: 'Afternoon Outdoors (Avoid)', risk: 'High' },
      { time: '17:00 - 19:00', safe: false, activity: 'Evening Walk (Limit)', risk: 'High' },
      { time: '19:00 - 21:00', safe: false, activity: 'Outdoor Sports (Avoid)', risk: 'High' },
      { time: '21:00 - 05:00', safe: true, activity: 'Night (Indoor recommended)', risk: 'Low' },
    ]
  }
  return [
    { time: '00:00 - 23:59', safe: false, activity: 'All outdoor activities (Avoid)', risk: 'Very High' },
  ]
}

function computeSymptomRisks(aqi: number) {
  const base = [
    { symptom: 'Cough & Throat Irritation', probability: 0, color: '#FF3D71' },
    { symptom: 'Eye Irritation / Watering', probability: 0, color: '#FF3D71' },
    { symptom: 'Shortness of Breath', probability: 0, color: '#FFB800' },
    { symptom: 'Chest Tightness', probability: 0, color: '#FFB800' },
    { symptom: 'Wheezing', probability: 0, color: '#FF7E00' },
    { symptom: 'Headache / Dizziness', probability: 0, color: '#FFB800' },
    { symptom: 'Fatigue / Lethargy', probability: 0, color: '#FF7E00' },
  ]
  const factor = Math.min(aqi / 200, 1)
  const mapped = [
    { ...base[0], probability: Math.round(72 * factor), risk: factor > 0.7 ? 'High' : factor > 0.4 ? 'Moderate' : 'Low' },
    { ...base[1], probability: Math.round(65 * factor), risk: factor > 0.7 ? 'High' : factor > 0.4 ? 'Moderate' : 'Low' },
    { ...base[2], probability: Math.round(45 * factor), risk: factor > 0.6 ? 'High' : factor > 0.3 ? 'Moderate' : 'Low' },
    { ...base[3], probability: Math.round(38 * factor), risk: factor > 0.6 ? 'High' : factor > 0.3 ? 'Moderate' : 'Low' },
    { ...base[4], probability: Math.round(25 * factor), risk: factor > 0.7 ? 'Moderate' : 'Low' },
    { ...base[5], probability: Math.round(42 * factor), risk: factor > 0.6 ? 'High' : factor > 0.3 ? 'Moderate' : 'Low' },
    { ...base[6], probability: Math.round(30 * factor), risk: factor > 0.7 ? 'Moderate' : 'Low' },
  ]
  return mapped
}

export default function HealthPage() {
  const [selectedProfile, setSelectedProfile] = useState('general')
  const [currentAQI, setCurrentAQI] = useState<AqiCurrentResponse | null>(null)
  const [advisory, setAdvisory] = useState<HealthAdvisoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      const aqiResult = await getCurrentAQI()
      if (aqiResult.data) {
        setCurrentAQI(aqiResult.data)
      }
      if (aqiResult.error) {
        setError(aqiResult.error)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!currentAQI) return
    const fetchAdvisory = async () => {
      const result = await getHealthAdvisory(23.0225, 72.5714, selectedProfile)
      if (result.data) {
        setAdvisory(result.data)
      }
    }
    fetchAdvisory()
  }, [currentAQI, selectedProfile])

  const profile = HEALTH_PROFILES.find((p) => p.id === selectedProfile) || HEALTH_PROFILES[0]
  const Icon = profileIcons[selectedProfile] || Users

  const riskColors: Record<string, string> = {
    low: '#00E400',
    moderate: '#FFB800',
    high: '#FF7E00',
    very_high: '#FF0000',
  }

  const aqiValue = currentAQI?.aqi ?? 0
  const safeHours = currentAQI ? computeSafeHours(currentAQI.aqi) : []
  const symptomRisks = currentAQI ? computeSymptomRisks(currentAQI.aqi) : []
  const hospitalProb = aqiValue > 0 ? Math.min(Math.round((aqiValue / 500) * 40 * 10) / 10, 40) : 0
  const yesterdayProb = aqiValue > 0 ? Math.max(Math.round((hospitalProb - 1.5) * 10) / 10, 0) : 0

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <FadeIn direction="up">
        <div className="flex items-center gap-3">
          <Heart className="h-6 w-6 text-neon-primary" />
          <h1 className="text-2xl font-display font-bold text-text-primary">Health Impact Assessment</h1>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FadeIn direction="left" className="lg:col-span-2">
            <div className="space-y-6">
              <Card className="p-4 overflow-hidden">
                <h3 className="text-sm font-medium text-text-primary mb-3">AQI - Health Advice (CPCB/WHO Standard)</h3>
                <div className="space-y-2">
                  {AQI_HEALTH_TABLE.map((row) => (
                    <div key={row.range} className="flex items-center gap-3 glass rounded-lg p-3">
                      <div className="w-16 shrink-0">
                        <Badge variant={
                          row.label === 'Good' ? 'good' :
                          row.label === 'Moderate' ? 'moderate' :
                          row.label === 'Unhealthy for Sensitive' ? 'unhealthy_sensitive' :
                          row.label === 'Unhealthy' ? 'unhealthy' :
                          row.label === 'Very Unhealthy' ? 'very_unhealthy' : 'hazardous'
                        } className="whitespace-nowrap">
                          {row.range}
                        </Badge>
                      </div>
                      <span className="text-sm font-medium text-text-primary w-36 shrink-0" style={{ color: row.color }}>{row.label}</span>
                      <p className="text-xs text-text-secondary">{row.advice}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-neon-primary" /> Today's Safe Activity Hours
                  {currentAQI && <span className="text-xs text-text-secondary ml-2">(AQI: {currentAQI.aqi})</span>}
                </h3>
                {safeHours.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-4">Loading safe hours...</p>
                ) : (
                  <div className="space-y-1">
                    {safeHours.map((h) => (
                      <div key={h.time} className="flex items-center gap-3 glass rounded-lg px-3 py-2">
                        <Clock className={`h-4 w-4 shrink-0 ${h.safe ? 'text-aqi-good' : 'text-neon-danger'}`} />
                        <span className="text-xs font-mono text-text-secondary w-24">{h.time}</span>
                        <span className={`text-xs ${h.safe ? 'text-aqi-good' : 'text-neon-danger'}`}>
                          {h.safe ? '✓ Safe' : '✗ Limit'}
                        </span>
                        <span className="text-xs text-text-secondary flex-1">{h.activity}</span>
                        <Badge variant={h.risk === 'Low' ? 'good' : h.risk === 'Moderate' ? 'moderate' : 'unhealthy'}>
                          {h.risk}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-neon-primary" /> Symptom Risk Badges
                </h3>
                {symptomRisks.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-4">Loading symptom risks...</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {symptomRisks.map((s) => (
                      <div key={s.symptom} className="glass rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-text-primary">{s.symptom}</span>
                          <Badge variant={s.risk === 'High' ? 'hazardous' : s.risk === 'Moderate' ? 'unhealthy' : 'unhealthy_sensitive'}>
                            {s.risk}
                          </Badge>
                        </div>
                        <Progress value={s.probability} color={s.risk === 'High' ? 'danger' : s.risk === 'Moderate' ? 'warning' : 'neon'} showLabel />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </FadeIn>

          <FadeIn direction="right">
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-neon-primary" /> Personal Risk Profile
                </h3>
                <div className="space-y-2">
                  {HEALTH_PROFILES.map((p) => {
                    const PIcon = profileIcons[p.id] || Users
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProfile(p.id)}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all ${
                          selectedProfile === p.id
                            ? 'bg-neon-primary/10 text-neon-primary border border-neon-primary/30'
                            : 'text-text-secondary hover:text-text-primary border border-transparent'
                        }`}
                      >
                        <PIcon className="h-4 w-4" />
                        <span className="flex-1 text-left">{p.label}</span>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: riskColors[p.risk] || '#FFB800' }} />
                      </button>
                    )
                  })}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">Risk Gradient Meter</h3>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(15,31,61,0.3)" strokeWidth="6" />
                      <motion.circle
                        cx="32" cy="32" r="28" fill="none"
                        stroke={riskColors[profile.risk] || '#FFB800'}
                        strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 28}
                        initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - (profile.risk === 'low' ? 0.2 : profile.risk === 'moderate' ? 0.4 : profile.risk === 'high' ? 0.7 : 0.9)) }}
                        transition={{ duration: 1 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon className="h-6 w-6" style={{ color: riskColors[profile.risk] || '#FFB800' }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{profile.label}</p>
                    <p className="text-xs text-text-secondary capitalize">Risk Level: {profile.risk.replace('_', ' ')}</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {currentAQI ? `Current AQI: ${currentAQI.aqi}${currentAQI.source ? ` · ${currentAQI.source}` : ''}` : 'Loading AQI...'}
                    </p>
                    {advisory && (
                      <p className="text-xs text-text-secondary mt-1">Advisory: {advisory.advice.slice(0, 60)}...</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">Hospital Admission Probability</h3>
                <div className="text-center">
                  <p className="text-3xl font-display font-bold text-neon-danger">{hospitalProb}%</p>
                  <p className="text-xs text-text-secondary">Based on current AQI ({aqiValue})</p>
                  <Progress value={hospitalProb} color="danger" className="mt-3" showLabel />
                </div>
              </Card>
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  )
}
