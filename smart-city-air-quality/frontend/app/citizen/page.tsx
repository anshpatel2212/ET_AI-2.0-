'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { FadeIn } from '@/components/motion/FadeIn'
import { getAQINearMe, getMyReports, getCurrentAQI } from '@/lib/api'
import type { NearbyStation, Report, AqiCurrentResponse } from '@/lib/api'
import { Users, Phone, MapPin, Camera, Upload, Award, Bell, Send, Flag, CheckCircle2, Clock, Navigation, Loader2, AlertCircle } from 'lucide-react'

const REPORT_CATEGORIES = [
  { id: 'smoke', label: 'Smoke Emission', icon: Flag },
  { id: 'dust', label: 'Construction Dust', icon: Flag },
  { id: 'garbage', label: 'Garbage Burning', icon: Flag },
  { id: 'industrial', label: 'Industrial Smoke', icon: Flag },
  { id: 'vehicle', label: 'Vehicle Emission', icon: Flag },
]

export default function CitizenPage() {
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [reportCategory, setReportCategory] = useState('')
  const [reportDesc, setReportDesc] = useState('')

  const [nearbyStations, setNearbyStations] = useState<NearbyStation[]>([])
  const [myReports, setMyReports] = useState<Report[]>([])
  const [loadingNearby, setLoadingNearby] = useState(true)
  const [loadingReports, setLoadingReports] = useState(false)
  const [nearbyError, setNearbyError] = useState<string | null>(null)
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [locationDenied, setLocationDenied] = useState(false)
  const [currentCityAQI, setCurrentCityAQI] = useState<AqiCurrentResponse | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true)
      fetchFallbackAQI()
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const result = await getAQINearMe(latitude, longitude)
        if (result.data) {
          setNearbyStations(result.data)
        }
        if (result.error) {
          setNearbyError(result.error)
        }
        setLoadingNearby(false)
      },
      async () => {
        setLocationDenied(true)
        await fetchFallbackAQI()
        setLoadingNearby(false)
      }
    )
  }, [])

  const fetchFallbackAQI = async () => {
    const result = await getCurrentAQI()
    if (result.data) {
      setCurrentCityAQI(result.data)
    }
    if (result.error) {
      setNearbyError(result.error)
    }
  }

  useEffect(() => {
    if (!loggedIn) return
    const fetchReports = async () => {
      setLoadingReports(true)
      const result = await getMyReports()
      if (result.data) {
        setMyReports(result.data)
      }
      if (result.error) {
        setReportsError(result.error)
      }
      setLoadingReports(false)
    }
    fetchReports()
  }, [loggedIn])

  const handleLogin = () => {
    if (phone.length === 10) {
      setOtpSent(true)
    }
  }

  const handleVerifyOtp = () => {
    if (otp.length === 6) {
      setLoggedIn(true)
    }
  }

  const stationList = locationDenied && currentCityAQI
    ? [{
        stationId: currentCityAQI.station?.stationId || 'city',
        stationName: currentCityAQI.station?.stationName || 'City Center',
        aqi: currentCityAQI.aqi,
        distance: 0,
        city: 'Ahmedabad',
        ward: '',
        location: { type: 'Point' as const, coordinates: [0, 0] as [number, number] },
        status: 'active',
        type: 'government',
        aqiCategory: currentCityAQI.aqiCategory,
      }]
    : nearbyStations

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <FadeIn direction="up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-neon-primary" />
            <h1 className="text-2xl font-display font-bold text-text-primary">Citizen Portal</h1>
          </div>
          {!loggedIn ? (
            <Badge variant="outline">Not logged in</Badge>
          ) : (
            <Badge variant="good" className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Verified Citizen
            </Badge>
          )}
        </div>
      </FadeIn>

      {!loggedIn ? (
        <FadeIn direction="up">
          <Card className="max-w-md mx-auto p-6">
            <div className="text-center mb-6">
              <Phone className="h-10 w-10 text-neon-primary mx-auto mb-2" />
              <h2 className="text-lg font-display font-semibold text-text-primary">Login with Mobile OTP</h2>
              <p className="text-sm text-text-secondary">Enter your mobile number to receive a one-time password</p>
            </div>
            {!otpSent ? (
              <div className="space-y-4">
                <Input label="Mobile Number" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
                <Button className="w-full" onClick={handleLogin}>
                  <Send className="h-4 w-4" /> Send OTP
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Input label="Enter OTP" placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                <Button className="w-full" onClick={handleVerifyOtp}>
                  <CheckCircle2 className="h-4 w-4" /> Verify & Login
                </Button>
                <button className="w-full text-sm text-neon-primary hover:underline" onClick={() => { setOtpSent(false); setOtp('') }}>
                  Change number
                </button>
              </div>
            )}
          </Card>
        </FadeIn>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <FadeIn direction="left" className="lg:col-span-2">
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-neon-primary" /> AQI Near Me
                  </h3>
                  {loadingNearby ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 text-neon-primary animate-spin" />
                    </div>
                  ) : nearbyError ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <AlertCircle className="h-8 w-8 text-neon-danger mb-2" />
                      <p className="text-sm text-text-secondary">{nearbyError}</p>
                    </div>
                  ) : stationList.length === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-4">No nearby stations found.</p>
                  ) : (
                    <div className="space-y-2">
                      {stationList.map((s) => (
                        <div key={s.stationId} className="flex items-center justify-between glass rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-neon-primary" />
                            <div>
                              <p className="text-sm text-text-primary font-medium">{s.stationName}</p>
                              <p className="text-xs text-text-secondary">{'distance' in s && s.distance !== undefined ? `${s.distance.toFixed(1)} km away` : 'City AQI'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-display font-bold text-neon-primary">{s.aqi}</p>
                            <p className="text-[10px] text-text-secondary">AQI</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                      <Flag className="h-4 w-4 text-neon-primary" /> Report an Incident
                    </h3>
                    <Button variant="neon" size="sm" onClick={() => setShowForm(!showForm)}>
                      <Camera className="h-3.5 w-3.5" /> New Report
                    </Button>
                  </div>

                  {showForm && (
                    <motion.div
                      className="space-y-4"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <div className="flex gap-2 flex-wrap">
                        {REPORT_CATEGORIES.map((cat) => {
                          const Icon = cat.icon
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setReportCategory(cat.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                reportCategory === cat.id
                                  ? 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30'
                                  : 'text-text-secondary border border-transparent hover:text-text-primary'
                              }`}
                            >
                              <Icon className="h-3 w-3" /> {cat.label}
                            </button>
                          )
                        })}
                      </div>
                      <textarea
                        placeholder="Describe what you see (smoke, dust, odour, etc.)"
                        value={reportDesc}
                        onChange={(e) => setReportDesc(e.target.value)}
                        className="w-full h-24 rounded-lg border border-neon-primary/20 bg-bg-secondary/50 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 backdrop-blur-sm focus:border-neon-primary focus:shadow-neon-sm focus:outline-none resize-none"
                      />
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm">
                          <Upload className="h-3.5 w-3.5" /> Upload Photo
                        </Button>
                        <span className="text-xs text-text-secondary">Auto-location enabled</span>
                      </div>
                      <Button variant="neon" onClick={() => setShowForm(false)}>
                        <Send className="h-4 w-4" /> Submit Report
                      </Button>
                    </motion.div>
                  )}

                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs text-text-secondary uppercase tracking-wider">Your Reports</h4>
                    {loadingReports ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 text-neon-primary animate-spin" />
                      </div>
                    ) : reportsError ? (
                      <div className="flex items-center justify-center py-4 text-center">
                        <AlertCircle className="h-5 w-5 text-neon-danger mr-2" />
                        <p className="text-xs text-text-secondary">{reportsError}</p>
                      </div>
                    ) : myReports.length === 0 ? (
                      <p className="text-xs text-text-secondary text-center py-4">No reports yet. Submit your first report above.</p>
                    ) : (
                      myReports.map((r) => (
                        <div key={r.id} className="flex items-center justify-between glass rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${r.status === 'resolved' ? 'bg-aqi-good/20' : r.status === 'in_progress' ? 'bg-neon-warning/20' : 'bg-neon-primary/20'}`}>
                              {r.status === 'resolved' ? <CheckCircle2 className="h-4 w-4 text-aqi-good" /> : r.status === 'in_progress' ? <Clock className="h-4 w-4 text-neon-warning" /> : <Flag className="h-4 w-4 text-neon-primary" />}
                            </div>
                            <div>
                              <p className="text-sm text-text-primary">{r.description.slice(0, 50)}...</p>
                              <p className="text-xs text-text-secondary">{r.category} · {new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                            </div>
                          </div>
                          <Badge variant={r.status === 'resolved' ? 'good' : r.status === 'in_progress' ? 'unhealthy_sensitive' : 'default'}>
                            {r.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </FadeIn>

            <FadeIn direction="right">
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-neon-primary" /> Green Points Leaderboard
                  </h3>
                  <p className="text-xs text-text-secondary text-center py-4">Leaderboard data coming soon. Start reporting to earn points!</p>
                </Card>

                <Card className="p-4">
                  <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-neon-primary" /> Subscribe to Alerts
                  </h3>
                  <div className="space-y-2">
                    {['Critical Alerts', 'Daily AQI Report', 'Health Advisory', 'Nearby Incidents'].map((sub) => (
                      <label key={sub} className="flex items-center justify-between glass rounded-lg p-3 cursor-pointer">
                        <span className="text-sm text-text-primary">{sub}</span>
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-neon-primary/30 bg-bg-secondary text-neon-primary focus:ring-neon-primary" />
                      </label>
                    ))}
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
