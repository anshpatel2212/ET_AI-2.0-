import { Worker } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';
import { fetchAndStoreAqiData, ingestFromWaqi, ingestFromOpenaq } from '../services/aqiService';
import { openweatherClient } from '../integrations/openweather';

const connection = {
  host: new URL(config.redisUrl).hostname || 'localhost',
  port: parseInt(new URL(config.redisUrl).port || '6379', 10),
};

export function createWaqiIngestionWorker(): Worker {
  const worker = new Worker(
    'aqi-ingestion-waqi',
    async (job) => {
      const { city } = job.data;
      logger.info({ jobId: job.id, city }, 'WAQI ingestion worker started');
      await ingestFromWaqi(city);
    },
    { connection, concurrency: 3 }
  );

  worker.on('completed', (job) => logger.info({ jobId: job.id }, 'WAQI ingestion completed'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err: err.message }, 'WAQI ingestion failed'));

  return worker;
}

export function createOpenaqIngestionWorker(): Worker {
  const worker = new Worker(
    'aqi-ingestion-openaq',
    async (job) => {
      const { city } = job.data;
      logger.info({ jobId: job.id, city }, 'OpenAQ ingestion worker started');
      await ingestFromOpenaq(city);
    },
    { connection, concurrency: 3 }
  );

  worker.on('completed', (job) => logger.info({ jobId: job.id }, 'OpenAQ ingestion completed'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err: err.message }, 'OpenAQ ingestion failed'));

  return worker;
}

export function createWeatherIngestionWorker(): Worker {
  const worker = new Worker(
    'weather-ingestion',
    async (job) => {
      const { lat, lon, city } = job.data;
      logger.info({ jobId: job.id, city, lat, lon }, 'Weather ingestion worker started');
      const weatherData = await openweatherClient.getOneCall(lat, lon);
      if (weatherData?.current) {
        const { AqiReading } = await import('../models/AqiReading');
        await AqiReading.findOneAndUpdate(
          {
            stationId: `weather_${city?.toLowerCase() || `${lat}_${lon}`}`,
            timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
          {
            $set: {
              temperature: weatherData.current.temp,
              humidity: weatherData.current.humidity,
              windSpeed: weatherData.current.wind_speed,
              windDirection: weatherData.current.wind_deg,
              pressure: weatherData.current.pressure,
            },
          },
          { upsert: false }
        );
      }
    },
    { connection, concurrency: 2 }
  );

  return worker;
}
