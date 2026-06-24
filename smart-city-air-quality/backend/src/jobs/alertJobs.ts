import { Worker } from 'bullmq';
import { config } from '../config';
import { logger } from '../utils/logger';
import { evaluateAlertRules, autoExpireAlerts } from '../services/alertService';

const connection = {
  host: new URL(config.redisUrl).hostname || 'localhost',
  port: parseInt(new URL(config.redisUrl).port || '6379', 10),
};

export function createAlertWorker(): Worker {
  const worker = new Worker(
    'alert-processing',
    async (job) => {
      const { city, type } = job.data;
      logger.info({ jobId: job.id, city, type }, 'Alert worker started');

      if (type === 'auto-expire') {
        await autoExpireAlerts();
      } else if (city) {
        await evaluateAlertRules(city);
      }
    },
    { connection, concurrency: 2 }
  );

  worker.on('completed', (job) => logger.info({ jobId: job.id }, 'Alert job completed'));
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err: err.message }, 'Alert job failed'));

  return worker;
}

export function createAlertDispatchWorker(): Worker {
  const worker = new Worker(
    'alert-dispatch',
    async (job) => {
      const { alertId, channels, recipients } = job.data;
      logger.info({ jobId: job.id, alertId }, 'Alert dispatch worker started');

      const { sendAlertNotification } = await import('../services/notificationService');
      const { Alert } = await import('../models/Alert');
      const alert = await Alert.findOne({ alertId });

      if (alert) {
        await sendAlertNotification(alert, recipients || []);
        await Alert.updateOne(
          { alertId },
          { $addToSet: { channelsDelivered: { $each: channels || ['email', 'sms', 'push'] } } }
        );
      }
    },
    { connection, concurrency: 3 }
  );

  return worker;
}
