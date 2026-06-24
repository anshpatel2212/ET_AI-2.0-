import mongoose, { Schema, Document } from 'mongoose';

export interface IModelMetrics extends Document {
  modelName: string;
  version: string;
  trainingDate: Date;
  metrics: {
    mae?: number;
    rmse?: number;
    r2Score?: number;
    mape?: number;
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
  };
  deployedAt?: Date;
  status: 'training' | 'deployed' | 'failed' | 'archived';
}

const ModelMetricsSchema = new Schema<IModelMetrics>(
  {
    modelName: { type: String, required: true },
    version: { type: String, required: true },
    trainingDate: { type: Date, required: true },
    metrics: {
      mae: { type: Number },
      rmse: { type: Number },
      r2Score: { type: Number },
      mape: { type: Number },
      accuracy: { type: Number },
      precision: { type: Number },
      recall: { type: Number },
      f1Score: { type: Number },
    },
    deployedAt: { type: Date },
    status: {
      type: String,
      enum: ['training', 'deployed', 'failed', 'archived'],
      default: 'training',
    },
  },
  { timestamps: true }
);

ModelMetricsSchema.index({ modelName: 1, version: -1 });

export const ModelMetrics = mongoose.model<IModelMetrics>('ModelMetrics', ModelMetricsSchema);
