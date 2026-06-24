import { Queue, Worker } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';
import { isRedisAvailable } from '../utils/redis';

const connection = {
  host: (() => { try { return new URL(config.redisUrl).hostname || 'localhost'; } catch { return 'localhost'; } })(),
  port: (() => { try { return parseInt(new URL(config.redisUrl).port || '6379', 10); } catch { return 6379; } })(),
};

let ingestionQueue: Queue | null = null;
let alertQueue: Queue | null = null;
let predictionQueue: Queue | null = null;
let maintenanceQueue: Queue | null = null;

function getQueues() {
  if (!ingestionQueue) {
    ingestionQueue = new Queue('aqi-ingestion', { connection });
    alertQueue = new Queue('alert-processing', { connection });
    predictionQueue = new Queue('prediction-generation', { connection });
    maintenanceQueue = new Queue('maintenance', { connection });
  }
  return { ingestionQueue, alertQueue, predictionQueue, maintenanceQueue };
}

export { ingestionQueue, alertQueue, predictionQueue, maintenanceQueue };

export async function setupWorkers(): Promise<void> {
  if (!isRedisAvailable()) {
    logger.warn('Redis not available — skipping BullMQ workers setup');
    return;
  }

  try {
    const ingestionWorker = new Worker(
      'aqi-ingestion',
      async (job) => {
        const { city } = job.data;
        logger.info({ jobId: job.id, city }, 'Processing ingestion job');

        const { ingestFromWaqi, ingestFromOpenaq } = await import('../services/aqiService');
        await Promise.allSettled([ingestFromWaqi(city), ingestFromOpenaq(city)]);

        const { evaluateAlertRules } = await import('../services/alertService');
        await evaluateAlertRules(city);
      },
      { connection, concurrency: 3 }
    );

    const alertWorker = new Worker(
      'alert-processing',
      async (job) => {
        const { city, alertId } = job.data;
        logger.info({ jobId: job.id, city, alertId }, 'Processing alert job');

        if (city) {
          const { evaluateAlertRules } = await import('../services/alertService');
          await evaluateAlertRules(city);
        }
      },
      { connection, concurrency: 2 }
    );

    const predictionWorker = new Worker(
      'prediction-generation',
      async (job) => {
        const { city, stationId } = job.data;
        logger.info({ jobId: job.id, city, stationId }, 'Processing prediction job');

        const AqiReading = (await import('../models/AqiReading')).AqiReading;
        const Prediction = (await import('../models/Prediction')).Prediction;
        const { computeAQI } = await import('../utils/aqiCalculator');

        const latest = await AqiReading.findOne(
          stationId ? { stationId } : { 'stationMeta.city': city }
        ).sort({ timestamp: -1 }).lean();

        if (latest) {
          const features = {
            pm25: latest.pm25 || 0, pm10: latest.pm10 || 0,
            no2: latest.no2 || 0, so2: latest.so2 || 0,
            co: latest.co || 0, o3: latest.o3 || 0,
          };
          const aqiResult = computeAQI(features);
          const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

          await Prediction.create({
            stationId: stationId || latest.stationId,
            city: city || latest.stationMeta.city,
            generatedAt: new Date(),
            validUntil,
            horizons: {
              hour1: Math.round(aqiResult.aqi * 0.95),
              hour3: Math.round(aqiResult.aqi * 0.90),
              hour6: Math.round(aqiResult.aqi * 0.85),
              hour12: Math.round(aqiResult.aqi * 0.80),
              hour24: Math.round(aqiResult.aqi * 0.70),
            },
            models: ['fallback-ensemble'],
            ensembleWeights: { 'fallback-ensemble': 1 },
            features,
          });
        }
      },
      { connection, concurrency: 2 }
    );

    const maintenanceWorker = new Worker(
      'maintenance',
      async (job) => {
        const { type } = job.data;
        logger.info({ jobId: job.id, type }, 'Processing maintenance job');

        switch (type) {
          case 'station-sync': {
            const { Station } = await import('../models/Station');
            await Station.updateMany(
              { lastCalibration: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
              { status: 'maintenance' }
            );
            break;
          }
          case 'data-quality': {
            const { AqiReading } = await import('../models/AqiReading');
            await AqiReading.deleteMany({
              timestamp: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
              confidence: { $lt: 0.3 },
            });
            break;
          }
          case 'cleanup': {
            const { AqiReading } = await import('../models/AqiReading');
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const count = await AqiReading.countDocuments({ timestamp: { $lt: thirtyDaysAgo } });
            if (count > 100000) {
              const toDelete = count - 100000;
              const oldReadings = await AqiReading.find({ timestamp: { $lt: thirtyDaysAgo } })
                .sort({ timestamp: 1 })
                .limit(toDelete)
                .select('_id');
              const ids = oldReadings.map((r) => r._id);
              await AqiReading.deleteMany({ _id: { $in: ids } });
              logger.info({ deletedCount: ids.length }, 'Cleanup completed');
            }
            break;
          }
          case 'expire-alerts': {
            const { Alert } = await import('../models/Alert');
            await Alert.updateMany(
              { expiresAt: { $lte: new Date() }, status: { $in: ['active', 'acknowledged'] } },
              { status: 'expired' }
            );
            break;
          }
        }
      },
      { connection, concurrency: 1 }
    );

    ingestionWorker.on('completed', (job) => logger.info({ jobId: job.id }, 'Ingestion job completed'));
    ingestionWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Ingestion job failed'));

    alertWorker.on('completed', (job) => logger.info({ jobId: job.id }, 'Alert job completed'));
    alertWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Alert job failed'));

    predictionWorker.on('completed', (job) => logger.info({ jobId: job.id }, 'Prediction job completed'));
    predictionWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Prediction job failed'));

    maintenanceWorker.on('completed', (job) => logger.info({ jobId: job.id }, 'Maintenance job completed'));
    maintenanceWorker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Maintenance job failed'));

    logger.info('BullMQ workers initialized');
  } catch (err) {
    logger.warn({ err }, 'Failed to setup BullMQ workers — running without job queues');
  }
}

export async function scheduleRecurringJobs(): Promise<void> {
  if (!isRedisAvailable()) {
    logger.warn('Redis not available — skipping recurring job scheduling');
    return;
  }

  try {
    const queues = getQueues();
    const { default: cron } = await import('node-cron');

    cron.schedule('*/15 * * * *', async () => {
      logger.info('Running scheduled AQI ingestion');
      const stations = await (await import('../models/Station')).Station.distinct('city', { status: 'active' });
      for (const city of stations.slice(0, 20)) {
        await queues.ingestionQueue!.add('ingest', { city }, { removeOnComplete: 100, removeOnFail: 500 });
      }
    });

    cron.schedule('*/30 * * * *', async () => {
      logger.info('Running scheduled alert evaluation');
      const cities = await (await import('../models/Station')).Station.distinct('city');
      for (const city of cities) {
        await queues.alertQueue!.add('evaluate-alerts', { city }, { removeOnComplete: 100, removeOnFail: 500 });
      }
    });

    cron.schedule('0 */2 * * *', async () => {
      logger.info('Running scheduled predictions');
      const cities = await (await import('../models/Station')).Station.distinct('city');
      for (const city of cities.slice(0, 20)) {
        await queues.predictionQueue!.add('predict', { city }, { removeOnComplete: 100, removeOnFail: 500 });
      }
    });

    cron.schedule('0 3 * * *', async () => {
      await queues.maintenanceQueue!.add('maintenance', { type: 'station-sync' }, { removeOnComplete: 100 });
      await queues.maintenanceQueue!.add('maintenance', { type: 'data-quality' }, { removeOnComplete: 100 });
      await queues.maintenanceQueue!.add('maintenance', { type: 'cleanup' }, { removeOnComplete: 100 });
      await queues.maintenanceQueue!.add('maintenance', { type: 'expire-alerts' }, { removeOnComplete: 100 });
      logger.info('Maintenance jobs scheduled');
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to schedule recurring jobs — running without them');
  }
}
