import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(100),
  mobile: z.string().optional(),
  healthProfile: z.object({
    hasAsthma: z.boolean().optional(),
    hasHeartDisease: z.boolean().optional(),
    hasLungDisease: z.boolean().optional(),
    isElderly: z.boolean().optional(),
    hasChildren: z.boolean().optional(),
    sensitiveToPollution: z.boolean().optional(),
  }).optional(),
  preferences: z.object({
    preferredCities: z.array(z.string()).optional(),
    language: z.string().optional(),
  }).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(100),
  role: z.enum(['citizen', 'operator', 'admin']),
  mobile: z.string().optional(),
});

export const aqiQuerySchema = z.object({
  city: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  stationId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const stationQuerySchema = z.object({
  city: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance', 'offline']).optional(),
  type: z.enum(['government', 'community', 'mobile', 'satellite']).optional(),
  dataSource: z.enum(['waqi', 'openaq', 'cpcb', 'owm', 'custom']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const stationCreateSchema = z.object({
  stationId: z.string().min(1),
  stationName: z.string().min(1),
  type: z.enum(['government', 'community', 'mobile', 'satellite']),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  city: z.string().min(1),
  ward: z.string().optional(),
  dataSource: z.enum(['waqi', 'openaq', 'cpcb', 'owm', 'custom']).optional(),
});

export const alertCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  severity: z.number().int().min(1).max(5),
  city: z.string().min(1),
  ward: z.string().optional(),
  zone: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()))),
  }),
  expiresInHours: z.number().int().min(1).max(168).default(24),
  recommendations: z.array(z.string()).optional(),
});

export const reportCreateSchema = z.object({
  anonymous: z.boolean().optional().default(false),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  category: z.enum([
    'smoke', 'dust', 'odor', 'visibility', 'health_symptom',
    'burning', 'traffic', 'construction', 'other',
  ]),
  description: z.string().min(1).max(2000),
});

export const subscriptionSchema = z.object({
  city: z.string().min(1).optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  threshold: z.object({
    pm25: z.number().optional(),
    pm10: z.number().optional(),
    aqi: z.number().optional(),
  }),
  channels: z.array(z.enum(['email', 'sms', 'push'])).min(1),
});

export const dispatchSchema = z.object({
  type: z.enum(['water_sprinkling', 'traffic_diversion', 'construction_ban', 'industrial_shutdown', 'crop_burning_control', 'vehicle_restriction', 'air_purification', 'evacuation', 'other']),
  zone: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()))),
  }),
  expectedReductionPct: z.number().min(0).max(100),
  resources: z.array(z.object({
    type: z.string().min(1),
    count: z.number().int().min(1),
    description: z.string().optional(),
  })),
  cost: z.number().min(0).optional().default(0),
  startTime: z.string(),
});

export const apiKeyCreateSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  rateLimit: z.number().int().min(1).optional().default(1000),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const interveneActionSchema = z.object({
  approvedBy: z.string().min(1),
  notes: z.string().optional(),
});

export const predictQuerySchema = z.object({
  stationId: z.string().optional(),
  city: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  hours: z.array(z.coerce.number().int().min(1).max(168)).optional().default([1, 3, 6, 12, 24]),
});

export const calibrateSchema = z.object({
  accuracy: z.number().min(0).max(1),
  lastCalibration: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  mobile: z.string().optional(),
  role: z.enum(['citizen', 'operator', 'admin']).optional(),
  isActive: z.boolean().optional(),
  preferences: z.object({
    notifications: z.object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      push: z.boolean().optional(),
    }).optional(),
    alertThresholds: z.object({
      pm25: z.number().optional(),
      pm10: z.number().optional(),
      aqi: z.number().optional(),
    }).optional(),
    preferredCities: z.array(z.string()).optional(),
    language: z.string().optional(),
  }).optional(),
});

export const healthAdvisoryQuerySchema = z.object({
  city: z.string().min(1),
  includeForecast: z.coerce.boolean().optional().default(true),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AlertCreateInput = z.infer<typeof alertCreateSchema>;
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
export type StationCreateInput = z.infer<typeof stationCreateSchema>;
