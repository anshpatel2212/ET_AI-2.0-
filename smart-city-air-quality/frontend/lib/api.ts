import axios, { AxiosInstance, AxiosError } from 'axios'
import { API_BASE_URL } from './constants'
import {
  DEMO_AQI, DEMO_STATIONS, DEMO_ALERTS, DEMO_HISTORY, DEMO_FORECAST,
  DEMO_SOURCES, DEMO_INTERVENTIONS, DEMO_EFFECTIVENESS
} from './demo-data'

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
          const { access_token } = res.data
          localStorage.setItem('access_token', access_token)
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        }
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        if (typeof window !== 'undefined') {
          window.location.href = '/citizen'
        }
      }
    }
    return Promise.reject(error)
  }
)

export interface AqiCurrentResponse {
  aqi: number
  aqiCategory: string
  pm25?: number
  pm10?: number
  co?: number
  no2?: number
  so2?: number
  o3?: number
  nh3?: number
  temperature?: number
  humidity?: number
  windSpeed?: number
  windDirection?: number
  pressure?: number
  visibility?: number
  primaryPollutant?: string
  healthAdvice?: string
  source: string
  lastUpdated: string
  confidence: number
  station?: { stationId: string; stationName: string }
}

export interface StationInfo {
  stationId: string
  stationName: string
  city: string
  ward: string
  location: { type: string; coordinates: [number, number] }
  status: string
  type: string
  aqi?: number
  aqiCategory?: string
}

export interface HistoryReading {
  timestamp: string
  aqi?: number
  pm25?: number
  pm10?: number
  co?: number
  no2?: number
  so2?: number
  o3?: number
  nh3?: number
  temperature?: number
  humidity?: number
  windSpeed?: number
}

export interface Alert {
  id: string
  severity: string
  title: string
  message: string
  area: string
  timestamp: string
  status: string
  recommendations?: string[]
}

export interface ForecastPoint {
  timestamp: string
  value: number
  lower?: number
  upper?: number
  confidence?: number
}

export interface HealthAdvisoryResponse {
  advice: string
  riskLevel: string
  safeHours: string[]
  symptoms: string[]
}

export interface CityInfo {
  city: string
  status: string
}

export interface AuthResponse {
  access_token: string
  refresh_token?: string
  user?: Record<string, unknown>
}

export interface Report {
  id: string
  category: string
  description: string
  location: { lat: number; lng: number }
  status: string
  created_at: string
}

export interface NearbyStation extends StationInfo {
  distance: number
}

export interface InterventionsResponse {
  queue: Array<{
    id: string
    type: string
    location: string
    description: string
    impact_score: number
    status: string
    created_at: string
  }>
  effectiveness?: number
  total_reduction?: string
}

export interface ActionResponse {
  message: string
  status: string
}

export interface SourcesBreakdown {
  sources: Array<{ name: string; percentage: number; value: number; color: string }>
}

export interface EffectivenessReport {
  overall: number
  by_type: Record<string, number>
  trend: Array<{ month: string; score: number }>
}

export interface ApiResult<T> {
  data: T | null
  error: string | null
  isDemo?: boolean
}

async function handleRequest<T>(request: () => Promise<{ data: T }>, fallback?: () => T): Promise<ApiResult<T>> {
  try {
    const response = await request()
    return { data: response.data, error: null }
  } catch (err) {
    if (fallback) {
      return { data: fallback(), error: null, isDemo: true }
    }
    if (axios.isAxiosError(err)) {
      const axiosError = err as AxiosError<{ message?: string; error?: string }>
      if (axiosError.code === 'ECONNABORTED') {
        return { data: null, error: 'Request timed out. Please try again.' }
      }
      if (!axiosError.response) {
        return { data: null, error: 'Network error. Unable to reach the server.' }
      }
      const status = axiosError.response.status
      const body = axiosError.response.data
      const message = body?.message || body?.error || `Server error: ${status}`
      return { data: null, error: message }
    }
    return { data: null, error: 'An unexpected error occurred.' }
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    await api.get('/public/aqi/cities', { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

let _backendOnline: boolean | null = null
export function getBackendStatus(): boolean | null { return _backendOnline }
export async function initBackendCheck(): Promise<boolean> {
  _backendOnline = await checkBackendHealth()
  return _backendOnline
}

export async function getCurrentAQI(
  city: string = 'Ahmedabad',
  lat?: number,
  lon?: number
): Promise<ApiResult<AqiCurrentResponse>> {
  const params: Record<string, string> = { city }
  if (lat !== undefined) params.lat = String(lat)
  if (lon !== undefined) params.lon = String(lon)
  const qs = new URLSearchParams(params).toString()
  return handleRequest(() => api.get(`/public/aqi/current?${qs}`), () => ({
    ...DEMO_AQI, lastUpdated: new Date().toISOString()
  }))
}

export async function getStationAQI(stationId: string): Promise<ApiResult<AqiCurrentResponse>> {
  return handleRequest(() => api.get(`/public/stations/${stationId}/latest`), () => ({
    ...DEMO_AQI, lastUpdated: new Date().toISOString()
  }))
}

export async function getStations(city?: string): Promise<ApiResult<StationInfo[]>> {
  const qs = city ? `?city=${encodeURIComponent(city)}` : ''
  return handleRequest(() => api.get(`/public/stations${qs}`), () => DEMO_STATIONS)
}

export async function getStationHistory(
  stationId: string,
  from?: string,
  to?: string,
  pollutant?: string
): Promise<ApiResult<HistoryReading[]>> {
  const params: Record<string, string> = {}
  if (from) params.from = from
  if (to) params.to = to
  if (pollutant) params.pollutant = pollutant
  const qs = new URLSearchParams(params).toString()
  return handleRequest(() => api.get(`/public/stations/${stationId}/history${qs ? `?${qs}` : ''}`), () => DEMO_HISTORY(30))
}

export async function getActiveAlerts(city?: string): Promise<ApiResult<Alert[]>> {
  const qs = city ? `?city=${encodeURIComponent(city)}` : ''
  return handleRequest(() => api.get(`/public/alerts/active${qs}`), () => DEMO_ALERTS)
}

export async function getForecast(
  city: string,
  horizon: string = '24h'
): Promise<ApiResult<ForecastPoint[]>> {
  return handleRequest(() => api.get(`/public/forecast?city=${encodeURIComponent(city)}&horizon=${encodeURIComponent(horizon)}`), () => DEMO_FORECAST(24))
}

export async function getHealthAdvisory(
  lat: number,
  lon: number,
  profile: string
): Promise<ApiResult<HealthAdvisoryResponse>> {
  return handleRequest(() => api.get('/public/health-advisory', { params: { lat, lon, profile } }))
}

export async function getCities(): Promise<ApiResult<CityInfo[]>> {
  return handleRequest(() => api.get('/public/aqi/cities'))
}

export async function login(email: string, password: string): Promise<ApiResult<AuthResponse>> {
  return handleRequest(() => api.post('/auth/login', { email, password }))
}

export async function signup(data: Record<string, unknown>): Promise<ApiResult<AuthResponse>> {
  return handleRequest(() => api.post('/auth/signup', data))
}

export async function submitReport(formData: FormData): Promise<ApiResult<Record<string, unknown>>> {
  return handleRequest(() =>
    api.post('/citizen/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  )
}

export async function getMyReports(): Promise<ApiResult<Report[]>> {
  return handleRequest(() => api.get('/citizen/reports/me'))
}

export async function getAQINearMe(
  lat: number,
  lon: number
): Promise<ApiResult<NearbyStation[]>> {
  return handleRequest(() => api.get(`/citizen/aqi-near-me?lat=${lat}&lon=${lon}`))
}

export async function getInterventions(): Promise<ApiResult<InterventionsResponse>> {
  return handleRequest(() => api.get('/operator/interventions/queue'), () => DEMO_INTERVENTIONS)
}

export async function approveIntervention(id: string): Promise<ApiResult<ActionResponse>> {
  return handleRequest(() => api.post(`/operator/interventions/${id}/approve`))
}

export async function rejectIntervention(id: string): Promise<ApiResult<ActionResponse>> {
  return handleRequest(() => api.post(`/operator/interventions/${id}/reject`))
}

export async function getSourcesBreakdown(city: string = 'Ahmedabad'): Promise<ApiResult<SourcesBreakdown>> {
  return handleRequest(() => api.get(`/operator/sources/breakdown?city=${encodeURIComponent(city)}`), () => DEMO_SOURCES)
}

export async function getEffectivenessReport(): Promise<ApiResult<EffectivenessReport>> {
  return handleRequest(() => api.get('/operator/effectiveness/report'), () => DEMO_EFFECTIVENESS)
}

export default api
