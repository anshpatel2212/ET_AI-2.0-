import type { AqiCurrentResponse, StationInfo, HistoryReading, Alert, ForecastPoint, SourcesBreakdown, EffectivenessReport, InterventionsResponse } from './api'

const now = new Date().toISOString()

export const DEMO_AQI: AqiCurrentResponse = {
  aqi: 156, aqiCategory: 'Unhealthy', pm25: 85.3, pm10: 142.1, co: 1.82, no2: 34.2, so2: 12.5, o3: 28.7, nh3: 18.4,
  temperature: 34.2, humidity: 62.1, windSpeed: 4.2, windDirection: 180, pressure: 1011.2, visibility: 8.5,
  primaryPollutant: 'PM2.5', healthAdvice: 'Limit outdoor activities. Sensitive groups should stay indoors.',
  source: 'demo', lastUpdated: now, confidence: 0,
  station: { stationId: 'AHM-001', stationName: 'Ahmedabad Maninagar' }
}

export const DEMO_STATIONS: StationInfo[] = [
  { stationId: 'AHM-001', stationName: 'Ahmedabad Maninagar', city: 'Ahmedabad', ward: 'Maninagar', location: { type: 'Point', coordinates: [72.5714, 23.0225] }, status: 'active', type: 'CPCB', aqi: 156, aqiCategory: 'Unhealthy' },
  { stationId: 'AHM-002', stationName: 'Ahmedabad Naroda', city: 'Ahmedabad', ward: 'Naroda', location: { type: 'Point', coordinates: [72.6578, 23.0714] }, status: 'active', type: 'CPCB', aqi: 201, aqiCategory: 'Severe' },
  { stationId: 'AHM-003', stationName: 'Ahmedabad SG Highway', city: 'Ahmedabad', ward: 'SG Highway', location: { type: 'Point', coordinates: [72.5321, 23.0522] }, status: 'active', type: 'GSPCB', aqi: 178, aqiCategory: 'Unhealthy' },
  { stationId: 'AHM-004', stationName: 'Ahmedabad Bodakdev', city: 'Ahmedabad', ward: 'Bodakdev', location: { type: 'Point', coordinates: [72.5072, 23.0365] }, status: 'active', type: 'GSPCB', aqi: 98, aqiCategory: 'Moderate' },
  { stationId: 'AHM-005', stationName: 'Ahmedabad Vastrapur', city: 'Ahmedabad', ward: 'Vastrapur', location: { type: 'Point', coordinates: [72.5262, 23.0395] }, status: 'active', type: 'GSPCB', aqi: 112, aqiCategory: 'Moderate' },
]

export const DEMO_ALERTS: Alert[] = [
  { id: 'demo-1', severity: 'red', title: 'AQI Critical: Naroda', message: 'PM2.5 levels exceed 250 µg/m³. Immediate action required.', area: 'Naroda', timestamp: now, status: 'active', recommendations: ['Wear N95 masks', 'Avoid outdoor activity', 'Close windows'] },
  { id: 'demo-2', severity: 'orange', title: 'AQI Unhealthy: SG Highway', message: 'AQI at 178 from traffic congestion. Limit outdoor activities.', area: 'SG Highway', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'active', recommendations: ['Limit outdoor exercise', 'Use alternative routes'] },
  { id: 'demo-3', severity: 'yellow', title: 'Moderate: Vastrapur', message: 'AQI rising. Monitor sensitive groups.', area: 'Vastrapur', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'active' },
]

export function DEMO_HISTORY(days = 30): HistoryReading[] {
  return Array.from({ length: days * 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (days * 24 - i) * 3600000).toISOString(),
    aqi: Math.round(120 + Math.sin(i * 0.1) * 40 + Math.random() * 20),
    pm25: Math.round(40 + Math.sin(i * 0.1) * 20 + Math.random() * 10),
    pm10: Math.round(80 + Math.sin(i * 0.1) * 30 + Math.random() * 15),
    co: parseFloat((1.2 + Math.sin(i * 0.1) * 0.5 + Math.random() * 0.3).toFixed(2)),
    no2: Math.round(25 + Math.sin(i * 0.1) * 10 + Math.random() * 5),
    so2: Math.round(10 + Math.sin(i * 0.1) * 5 + Math.random() * 3),
    o3: Math.round(35 + Math.sin(i * 0.1) * 15 + Math.random() * 5),
    temperature: Math.round(30 + Math.sin(i * 0.05) * 5 + Math.random() * 3),
    humidity: Math.round(55 + Math.sin(i * 0.05) * 10 + Math.random() * 5),
  }))
}

export function DEMO_FORECAST(hours = 24): ForecastPoint[] {
  return Array.from({ length: hours }, (_, i) => ({
    timestamp: new Date(Date.now() + i * 3600000).toISOString(),
    value: Math.round(130 + Math.sin(i * 0.3) * 30 + Math.random() * 10),
    lower: Math.round(110 + Math.sin(i * 0.3) * 30 + Math.random() * 10 - 15),
    upper: Math.round(130 + Math.sin(i * 0.3) * 30 + Math.random() * 10 + 15),
    confidence: parseFloat((0.7 + Math.random() * 0.2).toFixed(2)),
  }))
}

export const DEMO_SOURCES: SourcesBreakdown = {
  sources: [
    { name: 'Traffic', percentage: 38, value: 38, color: '#00D4FF' },
    { name: 'Industries', percentage: 28, value: 28, color: '#7B61FF' },
    { name: 'Construction', percentage: 18, value: 18, color: '#FFB800' },
    { name: 'Waste Burning', percentage: 10, value: 10, color: '#FF3D71' },
    { name: 'Others', percentage: 6, value: 6, color: '#00F5A0' },
  ]
}

export const DEMO_INTERVENTIONS: InterventionsResponse = {
  queue: [
    { id: 'd1', type: 'traffic', location: 'SG Highway', description: 'Heavy congestion contributing to elevated PM2.5', impact_score: 85, status: 'pending', created_at: now },
    { id: 'd2', type: 'construction', location: 'Bodakdev', description: 'Multiple construction sites generating dust', impact_score: 72, status: 'approved', created_at: now },
    { id: 'd3', type: 'industrial', location: 'Naroda', description: 'Factory emissions exceeding limits', impact_score: 91, status: 'active', created_at: now },
  ],
  effectiveness: 76,
  total_reduction: '12.3%'
}

export const DEMO_EFFECTIVENESS: EffectivenessReport = {
  overall: 76,
  by_type: { traffic: 72, industrial: 81, construction: 68, awareness: 74 },
  trend: Array.from({ length: 12 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, '0')}`, score: 60 + Math.round(Math.sin(i * 0.5) * 10 + Math.random() * 8) }))
}