export const AQI_COLORS: Record<string, string> = {
  good: '#00E400',
  moderate: '#FFFF00',
  unhealthy_sensitive: '#FF7E00',
  unhealthy: '#FF0000',
  very_unhealthy: '#8F3F97',
  hazardous: '#7E0023',
}

export const AQI_CATEGORIES = [
  { min: 0, max: 50, label: 'Good', key: 'good', color: '#00E400' },
  { min: 51, max: 100, label: 'Moderate', key: 'moderate', color: '#FFFF00' },
  { min: 101, max: 150, label: 'Unhealthy for Sensitive Groups', key: 'unhealthy_sensitive', color: '#FF7E00' },
  { min: 151, max: 200, label: 'Unhealthy', key: 'unhealthy', color: '#FF0000' },
  { min: 201, max: 300, label: 'Very Unhealthy', key: 'very_unhealthy', color: '#8F3F97' },
  { min: 301, max: 500, label: 'Hazardous', key: 'hazardous', color: '#7E0023' },
]

export const POLLUTANT_UNITS: Record<string, string> = {
  pm25: 'µg/m³',
  pm10: 'µg/m³',
  co: 'ppm',
  no2: 'ppb',
  so2: 'ppb',
  o3: 'ppb',
  nh3: 'ppb',
  pb: 'µg/m³',
}

export const POLLUTANT_NAMES: Record<string, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  co: 'Carbon Monoxide',
  no2: 'Nitrogen Dioxide',
  so2: 'Sulfur Dioxide',
  o3: 'Ozone',
  nh3: 'Ammonia',
  pb: 'Lead',
}

export const AHMEDABAD_CENTER: [number, number] = [72.5714, 23.0225]
export const MAP_ZOOM = 11
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000'

export const HEALTH_PROFILES = [
  { id: 'general', label: 'General Population', icon: 'Users', risk: 'moderate' },
  { id: 'children', label: 'Children (0-12)', icon: 'Baby', risk: 'high' },
  { id: 'elderly', label: 'Elderly (60+)', icon: 'Heart', risk: 'high' },
  { id: 'pregnant', label: 'Pregnant Women', icon: 'Heart', risk: 'high' },
  { id: 'asthma', label: 'Asthma Patients', icon: 'Lungs', risk: 'very_high' },
  { id: 'heart', label: 'Heart Disease', icon: 'Heart', risk: 'very_high' },
  { id: 'outdoor', label: 'Outdoor Workers', icon: 'Sun', risk: 'high' },
  { id: 'cyclists', label: 'Cyclists & Runners', icon: 'Bike', risk: 'moderate' },
  { id: 'students', label: 'Students', icon: 'BookOpen', risk: 'moderate' },
]

export const INTERVENTION_TYPES = [
  { id: 'traffic', label: 'Traffic Management', color: '#00D4FF' },
  { id: 'industrial', label: 'Industrial Regulation', color: '#7B61FF' },
  { id: 'construction', label: 'Construction Control', color: '#FFB800' },
  { id: 'waste_burning', label: 'Waste Burning Ban', color: '#FF3D71' },
  { id: 'green_cover', label: 'Green Cover Expansion', color: '#00F5A0' },
]

export const MOCK_STATIONS = [
  { id: 'st001', name: 'CG Road', lat: 23.0275, lng: 72.5714, aqi: 156, status: 'active' },
  { id: 'st002', name: 'SG Highway', lat: 23.0325, lng: 72.5414, aqi: 178, status: 'active' },
  { id: 'st003', name: 'Maninagar', lat: 22.9975, lng: 72.6014, aqi: 142, status: 'active' },
  { id: 'st004', name: 'Bopal', lat: 23.0175, lng: 72.4814, aqi: 98, status: 'active' },
  { id: 'st005', name: 'Vastrapur', lat: 23.0375, lng: 72.5214, aqi: 112, status: 'active' },
  { id: 'st006', name: 'Gandhinagar', lat: 23.2156, lng: 72.6369, aqi: 85, status: 'active' },
  { id: 'st007', name: 'Narol', lat: 22.9675, lng: 72.6314, aqi: 201, status: 'active' },
  { id: 'st008', name: 'Sabarmati', lat: 23.0575, lng: 72.5614, aqi: 134, status: 'active' },
]

export const MOCK_ALERTS = [
  { id: 'alert1', severity: 'red', title: 'AQI Critical: Narol', message: 'PM2.5 levels exceed 250 µg/m³. Immediate action required.', timestamp: new Date().toISOString(), area: 'Narol', status: 'active' },
  { id: 'alert2', severity: 'orange', title: 'AQI Unhealthy: CG Road', message: 'AQI at 156. Limit outdoor activities.', timestamp: new Date(Date.now() - 3600000).toISOString(), area: 'CG Road', status: 'active' },
  { id: 'alert3', severity: 'yellow', title: 'Moderate Alert: Vastrapur', message: 'AQI rising above 100. Monitor sensitive groups.', timestamp: new Date(Date.now() - 7200000).toISOString(), area: 'Vastrapur', status: 'active' },
  { id: 'alert4', severity: 'red', title: 'Construction Dust Alert', message: 'High dust levels in SG Highway area due to construction.', timestamp: new Date(Date.now() - 1800000).toISOString(), area: 'SG Highway', status: 'active' },
]

export const MOCK_FORECAST = Array.from({ length: 24 }, (_, i) => ({
  hour: new Date(Date.now() + i * 3600000).toISOString(),
  aqi: Math.round(120 + Math.sin(i * 0.5) * 40 + Math.random() * 20),
  pm25: Math.round(40 + Math.sin(i * 0.5) * 20 + Math.random() * 10),
  pm10: Math.round(80 + Math.sin(i * 0.5) * 30 + Math.random() * 15),
  co: 0.5 + Math.sin(i * 0.3) * 0.3,
  no2: 25 + Math.sin(i * 0.4) * 10,
  o3: 35 + Math.sin(i * 0.6) * 15,
}))
