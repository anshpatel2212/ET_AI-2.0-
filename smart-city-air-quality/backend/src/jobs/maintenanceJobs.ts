import { Worker } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';

const connection = {
  host: new URL(config.redisUrl).hostname || 'localhost',
  port: parseInt(new URL(config.redisUrl).port || '6379', 10),
};

export function createMaintenanceWorker(): Worker {
  const worker = new Worker(
    'maintenance',
    async (job) => {
      const { type } = job.data;
      logger.info({ jobId: job.id, type }, 'Maintenance worker started');

      const Station = (await import('../models/Station')).Station;
      const AqiReading = (await import('../models/AqiReading')).AqiReading;
      const Alert = (await import('../models/Alert')).Alert;

      switch (type) {
        case 'station-sync': {
          const result = await Station.updateMany(
            {
              $or: [
                { lastCalibration: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
                { lastCalibration: { $exists: false } },
              ],
              status: 'active',
            },
            { status: 'maintenance' }
          );
          logger.info({ modifiedCount: result.modifiedCount }, 'Station sync completed');
          break;
        }

        case 'data-quality': {
          const result = await AqiReading.deleteMany({
            timestamp: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            confidence: { $lt: 0.3 },
          });
          logger.info({ deletedCount: result.deletedCount }, 'Data quality cleanup completed');
          break;
        }

        case 'cleanup': {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const totalCount = await AqiReading.countDocuments({ timestamp: { $lt: thirtyDaysAgo } });

          if (totalCount > 100000) {
            const toDelete = totalCount - 50000;
            const oldReadings = await AqiReading.find({ timestamp: { $lt: thirtyDaysAgo } })
              .sort({ timestamp: 1 })
              .limit(toDelete)
              .select('_id');
            const ids = oldReadings.map((r) => r._id);
            await AqiReading.deleteMany({ _id: { $in: ids } });
            logger.info({ deletedCount: ids.length }, 'Old readings cleanup completed');
          }
          break;
        }

        case 'expire-alerts': {
          const result = await Alert.updateMany(
            {
              expiresAt: { $lte: new Date() },
              status: { $in: ['active', 'acknowledged'] },
            },
            { status: 'expired' }
          );
          logger.info({ modifiedCount: result.modifiedCount }, 'Alert expiration completed');
          break;
        }

        case 'recompute-aqi': {
          const readings = await AqiReading.find({ aqi: { $exists: false } }).limit(1000);
          const { computeAQI } = await import('../utils/aqiCalculator');
          let updated = 0;

          for (const reading of readings) {
            const result = computeAQI({
              pm25: reading.pm25,
              pm10: reading.pm10,
              no2: reading.no2,
              so2: reading.so2,
              co: reading.co,
              o3: reading.o3,
            });

            await AqiReading.updateOne(
              { _id: reading._id },
              {
                $set: {
                  aqi: result.aqi,
                  aqiCategory: result.category,
                  primaryPollutant: result.primaryPollutant,
                  healthAdvice: result.healthAdvice,
                },
              }
            );
            updated++;
          }
          logger.info({ updated }, 'AQI recomputation completed');
          break;
        }

        default:
          logger.warn({ type }, 'Unknown maintenance job type');
      }
    },
    { connection, concurrency: 1 }
  );

  worker.on('completed', (job) => logger.info({ jobId: job.id, type: job.data.type }, 'Maintenance job completed'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err: err.message, type: job?.data?.type }, 'Maintenance job failed'));

  return worker;
}
