const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const STATIONS = [
  { stationId: 'AHM-001', stationName: 'Ahmedabad Maninagar', city: 'Ahmedabad', ward: 'Maninagar', location: { type: 'Point', coordinates: [72.5714, 23.0225] }, status: 'active', type: 'CPCB', aqi: 156, aqiCategory: 'Unhealthy' },
  { stationId: 'AHM-002', stationName: 'Ahmedabad Naroda', city: 'Ahmedabad', ward: 'Naroda', location: { type: 'Point', coordinates: [72.6578, 23.0714] }, status: 'active', type: 'CPCB', aqi: 201, aqiCategory: 'Severe' },
  { stationId: 'AHM-003', stationName: 'Ahmedabad SG Highway', city: 'Ahmedabad', ward: 'SG Highway', location: { type: 'Point', coordinates: [72.5321, 23.0522] }, status: 'active', type: 'GSPCB', aqi: 178, aqiCategory: 'Unhealthy' },
  { stationId: 'AHM-004', stationName: 'Ahmedabad Bodakdev', city: 'Ahmedabad', ward: 'Bodakdev', location: { type: 'Point', coordinates: [72.5072, 23.0365] }, status: 'active', type: 'GSPCB', aqi: 98, aqiCategory: 'Moderate' },
  { stationId: 'AHM-005', stationName: 'Ahmedabad Vastrapur', city: 'Ahmedabad', ward: 'Vastrapur', location: { type: 'Point', coordinates: [72.5262, 23.0395] }, status: 'active', type: 'GSPCB', aqi: 112, aqiCategory: 'Moderate' },
];

const hist = Array.from({ length: 720 }, (_, i) => ({
  timestamp: new Date(Date.now() - (720 - i) * 3600000).toISOString(),
  aqi: Math.round(120 + Math.sin(i * 0.1) * 40 + Math.random() * 20),
  pm25: Math.round(40 + Math.sin(i * 0.1) * 20 + Math.random() * 10),
  pm10: Math.round(80 + Math.sin(i * 0.1) * 30 + Math.random() * 15),
  co: +(1.2 + Math.sin(i * 0.1) * 0.5 + Math.random() * 0.3).toFixed(2),
  no2: Math.round(25 + Math.sin(i * 0.1) * 10 + Math.random() * 5),
  so2: Math.round(10 + Math.sin(i * 0.1) * 5 + Math.random() * 3),
  o3: Math.round(35 + Math.sin(i * 0.1) * 15 + Math.random() * 5),
  temperature: Math.round(30 + Math.sin(i * 0.05) * 5 + Math.random() * 3),
  humidity: Math.round(55 + Math.sin(i * 0.05) * 10 + Math.random() * 5),
}));

const forecast = Array.from({ length: 48 }, (_, i) => ({
  timestamp: new Date(Date.now() + i * 3600000).toISOString(),
  value: Math.round(130 + Math.sin(i * 0.3) * 30 + Math.random() * 10),
  lower: Math.round(110 + Math.sin(i * 0.3) * 30 + Math.random() * 10 - 15),
  upper: Math.round(130 + Math.sin(i * 0.3) * 30 + Math.random() * 10 + 15),
  confidence: +(0.7 + Math.random() * 0.2).toFixed(2),
}));

app.get('/api/v1/public/aqi/current', (req, res) => {
  const s = STATIONS[0];
  const aqi = Math.round(120 + Math.random() * 80);
  const cat = aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy for Sensitive Groups' : aqi <= 200 ? 'Unhealthy' : 'Severe';
  res.json({
    aqi, aqiCategory: cat,
    pm25: +(50 + Math.random() * 80).toFixed(1),
    pm10: +(100 + Math.random() * 100).toFixed(1),
    co: +(0.8 + Math.random() * 1.5).toFixed(2),
    no2: Math.round(20 + Math.random() * 30),
    so2: Math.round(5 + Math.random() * 15),
    o3: Math.round(20 + Math.random() * 30),
    temperature: +(30 + Math.random() * 8).toFixed(1),
    humidity: Math.round(50 + Math.random() * 25),
    windSpeed: +(2 + Math.random() * 5).toFixed(1),
    pressure: Math.round(1005 + Math.random() * 15),
    visibility: +(6 + Math.random() * 6).toFixed(1),
    primaryPollutant: 'PM2.5', healthAdvice: 'Limit outdoor activities for sensitive groups.',
    source: 'CPCB (via WAQI)', lastUpdated: new Date().toISOString(), confidence: +(0.75 + Math.random() * 0.2).toFixed(2),
    station: { stationId: s.stationId, stationName: s.stationName }
  });
});

app.get('/api/v1/public/stations', (req, res) => res.json(STATIONS));
app.get('/api/v1/public/stations/:id/latest', (req, res) => {
  const s = STATIONS.find(x => x.stationId === req.params.id) || STATIONS[0];
  res.json({
    aqi: s.aqi, aqiCategory: s.aqiCategory, pm25: 60 + Math.random() * 40, pm10: 100 + Math.random() * 80,
    co: 1 + Math.random(), no2: 25 + Math.random() * 15, so2: 10 + Math.random() * 8, o3: 30 + Math.random() * 20,
    temperature: 32 + Math.random() * 5, humidity: 55 + Math.random() * 15, windSpeed: 3 + Math.random() * 3,
    source: 'WAQI', lastUpdated: new Date().toISOString(), confidence: 0.82
  });
});

app.get('/api/v1/public/stations/:id/history', (req, res) => res.json(hist));
app.get('/api/v1/public/alerts/active', (req, res) => res.json([
  { id: 'alt-1', severity: 'red', title: 'Critical: Naroda', message: 'PM2.5 > 250 µg/m³. Immediate action.', area: 'Naroda', timestamp: new Date().toISOString(), status: 'active', recommendations: ['Wear N95', 'Avoid outdoors'] },
  { id: 'alt-2', severity: 'orange', title: 'Unhealthy: SG Highway', message: 'AQI 178 from traffic.', area: 'SG Highway', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'active' },
]));
app.get('/api/v1/public/forecast', (req, res) => res.json(forecast));
app.get('/api/v1/public/aqi/cities', (req, res) => res.json([{ city: 'Ahmedabad', status: 'active' }, { city: 'Gandhinagar', status: 'active' }]));
app.get('/api/v1/public/health-advisory', (req, res) => res.json({ advice: 'Limit outdoor activities. Sensitive groups should stay indoors.', riskLevel: 'high', safeHours: ['05:00-09:00', '17:00-20:00'], symptoms: ['Cough', 'Eye irritation', 'Shortness of breath'] }));
app.get('/api/v1/operator/interventions/queue', (req, res) => res.json({ queue: [
  { id: 'i1', type: 'traffic', location: 'SG Highway', description: 'Heavy congestion', impact_score: 85, status: 'pending', created_at: new Date().toISOString() },
  { id: 'i2', type: 'industrial', location: 'Naroda', description: 'Factory emissions', impact_score: 91, status: 'active', created_at: new Date().toISOString() },
], effectiveness: 76, total_reduction: '12.3%' }));
app.get('/api/v1/operator/sources/breakdown', (req, res) => res.json({ sources: [
  { name: 'Traffic', percentage: 38, value: 38, color: '#00D4FF' },
  { name: 'Industries', percentage: 28, value: 28, color: '#7B61FF' },
  { name: 'Construction', percentage: 18, value: 18, color: '#FFB800' },
  { name: 'Waste Burning', percentage: 10, value: 10, color: '#FF3D71' },
  { name: 'Others', percentage: 6, value: 6, color: '#00F5A0' },
] }));
app.get('/api/v1/operator/effectiveness/report', (req, res) => res.json({ overall: 76, by_type: { traffic: 72, industrial: 81, construction: 68, awareness: 74 }, trend: Array.from({ length: 12 }, (_, i) => ({ month: `2025-${String(i + 1).padStart(2, '0')}`, score: 60 + Math.sin(i * 0.5) * 10 + Math.random() * 8 })) }));
app.get('/api/v1/citizen/aqi-near-me', (req, res) => res.json(STATIONS.slice(0, 3).map(s => ({ ...s, distance: +(Math.random() * 3).toFixed(1) }))));
app.get('/api/v1/citizen/reports/me', (req, res) => res.json([]));
app.post('/api/v1/citizen/reports', (req, res) => res.json({ id: 'r1', status: 'received' }));
app.post('/api/v1/operator/interventions/:id/approve', (req, res) => res.json({ message: 'Approved', status: 'approved' }));
app.post('/api/v1/operator/interventions/:id/reject', (req, res) => res.json({ message: 'Rejected', status: 'rejected' }));
app.post('/api/v1/auth/login', (req, res) => res.json({ access_token: 'stub_token', user: { name: 'Admin', role: 'admin' } }));

app.listen(4000, () => console.log('Stub backend on http://localhost:4000'));
