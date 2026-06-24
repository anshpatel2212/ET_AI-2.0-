# Architecture Document

## System Overview

The Smart City Air Quality Intelligence Platform uses a microservices architecture with three main services:

1. **Frontend** (Next.js 14) — Port 3000
2. **Backend** (Express.js) — Port 4000 
3. **ML Service** (FastAPI) — Port 8000

## Data Flow

```
External APIs → BullMQ Jobs → MongoDB → Express API → Next.js → User
                                   ↓
                              Redis Cache
                                   ↓
                              Socket.IO → Real-time UI updates
                                   ↓
                              ML Service → Predictions
```

## Database Collections

- `aqi_readings` — Time Series (granularity: minutes)
- `stations` — Geospatial (2dsphere index)
- `alerts` — Active and historical alerts
- `predictions` — ML forecast outputs
- `interventions` — Action tracking
- `citizen_reports` — User-submitted reports
- `users` — Auth and profiles
- `audit_log` — Immutable append-only

## Security

- JWT-based authentication (15min access + refresh token)
- Role-based authorization (citizen/operator/admin)
- Rate limiting per endpoint group
- Helmet security headers
- Input validation via Zod
