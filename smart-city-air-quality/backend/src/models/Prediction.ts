import mongoose, { Schema, Document } from 'mongoose';

export interface IPrediction extends Document {
  stationId: string;
  city: string;
  generatedAt: Date;
  validUntil: Date;
  horizons: {
    hour1?: number;
    hour3?: number;
    hour6?: number;
    hour12?: number;
    hour24?: number;
    hour48?: number;
    hour72?: number;
  };
  models: string[];
  ensembleWeights: Record<string, number>;
  features: Record<string, number>;
  shapExplanation?: Record<string, number>;
  accuracy?: number;
}

const PredictionSchema = new Schema<IPrediction>(
  {
    stationId: { type: String, required: true, index: true },
    city: { type: String, required: true, index: true },
    generatedAt: { type: Date, required: true, default: Date.now },
    validUntil: { type: Date, required: true },
    horizons: {
      hour1: { type: Number },
      hour3: { type: Number },
      hour6: { type: Number },
      hour12: { type: Number },
      hour24: { type: Number },
      hour48: { type: Number },
      hour72: { type: Number },
    },
    models: [{ type: String }],
    ensembleWeights: { type: Schema.Types.Mixed, default: {} },
    features: { type: Schema.Types.Mixed, default: {} },
    shapExplanation: { type: Schema.Types.Mixed },
    accuracy: { type: Number },
  },
  { timestamps: true }
);

PredictionSchema.index({ city: 1, generatedAt: -1 });
PredictionSchema.index({ stationId: 1, generatedAt: -1 });

export const Prediction = mongoose.model<IPrediction>('Prediction', PredictionSchema);
