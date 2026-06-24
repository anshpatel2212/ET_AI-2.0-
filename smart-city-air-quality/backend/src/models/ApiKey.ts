import mongoose, { Schema, Document } from 'mongoose';

export interface IApiKey extends Document {
  name: string;
  hashedKey: string;
  scopes: string[];
  rateLimit: number;
  createdBy: string;
  expiresAt?: Date;
  usage: {
    count: number;
    lastUsed?: Date;
  };
  isActive: boolean;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    name: { type: String, required: true },
    hashedKey: { type: String, required: true, unique: true },
    scopes: [{ type: String }],
    rateLimit: { type: Number, default: 1000 },
    createdBy: { type: String, required: true },
    expiresAt: { type: Date },
    usage: {
      count: { type: Number, default: 0 },
      lastUsed: { type: Date },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ApiKeySchema.index({ hashedKey: 1 });
ApiKeySchema.index({ createdBy: 1 });

export const ApiKey = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
