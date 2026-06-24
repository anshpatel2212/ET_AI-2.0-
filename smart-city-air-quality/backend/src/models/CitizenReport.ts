import mongoose, { Schema, Document } from 'mongoose';

export interface ICitizenReport extends Document {
  userId: string;
  anonymous: boolean;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  timestamp: Date;
  category: 'smoke' | 'dust' | 'odor' | 'visibility' | 'health_symptom' | 'burning' | 'traffic' | 'construction' | 'other';
  description: string;
  photoUrls: string[];
  aiAnalysis?: {
    predictedCategory: string;
    confidence: number;
    detectedObjects: string[];
  };
  status: 'pending' | 'reviewed' | 'verified' | 'dismissed';
  greenPointsEarned: number;
  relatedInterventionId?: string;
}

const CitizenReportSchema = new Schema<ICitizenReport>(
  {
    userId: { type: String, required: true, index: true },
    anonymous: { type: Boolean, default: false },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    timestamp: { type: Date, default: Date.now },
    category: {
      type: String,
      enum: [
        'smoke', 'dust', 'odor', 'visibility', 'health_symptom',
        'burning', 'traffic', 'construction', 'other',
      ],
      required: true,
    },
    description: { type: String, required: true },
    photoUrls: [{ type: String }],
    aiAnalysis: {
      predictedCategory: { type: String },
      confidence: { type: Number },
      detectedObjects: [{ type: String }],
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'verified', 'dismissed'],
      default: 'pending',
    },
    greenPointsEarned: { type: Number, default: 0 },
    relatedInterventionId: { type: String },
  },
  { timestamps: true }
);

CitizenReportSchema.index({ location: '2dsphere' });
CitizenReportSchema.index({ userId: 1, timestamp: -1 });
CitizenReportSchema.index({ status: 1 });

export const CitizenReport = mongoose.model<ICitizenReport>('CitizenReport', CitizenReportSchema);
