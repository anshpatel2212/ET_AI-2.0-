import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from './logger';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection failed');
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB runtime error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}

export async function closeDatabaseConnection(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}
