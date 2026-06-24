'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FadeIn } from '@/components/motion/FadeIn'
import { getCurrentAQI } from '@/lib/api'
import { Camera, Video, AlertTriangle, MapPin, Eye, EyeOff, Target, Box, Shield, Wifi, WifiOff, Loader2 } from 'lucide-react'

const MOCK_DETECTIONS = [
  { id: 'd1', label: 'Smoke Plume', confidence: 0.94, bbox: { x: 120, y: 80, w: 200, h: 150 }, severity: 'high' },
  { id: 'd2', label: 'Vehicle (Heavy Diesel)', confidence: 0.88, bbox: { x: 350, y: 200, w: 180, h: 100 }, severity: 'medium' },
  { id: 'd3', label: 'Construction Dust', confidence: 0.82, bbox: { x: 500, y: 150, w: 250, h: 120 }, severity: 'medium' },
  { id: 'd4', label: 'Open Burning', confidence: 0.91, bbox: { x: 200, y: 300, w: 220, h: 160 }, severity: 'high' },
  { id: 'd5', label: 'Industrial Stack Emission', confidence: 0.79, bbox: { x: 600, y: 50, w: 150, h: 200 }, severity: 'medium' },
  { id: 'd6', label: 'Dust from Construction', confidence: 0.76, bbox: { x: 50, y: 220, w: 180, h: 110 }, severity: 'low' },
]

const DETECTION_LOCATIONS = [
  { id: 'loc1', label: 'Narol Industrial Zone', count: 12, severity: 'high' },
  { id: 'loc2', label: 'SG Highway Corridor', count: 8, severity: 'medium' },
  { id: 'loc3', label: 'Sabarmati Riverfront', count: 5, severity: 'medium' },
  { id: 'loc4', label: 'CG Road Intersection', count: 4, severity: 'low' },
]

export default function CameraPage() {
  const [showOverlay, setShowOverlay] = useState(true)
  const [selectedDetection, setSelectedDetection] = useState<string | null>(null)
  const [alertGeneration, setAlertGeneration] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [mlServiceConnected, setMlServiceConnected] = useState<boolean | null>(null)
  const [checkingConnection, setCheckingConnection] = useState(true)

  useEffect(() => {
    const checkMLService = async () => {
      setCheckingConnection(true)
      try {
        const result = await getCurrentAQI()
        if (result.data) {
          setMlServiceConnected(false)
        } else {
          setMlServiceConnected(false)
        }
      } catch {
        setMlServiceConnected(false)
      }
      setCheckingConnection(false)
    }
    checkMLService()
  }, [])

  const avgConfidence = MOCK_DETECTIONS.reduce((s, d) => s + d.confidence, 0) / MOCK_DETECTIONS.length * 100

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <FadeIn direction="up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="h-6 w-6 text-neon-primary" />
            <h1 className="text-2xl font-display font-bold text-text-primary">AI Camera Monitoring</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="flex items-center gap-1">
              <Box className="h-3 w-3" /> YOLOv8
            </Badge>
            {checkingConnection ? (
              <Badge variant="default" className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking...
              </Badge>
            ) : mlServiceConnected === false ? (
              <Badge variant="unhealthy" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" /> ML Service Offline
              </Badge>
            ) : (
              <Badge variant="good" className="flex items-center gap-1">
                <Wifi className="h-3 w-3" /> ML Service Online
              </Badge>
            )}
            <Badge variant={isStreaming ? 'good' : 'unhealthy'}>
              {isStreaming ? 'Live' : 'Offline'}
            </Badge>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FadeIn direction="left" className="lg:col-span-2">
          <div className="space-y-4">
            <Card className="p-0 overflow-hidden relative">
              <div className="relative bg-bg-tertiary" style={{ height: '400px' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  {!isStreaming ? (
                    <div className="text-center">
                      <Video className="h-16 w-16 text-text-secondary mx-auto mb-3" />
                      <p className="text-text-secondary mb-4">Camera feed disconnected</p>
                      <Button variant="neon" onClick={() => setIsStreaming(true)}>
                        <Video className="h-4 w-4" /> Start Stream
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-bg-secondary to-bg-tertiary">
                        <div className="absolute inset-0 grid-overlay opacity-30" />
                        <div className="absolute top-4 left-4 glass rounded-lg px-3 py-1.5 text-xs text-neon-primary flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-neon-danger animate-pulse" />
                          REC · CAM-01
                        </div>
                        <div className="absolute top-4 right-4 flex gap-2">
                          <button
                            onClick={() => setShowOverlay(!showOverlay)}
                            className="glass rounded-lg p-2 hover:bg-neon-primary/10 transition-colors"
                          >
                            {showOverlay ? <Eye className="h-4 w-4 text-neon-primary" /> : <EyeOff className="h-4 w-4 text-text-secondary" />}
                          </button>
                        </div>
                      </div>

                      {showOverlay && MOCK_DETECTIONS.map((det) => (
                        <motion.div
                          key={det.id}
                          className="absolute border-2 cursor-pointer transition-colors"
                          style={{
                            left: det.bbox.x,
                            top: det.bbox.y,
                            width: det.bbox.w,
                            height: det.bbox.h,
                            borderColor: det.confidence > 0.9 ? '#FF3D71' : det.confidence > 0.8 ? '#FFB800' : '#00D4FF',
                            backgroundColor: det.confidence > 0.9 ? 'rgba(255,61,113,0.1)' : 'rgba(255,184,0,0.05)',
                          }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={() => setSelectedDetection(selectedDetection === det.id ? null : det.id)}
                        >
                          <span className={`absolute -top-5 left-0 text-[10px] px-1.5 py-0.5 rounded-t text-white whitespace-nowrap ${
                            det.confidence > 0.9 ? 'bg-neon-danger' : det.confidence > 0.8 ? 'bg-neon-warning' : 'bg-neon-secondary'
                          }`}>
                            {det.label} ({(det.confidence * 100).toFixed(0)}%)
                          </span>
                        </motion.div>
                      ))}

                      {!mlServiceConnected && (
                        <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-1.5 text-[10px] text-neon-warning flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3" />
                          Detections are simulated — ML service (YOLOv8) is offline
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Target className="h-4 w-4 text-neon-primary" /> Detection List
                </h3>
                <div className="flex items-center gap-2">
                  {!mlServiceConnected && (
                    <Badge variant="unhealthy_sensitive" className="text-[9px]">Simulated</Badge>
                  )}
                  <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                    <input type="checkbox" checked={alertGeneration} onChange={() => setAlertGeneration(!alertGeneration)} className="w-3.5 h-3.5 rounded border-neon-primary/30 bg-bg-secondary text-neon-primary" />
                    Auto-alert
                  </label>
                </div>
              </div>
              <div className="space-y-1">
                {MOCK_DETECTIONS.map((det, i) => (
                  <motion.div
                    key={det.id}
                    className={`flex items-center justify-between glass rounded-lg p-2.5 cursor-pointer transition-all ${
                      selectedDetection === det.id ? 'border border-neon-primary/40' : ''
                    }`}
                    onClick={() => setSelectedDetection(selectedDetection === det.id ? null : det.id)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        det.confidence > 0.9 ? 'bg-neon-danger' : det.confidence > 0.8 ? 'bg-neon-warning' : 'bg-neon-secondary'
                      }`} />
                      <span className="text-sm text-text-primary">{det.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${
                        det.confidence > 0.9 ? 'text-neon-danger' : det.confidence > 0.8 ? 'text-neon-warning' : 'text-neon-secondary'
                      }`}>
                        {(det.confidence * 100).toFixed(0)}%
                      </span>
                      <Badge variant={det.severity === 'high' ? 'hazardous' : det.severity === 'medium' ? 'unhealthy' : 'unhealthy_sensitive'}>
                        {det.severity}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>
        </FadeIn>

        <FadeIn direction="right">
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-neon-primary" /> Detection Map
              </h3>
              <div className="space-y-2">
                {DETECTION_LOCATIONS.map((loc) => (
                  <div key={loc.id} className="glass rounded-lg p-3 flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-neon-primary shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-text-primary">{loc.label}</p>
                      <p className="text-xs text-text-secondary">{loc.count} detections</p>
                    </div>
                    <Badge variant={loc.severity === 'high' ? 'hazardous' : loc.severity === 'medium' ? 'unhealthy' : 'unhealthy_sensitive'}>
                      {loc.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">Camera Controls</h3>
              <div className="space-y-2">
                <Button variant={isStreaming ? 'destructive' : 'neon'} className="w-full" onClick={() => setIsStreaming(!isStreaming)}>
                  <Video className="h-4 w-4" /> {isStreaming ? 'Stop Stream' : 'Start Stream'}
                </Button>
                <Button variant="outline" className="w-full">
                  <Camera className="h-4 w-4" /> Snapshot
                </Button>
                <label className="flex items-center justify-between glass rounded-lg p-3 cursor-pointer text-sm">
                  <span className="text-text-primary">Detection Overlay</span>
                  <input type="checkbox" checked={showOverlay} onChange={() => setShowOverlay(!showOverlay)} className="w-4 h-4 rounded border-neon-primary/30 bg-bg-secondary text-neon-primary" />
                </label>
                <label className="flex items-center justify-between glass rounded-lg p-3 cursor-pointer text-sm">
                  <span className="text-text-primary">Auto-generate Alerts</span>
                  <input type="checkbox" checked={alertGeneration} onChange={() => setAlertGeneration(!alertGeneration)} className="w-4 h-4 rounded border-neon-primary/30 bg-bg-secondary text-neon-primary" />
                </label>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total Detections</span>
                  <span className="text-text-primary font-mono">{MOCK_DETECTIONS.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">High Severity</span>
                  <span className="text-neon-danger font-mono">{MOCK_DETECTIONS.filter(d => d.severity === 'high').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Avg Confidence</span>
                  <span className="text-text-primary font-mono">{avgConfidence.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Alerts Generated</span>
                  <span className="text-neon-warning font-mono">24</span>
                </div>
              </div>
              {!mlServiceConnected && (
                <div className="mt-3 pt-3 border-t border-neon-primary/10">
                  <p className="text-[10px] text-neon-warning flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    All statistics are simulated. YOLOv8 ML service is not connected.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}
