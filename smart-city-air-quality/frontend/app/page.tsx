'use client'

import { useRef, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { AQIHeroCard } from '@/components/aqicards/AQIHeroCard'
import { AQILineChart } from '@/components/charts/AQILineChart'
import { FadeIn } from '@/components/motion/FadeIn'
import { StaggerContainer } from '@/components/motion/StaggerContainer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useCurrentAQI, useStations, useActiveAlerts, useStationHistory } from '@/hooks/useAQI'
import { useStore } from '@/stores/useStore'
import { Activity, Map, BarChart3, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import * as THREE from 'three'

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { scrollYProgress } = useScroll()
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.8])

  const selectedCity = useStore((s) => s.selectedCity)
  const { data: aqiResult, isLoading: aqiLoading } = useCurrentAQI(selectedCity)
  const { data: stationsResult } = useStations()
  const { data: alertsResult } = useActiveAlerts(selectedCity)
  const stations = stationsResult?.data ?? []
  const firstStationId = stations.length > 0 ? stations[0].stationId : ''
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: historyResult } = useStationHistory(firstStationId, { from })

  const aqiData = aqiResult?.data ?? null
  const alerts = alertsResult?.data ?? []
  const chartData = (historyResult?.data ?? []).map((h: any) => ({
    hour: h.timestamp,
    aqi: h.aqi,
    pm25: h.pm25,
    pm10: h.pm10,
    co: h.co,
    no2: h.no2,
    o3: h.o3,
  }))

  useEffect(() => {
    if (!canvasRef.current || typeof window === 'undefined') return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const particlesGeometry = new THREE.BufferGeometry()
    const count = 2000
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 50
      positions[i + 1] = (Math.random() - 0.5) * 50
      positions[i + 2] = (Math.random() - 0.5) * 20 - 10
    }
    for (let i = 0; i < count; i++) {
      sizes[i] = Math.random() * 3 + 1
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.05,
      color: new THREE.Color('#00F5A0'),
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    const particles = new THREE.Points(particlesGeometry, particlesMaterial)
    scene.add(particles)

    const particles2Material = new THREE.PointsMaterial({
      size: 0.03,
      color: new THREE.Color('#00D4FF'),
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    const particles2 = new THREE.Points(particlesGeometry.clone(), particles2Material)
    particles2.rotation.x = Math.PI / 4
    scene.add(particles2)

    camera.position.z = 15

    let mouseX = 0
    let mouseY = 0

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handleMouseMove)

    const animate = () => {
      requestAnimationFrame(animate)
      particles.rotation.y += 0.0005
      particles.rotation.x += 0.0002
      particles2.rotation.y += 0.0003
      particles2.rotation.x += 0.0001
      particles.rotation.x += (mouseY * 0.02 - particles.rotation.x) * 0.01
      particles.rotation.y += (mouseX * 0.02 - particles.rotation.y) * 0.01
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
    }
  }, [])

  const weatherData = aqiData
    ? {
        temperature: aqiData.temperature ?? 0,
        humidity: aqiData.humidity ?? 0,
        windSpeed: aqiData.windSpeed ?? 0,
        visibility: aqiData.visibility ?? 0,
      }
    : undefined

  const stationCount = stations.length
  const alertCount = alerts.length

  const QUICK_ACTIONS = [
    { title: 'Real-Time Monitoring', description: `Live sensor data from ${stationCount} stations across Ahmedabad`, icon: Activity, color: '#00F5A0', href: '/monitor' },
    { title: 'Pollution Map', description: 'Interactive map with heatmap and station markers', icon: Map, color: '#00D4FF', href: '/map' },
    { title: 'AI Predictions', description: '24h to 7d forecast powered by deep learning', icon: BarChart3, color: '#7B61FF', href: '/predict' },
    { title: 'Active Alerts', description: `${alertCount} active alert${alertCount !== 1 ? 's' : ''} requiring immediate attention`, icon: AlertTriangle, color: '#FF3D71', href: '/alerts' },
  ]

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />

      {aqiLoading ? (
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-neon-primary/20 border-t-neon-primary animate-spin" />
              <div className="absolute inset-0 h-12 w-12 rounded-full bg-neon-primary/5 blur-xl" />
            </div>
            <p className="text-text-secondary text-sm font-mono">Loading live air quality data...</p>
            <div className="h-1 w-48 bg-bg-tertiary rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-neon-primary rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      ) : aqiResult?.error && stationsResult?.error ? (
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="glass rounded-2xl p-8 max-w-md text-center">
            <AlertTriangle className="h-12 w-12 text-neon-danger mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-text-primary mb-2">Unable to Load Data</h2>
            <p className="text-text-secondary text-sm mb-4">{aqiResult.error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      ) : (
        <div className="relative z-10">
          <motion.div style={{ scale: heroScale, opacity: heroOpacity }} className="pt-8 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <AQIHeroCard aqi={aqiData?.aqi ?? 0} weather={weatherData} change={0} />
              {aqiData && (
                <div className="flex items-center justify-center gap-6 mt-3 text-xs text-text-secondary">
                  <span>Source: <span className="text-text-primary font-medium">{aqiData.source}</span></span>
                  <span className="w-px h-3 bg-bg-tertiary" />
                  <span>Confidence: <span className="text-text-primary font-medium">{(aqiData.confidence * 100).toFixed(0)}%</span></span>
                </div>
              )}
            </div>
          </motion.div>

          <FadeIn direction="up" delay={0.3}>
            <div className="px-4 sm:px-6 lg:px-8 pb-8">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-display font-semibold text-text-primary">24-Hour Trend</h2>
                  <Link href="/predict">
                    <Button variant="ghost" size="sm">
                      Full Forecast <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                {chartData.length > 0 ? (
                  <AQILineChart data={chartData} pollutants={['aqi', 'pm25', 'pm10']} height={250} />
                ) : (
                  <div className="glass rounded-xl p-8 text-center text-text-secondary text-sm">
                    No historical data currently available.
                  </div>
                )}
              </div>
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={0.5}>
            <div className="px-4 sm:px-6 lg:px-8 pb-16">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-lg font-display font-semibold text-text-primary mb-4">Quick Actions</h2>
                <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon
                    return (
                      <Link key={action.href} href={action.href}>
                        <Card glow="neon" className="h-full group cursor-pointer">
                          <div className="flex flex-col items-start gap-3">
                            <div className="p-3 rounded-xl" style={{ backgroundColor: `${action.color}15` }}>
                              <Icon className="h-6 w-6" style={{ color: action.color }} />
                            </div>
                            <h3 className="text-base font-display font-semibold text-text-primary group-hover:text-neon-primary transition-colors">
                              {action.title}
                            </h3>
                            <p className="text-sm text-text-secondary">{action.description}</p>
                            <div className="flex items-center gap-1 text-xs text-neon-primary mt-auto pt-2">
                              Explore <ArrowRight className="h-3 w-3" />
                            </div>
                          </div>
                        </Card>
                      </Link>
                    )
                  })}
                </StaggerContainer>
              </div>
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  )
}
