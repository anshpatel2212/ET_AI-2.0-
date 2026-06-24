import mongoose, { Schema, Document } from 'mongoose';

export interface IIntervention extends Document {
  name: string;
  type: 'water_sprinkling' | 'traffic_diversion' | 'construction_ban' | 'industrial_shutdown' | 'crop_burning_control' | 'vehicle_restriction' | 'air_purification' | 'evacuation' | 'other';
  triggeredBy: string;
  zone: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  expectedReductionPct: number;
  actualReductionPct?: number;
  status: 'proposed' | 'approved' | 'active' | 'completed' | 'cancelled';
  approvedBy?: string;
  deployedResources: {
    type: string;
    count: number;
    description: string;
  }[];
  cost: number;
  publicResponse?: 'positive' | 'neutral' | 'negative';
  effectivenessScore?: number;
  startTime: Date;
  endTime?: Date;
}

const InterventionSchema = new Schema<IIntervention>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'water_sprinkling', 'traffic_diversion', 'construction_ban',
        'industrial_shutdown', 'crop_burning_control', 'vehicle_restriction',
        'air_purification', 'evacuation', 'other',
      ],
      required: true,
    },
    triggeredBy: { type: String, required: true },
    zone: {
      type: { type: String, enum: ['Polygon'], default: 'Polygon' },
      coordinates: { type: [[[Number]]], required: true },
    },
    expectedReductionPct: { type: Number, required: true },
    actualReductionPct: { type: Number },
    status: {
      type: String,
      enum: ['proposed', 'approved', 'active', 'completed', 'cancelled'],
      default: 'proposed',
    },
    approvedBy: { type: String },
    deployedResources: [
      {
        type: { type: String, required: true },
        count: { type: Number, required: true },
        description: { type: String, default: '' },
      },
    ],
    cost: { type: Number, default: 0 },
    publicResponse: { type: String, enum: ['positive', 'neutral', 'negative'] },
    effectivenessScore: { type: Number, min: 0, max: 100 },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
  },
  { timestamps: true }
);

InterventionSchema.index({ status: 1, type: 1 });

export const Intervention = mongoose.model<IIntervention>('Intervention', InterventionSchema);
