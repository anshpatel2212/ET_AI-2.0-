import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { AQI_CATEGORIES } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function aqiColor(aqi: number): string {
  const category = AQI_CATEGORIES.find(c => aqi >= c.min && aqi <= c.max)
  return category?.color || '#7E0023'
}

export function aqiCategory(aqi: number): string {
  const category = AQI_CATEGORIES.find(c => aqi >= c.min && aqi <= c.max)
  return category?.label || 'Hazardous'
}

export function aqiSeverity(aqi: number): string {
  if (aqi <= 50) return 'good'
  if (aqi <= 100) return 'moderate'
  if (aqi <= 150) return 'unhealthy_sensitive'
  if (aqi <= 200) return 'unhealthy'
  if (aqi <= 300) return 'very_unhealthy'
  return 'hazardous'
}

export function formatAQI(value: number): string {
  return Math.round(value).toString()
}

export function formatDate(date: Date | string, format: 'short' | 'long' | 'time' | 'full' = 'short'): string {
  const d = new Date(date)
  switch (format) {
    case 'short': return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    case 'long': return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    case 'time': return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    case 'full': return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }
}

export function getHealthAdvice(aqi: number, profile: string): string {
  if (aqi <= 50) return 'Air quality is satisfactory. No precautions needed.'
  if (aqi <= 100) return 'Air quality is acceptable. Unusually sensitive individuals should consider limiting prolonged outdoor exertion.'
  if (aqi <= 150) {
    const advices: Record<string, string> = {
      general: 'Active children and adults, and people with respiratory disease, should limit prolonged outdoor exertion.',
      children: 'Children should limit prolonged outdoor exertion.',
      elderly: 'Elderly should limit prolonged outdoor exertion.',
      asthma: 'Asthma patients should avoid outdoor activities and keep medication handy.',
      heart: 'Heart patients should avoid strenuous activities.',
    }
    return advices[profile] || advices.general
  }
  if (aqi <= 200) return 'Everyone should limit prolonged outdoor exertion. Active children and adults should avoid outdoor activities.'
  if (aqi <= 300) return 'Everyone should avoid all physical outdoor activities. Stay indoors with windows closed.'
  return 'Health emergency. Everyone should remain indoors. Use air purifiers. Seek medical help if symptoms appear.'
}

export function getAQIActionColor(aqi: number): string {
  if (aqi <= 50) return 'bg-aqi-good'
  if (aqi <= 100) return 'bg-aqi-moderate text-black'
  if (aqi <= 150) return 'bg-aqi-unhealthy-sensitive'
  if (aqi <= 200) return 'bg-aqi-unhealthy'
  if (aqi <= 300) return 'bg-aqi-very-unhealthy'
  return 'bg-aqi-hazardous'
}

export function generateMockHistory(days: number = 30) {
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - i) * 86400000).toISOString(),
    aqi: Math.round(100 + Math.sin(i * 0.2) * 40 + Math.random() * 30),
    pm25: Math.round(35 + Math.sin(i * 0.2) * 15 + Math.random() * 10),
    pm10: Math.round(70 + Math.sin(i * 0.2) * 25 + Math.random() * 15),
    no2: Math.round(20 + Math.sin(i * 0.3) * 10 + Math.random() * 8),
    so2: Math.round(10 + Math.sin(i * 0.25) * 5 + Math.random() * 5),
    co: Number((0.8 + Math.sin(i * 0.15) * 0.4 + Math.random() * 0.3).toFixed(2)),
    o3: Math.round(30 + Math.sin(i * 0.35) * 15 + Math.random() * 10),
  }))
}

export function downloadCSV(data: any[], filename: string) {
  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => row[h]).join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
