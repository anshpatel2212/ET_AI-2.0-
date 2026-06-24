'use client'

import { useQuery } from '@tanstack/react-query'
import { getCurrentAQI, getStations, getActiveAlerts, getForecast, getStationHistory, getSourcesBreakdown } from '@/lib/api'

export function useCurrentAQI(city?: string) {
  return useQuery({
    queryKey: ['currentAQI', city],
    queryFn: () => getCurrentAQI(city),
    refetchInterval: 30000,
    staleTime: 15000,
  })
}

export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: () => getStations(),
    refetchInterval: 60000,
  })
}

export function useActiveAlerts(city?: string) {
  return useQuery({
    queryKey: ['alerts', city],
    queryFn: () => getActiveAlerts(city),
    refetchInterval: 30000,
  })
}

export function useForecast(city: string, horizon: string = '24h') {
  return useQuery({
    queryKey: ['forecast', city, horizon],
    queryFn: () => getForecast(city, horizon),
    refetchInterval: 300000,
  })
}

export function useStationHistory(id: string, params?: { from?: string; to?: string; pollutant?: string }) {
  return useQuery({
    queryKey: ['stationHistory', id, params],
    queryFn: () => getStationHistory(id, params?.from, params?.to, params?.pollutant),
    refetchInterval: 120000,
  })
}

export function useSourcesBreakdown(city?: string) {
  return useQuery({
    queryKey: ['sources', city],
    queryFn: () => getSourcesBreakdown(city),
    refetchInterval: 300000,
  })
}
