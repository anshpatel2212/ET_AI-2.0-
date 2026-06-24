import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  mobile?: string;
  name: string;
  role: 'citizen' | 'operator' | 'admin';
  passwordHash: string;
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    alertThresholds: {
      pm25?: number;
      pm10?: number;
      aqi?: number;
    };
    preferredCities: string[];
    language: string;
  };
  healthProfile?: {
    hasAsthma: boolean;
    hasHeartDisease: boolean;
    hasLungDisease: boolean;
    isElderly: boolean;
    hasChildren: boolean;
    sensitiveToPollution: boolean;
  };
  greenPoints: number;
  badges: string[];
  trackedLocations: {
    name: string;
    location: {
      type: 'Point';
      coordinates: [number, number];
    };
  }[];
  lastLogin?: Date;
  isActive: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, sparse: true },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ['citizen', 'operator', 'admin'],
      default: 'citizen',
    },
    passwordHash: { type: String, required: true },
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
      },
      alertThresholds: {
        pm25: { type: Number },
        pm10: { type: Number },
        aqi: { type: Number, default: 200 },
      },
      preferredCities: [{ type: String }],
      language: { type: String, default: 'en' },
    },
    healthProfile: {
      hasAsthma: { type: Boolean, default: false },
      hasHeartDisease: { type: Boolean, default: false },
      hasLungDisease: { type: Boolean, default: false },
      isElderly: { type: Boolean, default: false },
      hasChildren: { type: Boolean, default: false },
      sensitiveToPollution: { type: Boolean, default: false },
    },
    greenPoints: { type: Number, default: 0 },
    badges: [{ type: String }],
    trackedLocations: [
      {
        name: { type: String, required: true },
        location: {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: { type: [Number], required: true },
        },
      },
    ],
    lastLogin: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
