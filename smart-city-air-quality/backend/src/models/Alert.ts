import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert extends Document {
  alertId: string;
  title: string;
  description: string;
  severity: 1 | 2 | 3 | 4 | 5;
  zone: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  city: string;
  ward: string;
  triggeredBy: string;
  startedAt: Date;
  expiresAt: Date;
  status: 'active' | 'acknowledged' | 'resolved' | 'expired';
  affectedPopulation: number;
  channelsDelivered: string[];
  recommendations: string[];
  acknowledgedBy?: string[];
  interventionIds: string[];
}

const AlertSchema = new Schema<IAlert>(
  {
    alertId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
    zone: {
      type: { type: String, enum: ['Polygon'], default: 'Polygon' },
      coordinates: { type: [[[Number]]], required: true },
    },
    city: { type: String, required: true, index: true },
    ward: { type: String, default: '' },
    triggeredBy: { type: String, required: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved', 'expired'],
      default: 'active',
    },
    affectedPopulation: { type: Number, default: 0 },
    channelsDelivered: [{ type: String }],
    recommendations: [{ type: String }],
    acknowledgedBy: [{ type: String }],
    interventionIds: [{ type: String }],
  },
  { timestamps: true }
);

AlertSchema.index({ status: 1, severity: -1 });
AlertSchema.index({ city: 1, status: 1 });

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema);
