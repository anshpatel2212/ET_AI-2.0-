import mongoose, { Schema, Document } from 'mongoose';

export interface IAqiReading extends Document {
  timestamp: Date;
  stationId: string;
  stationMeta: {
    stationName: string;
    city: string;
    ward: string;
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  pm25?: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  o3?: number;
  nh3?: number;
  nox?: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: number;
  pressure?: number;
  rainfall?: number;
  aqi?: number;
  aqiCategory?: string;
  primaryPollutant?: string;
  healthAdvice?: string;
  source: 'waqi' | 'openaq' | 'cpcb' | 'owm' | 'custom';
  confidence: number;
}

const AqiReadingSchema = new Schema<IAqiReading>(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    stationId: { type: String, required: true, index: true },
    stationMeta: {
      stationName: { type: String, required: true },
      city: { type: String, required: true },
      ward: { type: String, default: '' },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
    },
    pm25: { type: Number },
    pm10: { type: Number },
    no2: { type: Number },
    so2: { type: Number },
    co: { type: Number },
    o3: { type: Number },
    nh3: { type: Number },
    nox: { type: Number },
    temperature: { type: Number },
    humidity: { type: Number },
    windSpeed: { type: Number },
    windDirection: { type: Number },
    pressure: { type: Number },
    rainfall: { type: Number },
    aqi: { type: Number },
    aqiCategory: { type: String },
    primaryPollutant: { type: String },
    healthAdvice: { type: String },
    source: {
      type: String,
      enum: ['waqi', 'openaq', 'cpcb', 'owm', 'custom'],
      required: true,
    },
    confidence: { type: Number, default: 0.8, min: 0, max: 1 },
  },
  { timestamps: true }
);

AqiReadingSchema.index({ timestamp: -1 });
AqiReadingSchema.index({ stationId: 1, timestamp: -1 });
AqiReadingSchema.index({ 'stationMeta.city': 1, timestamp: -1 });
AqiReadingSchema.index({ aqiCategory: 1 });

export const AqiReading = mongoose.model<IAqiReading>('AqiReading', AqiReadingSchema);
