import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/smart-city-aqi',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'default-refresh-secret-change-in-production',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:5000',
  waqiApiKey: process.env.WAQI_API_KEY || '',
  openaqApiKey: process.env.OPENAQ_API_KEY || '',
  owmApiKey: process.env.OWM_API_KEY || '',
  mapboxToken: process.env.MAPBOX_TOKEN || '',
  tomtomApiKey: process.env.TOMTOM_API_KEY || '',
  nasaFirmsApiKey: process.env.NASA_FIRMS_API_KEY || '',
  googleAqiApiKey: process.env.GOOGLE_AQI_API_KEY || '',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  sendGridApiKey: process.env.SENDGRID_API_KEY || '',
  sendGridFromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@smartcityaqi.com',
  fcmServerKey: process.env.FCM_SERVER_KEY || '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsRegion: process.env.AWS_REGION || 'ap-south-1',
  s3Bucket: process.env.S3_BUCKET || 'smart-city-aqi-uploads',
  nodeEnv: process.env.NODE_ENV || 'development',
};
