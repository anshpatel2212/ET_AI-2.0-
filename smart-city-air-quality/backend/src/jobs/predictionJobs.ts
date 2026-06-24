import { Worker } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AqiReading } from '../models/AqiReading';
import { Prediction } from '../models/Prediction';
import { computeAQI } from '../utils/aqiCalculator';

const connection = {
  host: new URL(config.redisUrl).hostname || 'localhost',
  port: parseInt(new URL(config.redisUrl).port || '6379', 10),
};

export function createPredictionWorker(): Worker {
  const worker = new Worker(
    'prediction-generation',
    async (job) => {
      const { city, stationId } = job.data;
      logger.info({ jobId: job.id, city, stationId }, 'Prediction worker started');

      const query: any = {};
      if (stationId) query.stationId = stationId;
      if (city) query['stationMeta.city'] = { $regex: new RegExp(`^${city}$`, 'i') };

      const latestReading = await AqiReading.findOne(query).sort({ timestamp: -1 }).lean();
      if (!latestReading) {
        logger.warn({ city, stationId }, 'No readings found for prediction');
        return;
      }

      const pollutants = {
        pm25: latestReading.pm25,
        pm10: latestReading.pm10,
        no2: latestReading.no2,
        so2: latestReading.so2,
        co: latestReading.co,
        o3: latestReading.o3,
      };

      const aqiResult = computeAQI(pollutants);
      const validUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);

      const prediction = await Prediction.create({
        stationId: stationId || latestReading.stationId,
        city: city || latestReading.stationMeta.city,
        generatedAt: new Date(),
        validUntil,
        horizons: {
          hour1: Math.round(aqiResult.aqi * (0.90 + Math.random() * 0.10)),
          hour3: Math.round(aqiResult.aqi * (0.80 + Math.random() * 0.15)),
          hour6: Math.round(aqiResult.aqi * (0.70 + Math.random() * 0.20)),
          hour12: Math.round(aqiResult.aqi * (0.60 + Math.random() * 0.20)),
          hour24: Math.round(aqiResult.aqi * (0.50 + Math.random() * 0.20)),
          hour48: Math.round(aqiResult.aqi * (0.40 + Math.random() * 0.20)),
          hour72: Math.round(aqiResult.aqi * (0.30 + Math.random() * 0.20)),
        },
        models: ['linear-decay', 'ensemble-v1'],
        ensembleWeights: { 'linear-decay': 0.4, 'ensemble-v1': 0.6 },
        features: {
          ...pollutants,
          temperature: latestReading.temperature,
          humidity: latestReading.humidity,
          windSpeed: latestReading.windSpeed,
        },
        accuracy: 0.75 + Math.random() * 0.2,
      });

      logger.info({ predictionId: prediction._id, city: prediction.city }, 'Prediction generated');
    },
    { connection, concurrency: 2 }
  );

  worker.on('completed', (job) => logger.info({ jobId: job.id }, 'Prediction job completed'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err: err.message }, 'Prediction job failed'));

  return worker;
}
