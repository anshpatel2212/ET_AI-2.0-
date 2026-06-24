import { create } from 'zustand'
import { MOCK_STATIONS, MOCK_ALERTS } from '@/lib/constants'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'citizen' | 'analyst'
}

interface Alert {
  id: string
  severity: string
  title: string
  message: string
  timestamp: string
  area: string
  status: string
}

interface Station {
  id: string
  name: string
  lat: number
  lng: number
  aqi: number
  status: string
}

interface Prediction {
  timestamp: string
  value: number
  upper_bound?: number
  lower_bound?: number
}

interface StoreState {
  currentAQI: number | null
  aqiHistory: any[]
  stations: Station[]
  alerts: Alert[]
  predictions: Prediction[]
  selectedCity: string
  selectedStation: string | null
  selectedPollutant: string
  user: User | null
  isAuthenticated: boolean
  role: string | null
  setCurrentAQI: (aqi: number) => void
  setAQIHistory: (history: any[]) => void
  setStations: (stations: Station[]) => void
  addAlert: (alert: Alert) => void
  setAlerts: (alerts: Alert[]) => void
  updatePrediction: (predictions: Prediction[]) => void
  login: (user: User, token: string) => void
  logout: () => void
  setCity: (city: string) => void
  setStation: (station: string | null) => void
  setPollutant: (pollutant: string) => void
}

export const useStore = create<StoreState>((set) => ({
  currentAQI: 156,
  aqiHistory: [],
  stations: MOCK_STATIONS,
  alerts: MOCK_ALERTS,
  predictions: [],
  selectedCity: 'Ahmedabad',
  selectedStation: null,
  selectedPollutant: 'pm25',
  user: null,
  isAuthenticated: false,
  role: null,

  setCurrentAQI: (aqi) => set({ currentAQI: aqi }),

  setAQIHistory: (history) => set({ aqiHistory: history }),

  setStations: (stations) => set({ stations }),

  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),

  setAlerts: (alerts) => set({ alerts }),

  updatePrediction: (predictions) => set({ predictions }),

  login: (user, token) => {
    localStorage.setItem('access_token', token)
    set({ user, isAuthenticated: true, role: user.role })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, isAuthenticated: false, role: null })
  },

  setCity: (city) => set({ selectedCity: city }),

  setStation: (station) => set({ selectedStation: station }),

  setPollutant: (pollutant) => set({ selectedPollutant: pollutant }),
}))
