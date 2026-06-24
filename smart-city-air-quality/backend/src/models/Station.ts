import mongoose, { Schema, Document } from 'mongoose';

export interface IStation extends Document {
  stationId: string;
  stationName: string;
  type: 'government' | 'community' | 'mobile' | 'satellite';
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  city: string;
  ward: string;
  status: 'active' | 'inactive' | 'maintenance' | 'offline';
  installedAt: Date;
  lastCalibration: Date;
  accuracy: number;
  dataSource: 'waqi' | 'openaq' | 'cpcb' | 'owm' | 'custom';
}

const StationSchema = new Schema<IStation>(
  {
    stationId: { type: String, required: true, unique: true, index: true },
    stationName: { type: String, required: true },
    type: {
      type: String,
      enum: ['government', 'community', 'mobile', 'satellite'],
      required: true,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    city: { type: String, required: true, index: true },
    ward: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'offline'],
      default: 'active',
    },
    installedAt: { type: Date, default: Date.now },
    lastCalibration: { type: Date },
    accuracy: { type: Number, default: 1.0, min: 0, max: 1 },
    dataSource: {
      type: String,
      enum: ['waqi', 'openaq', 'cpcb', 'owm', 'custom'],
      default: 'custom',
    },
  },
  { timestamps: true }
);

StationSchema.index({ location: '2dsphere' });
StationSchema.index({ city: 1, status: 1 });

export const Station = mongoose.model<IStation>('Station', StationSchema);
