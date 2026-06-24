'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StationMarker } from './StationMarker'
import { LayerPanel } from './LayerPanel'
import { cn } from '@/lib/utils'
import { AHMEDABAD_CENTER, MAP_ZOOM } from '@/lib/constants'
import { getStations, getStationAQI } from '@/lib/api'
import type { StationInfo } from '@/lib/api'
import { X, Maximize2, Minimize2, MapPin, Wind, Factory, School, Cross, Loader2 } from 'lucide-react'

interface MapStation {
  id: string
  name: string
  lat: number
  lng: number
  aqi: number
  status: string
}

const DEFAULT_LAYERS = [
  { id: 'heatmap', label: 'Pollution Heatmap', enabled: true, color: '#00F5A0' },
  { id: 'hotspots', label: 'Hotspots', enabled: true, color: '#FF3D71' },
  { id: 'stations', label: 'Stations', enabled: true, color: '#00D4FF' },
  { id: 'traffic', label: 'Traffic', enabled: false, color: '#FFB800' },
  { id: 'industrial', label: 'Industrial Zones', enabled: false, color: '#7B61FF' },
  { id: 'schools', label: 'Schools', enabled: false, color: '#00E400' },
  { id: 'hospitals', label: 'Hospitals', enabled: true, color: '#FF3D71' },
  { id: 'wind', label: 'Wind Particles', enabled: false, color: '#00D4FF' },
]

export function PollutionMap() {
  const [layers, setLayers] = useState(DEFAULT_LAYERS)
  const [selectedStation, setSelectedStation] = useState<any | null>(null)
  const [selectedStationAqi, setSelectedStationAqi] = useState<{ pm25?: number; pm10?: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(MAP_ZOOM)
  const [center, setCenter] = useState(AHMEDABAD_CENTER)
  const [stations, setStations] = useState<MapStation[]>([])
  const [mapLoading, setMapLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const offset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const fetchStations = async () => {
      const result = await getStations('Ahmedabad')
      if (result.data) {
        setStations(
          result.data.map((s: StationInfo) => ({
            id: s.stationId,
            name: s.stationName,
            lat: s.location.coordinates[1],
            lng: s.location.coordinates[0],
            aqi: s.aqi ?? 0,
            status: s.status,
          }))
        )
      }
      setMapLoading(false)
    }
    fetchStations()
  }, [])

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)))
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    offset.current = { x: offset.current.x + dx, y: offset.current.y + dy }
    dragStart.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((prev) => Math.max(8, Math.min(16, prev - e.deltaY * 0.001)))
  }, [])

  const handleStationClick = useCallback(async (station: MapStation) => {
    setSelectedStation(station)
    setSelectedStationAqi(null)
    const result = await getStationAQI(station.id)
    if (result.data) {
      setSelectedStationAqi({ pm25: result.data.pm25, pm10: result.data.pm10 })
    }
  }, [])

  const stationPositions = stations.map((s) => ({
    x: (s.lng - AHMEDABAD_CENTER[0]) * 80 + 400 + offset.current.x,
    y: (AHMEDABAD_CENTER[1] - s.lat) * 80 + 300 + offset.current.y,
    ...s,
  }))

  const minX = stationPositions.length > 0 ? Math.min(...stationPositions.map((s) => s.x)) : 0
  const maxX = stationPositions.length > 0 ? Math.max(...stationPositions.map((s) => s.x)) : 800
  const minY = stationPositions.length > 0 ? Math.min(...stationPositions.map((s) => s.y)) : 0
  const maxY = stationPositions.length > 0 ? Math.max(...stationPositions.map((s) => s.y)) : 600

  const mapWidth = Math.max(800, maxX - minX + 200)
  const mapHeight = Math.max(600, maxY - minY + 200)

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden rounded-xl glass', isFullscreen && 'fixed inset-0 z-50 rounded-none')}
      style={{ height: isFullscreen ? '100vh' : '600px' }}
    >
      {mapLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/60 z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-2 border-neon-primary/20 border-t-neon-primary animate-spin" />
              <div className="absolute inset-0 h-10 w-10 rounded-full bg-neon-primary/5 blur-xl" />
            </div>
            <p className="text-text-secondary text-xs font-mono">Loading stations...</p>
          </div>
        </div>
      ) : null}

      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,245,160,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,245,160,0.03) 1px, transparent 1px)
          `,
          backgroundSize: `${40 * (zoom / MAP_ZOOM)}px ${40 * (zoom / MAP_ZOOM)}px`,
          transform: `scale(${zoom / MAP_ZOOM})`,
          transformOrigin: 'center center',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/0 via-bg-primary/0 to-bg-primary/30" />

        {layers.find((l) => l.id === 'heatmap')?.enabled && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute rounded-full blur-3xl opacity-20"
              style={{
                left: '30%',
                top: '40%',
                width: '40%',
                height: '40%',
                background: 'radial-gradient(circle, #FF3D71, #FF7E00, transparent)',
              }}
            />
            <div
              className="absolute rounded-full blur-3xl opacity-15"
              style={{
                left: '50%',
                top: '30%',
                width: '30%',
                height: '30%',
                background: 'radial-gradient(circle, #FFB800, #FF7E00, transparent)',
              }}
            />
          </div>
        )}

        {layers.find((l) => l.id === 'stations')?.enabled && (
          <div className="absolute inset-0">
            {stationPositions.map((station) => (
              <div
                key={station.id}
                className="absolute"
                style={{
                  left: station.x - 24,
                  top: station.y - 24,
                  transform: `scale(${zoom / MAP_ZOOM})`,
                }}
              >
                <StationMarker
                  aqi={station.aqi}
                  name={station.name}
                  selected={selectedStation?.id === station.id}
                  onClick={() => handleStationClick(station)}
                />
              </div>
            ))}
          </div>
        )}

        {layers.find((l) => l.id === 'schools')?.enabled && (
          <div className="absolute pointer-events-none">
            {[
              { x: 350, y: 250, name: 'Sample Location' },
              { x: 500, y: 350, name: 'Sample Location' },
            ].map((s, i) => (
              <div key={`school-${i}`} className="absolute flex items-center gap-1" style={{ left: s.x, top: s.y }}>
                <School className="h-4 w-4 text-aqi-good" />
                <span className="text-[9px] text-aqi-good">{s.name}</span>
              </div>
            ))}
          </div>
        )}

        {layers.find((l) => l.id === 'hospitals')?.enabled && (
          <div className="absolute pointer-events-none">
            {[
              { x: 420, y: 300, name: 'Sample Location' },
              { x: 380, y: 280, name: 'Sample Location' },
            ].map((s, i) => (
              <div key={`hospital-${i}`} className="absolute flex items-center gap-1" style={{ left: s.x, top: s.y }}>
                <Cross className="h-4 w-4 text-neon-danger" />
                <span className="text-[9px] text-neon-danger">{s.name}</span>
              </div>
            ))}
          </div>
        )}

        {layers.find((l) => l.id === 'industrial')?.enabled && (
          <div className="absolute pointer-events-none">
            <div className="absolute p-2 border border-neon-tertiary/30 rounded-lg bg-neon-tertiary/10" style={{ left: 550, top: 400 }}>
              <Factory className="h-5 w-5 text-neon-tertiary" />
              <span className="text-[9px] text-neon-tertiary">Industrial Zone</span>
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 z-10 space-y-2">
        <button
          onClick={toggleFullscreen}
          className="glass rounded-lg p-2 hover:bg-neon-primary/10 transition-colors"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4 text-neon-primary" /> : <Maximize2 className="h-4 w-4 text-neon-primary" />}
        </button>
        <div className="flex flex-col gap-1">
          <button onClick={() => setZoom((z) => Math.min(16, z + 0.5))} className="glass rounded-lg p-2 hover:bg-neon-primary/10 transition-colors text-neon-primary text-sm font-bold">+</button>
          <button onClick={() => setZoom((z) => Math.max(8, z - 0.5))} className="glass rounded-lg p-2 hover:bg-neon-primary/10 transition-colors text-neon-primary text-sm font-bold">-</button>
        </div>
      </div>

      <div className="absolute top-4 left-4 z-10">
        <LayerPanel layers={layers} onToggle={toggleLayer} />
      </div>

      <div className="absolute bottom-4 left-4 z-10 glass rounded-lg px-3 py-2">
        <span className="text-xs text-text-secondary font-mono">
          Zoom: {zoom.toFixed(1)}x | {stationPositions.length} stations
        </span>
      </div>

      <AnimatePresence>
        {selectedStation && (
          <motion.div
            className="absolute top-4 right-72 z-10 glass rounded-xl p-4 w-64"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-neon-primary" />
                <span className="text-sm font-medium text-text-primary">{selectedStation.name}</span>
              </div>
              <button onClick={() => setSelectedStation(null)} className="text-text-secondary hover:text-text-primary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">AQI</span>
                <span className="font-mono text-neon-primary font-bold">{selectedStation.aqi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Status</span>
                <span className="text-aqi-good">{selectedStation.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">PM2.5</span>
                <span className="font-mono text-text-primary">
                  {selectedStationAqi?.pm25 !== undefined ? `${selectedStationAqi.pm25} µg/m³` : '...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">PM10</span>
                <span className="font-mono text-text-primary">
                  {selectedStationAqi?.pm10 !== undefined ? `${selectedStationAqi.pm10} µg/m³` : '...'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
