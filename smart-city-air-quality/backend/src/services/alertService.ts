import { Alert } from '../models/Alert';
import { AqiReading } from '../models/AqiReading';
import { Intervention } from '../models/Intervention';
import { logger } from '../utils/logger';
import { computeAQI } from '../utils/aqiCalculator';
import { sendNotification } from './notificationService';
import { getRedisClient } from '../utils/redis';
import crypto from 'crypto';

const ALERT_RULES = [
  { name: 'critical_pm25', pollutant: 'pm25', threshold: 120, severity: 5, duration: 1 },
  { name: 'high_pm25', pollutant: 'pm25', threshold: 90, severity: 4, duration: 2 },
  { name: 'critical_pm10', pollutant: 'pm10', threshold: 350, severity: 5, duration: 1 },
  { name: 'high_pm10', pollutant: 'pm10', threshold: 250, severity: 4, duration: 2 },
  { name: 'critical_no2', pollutant: 'no2', threshold: 280, severity: 4, duration: 2 },
  { name: 'critical_o3', pollutant: 'o3', threshold: 208, severity: 4, duration: 2 },
  { name: 'hazardous_aqi', pollutant: 'aqi', threshold: 301, severity: 5, duration: 1 },
  { name: 'very_unhealthy_aqi', pollutant: 'aqi', threshold: 201, severity: 4, duration: 2 },
];

export async function evaluateAlertRules(city: string): Promise<void> {
  try {
    const latestReadings = await AqiReading.aggregate([
      { $match: { 'stationMeta.city': { $regex: new RegExp(`^${city}$`, 'i') } } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$stationId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);

    if (latestReadings.length === 0) return;

    const avgPollutants: Record<string, number> = {};
    const counts: Record<string, number> = {};

    for (const reading of latestReadings) {
      for (const key of ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'aqi']) {
        const val = (reading as any)[key];
        if (val !== undefined && val !== null) {
          avgPollutants[key] = (avgPollutants[key] || 0) + val;
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }

    for (const key of Object.keys(avgPollutants)) {
      if (counts[key]) avgPollutants[key] = Math.round((avgPollutants[key] / counts[key]) * 100) / 100;
    }

    const activeAlerts = await Alert.find({
      city: { $regex: new RegExp(`^${city}$`, 'i') },
      status: { $in: ['active', 'acknowledged'] },
    });

    for (const rule of ALERT_RULES) {
      const threshold = rule.threshold;
      const currentValue = avgPollutants[rule.pollutant];
      if (currentValue === undefined) continue;

      if (currentValue > threshold) {
        const existing = activeAlerts.find(
          (a) => a.triggeredBy === rule.name && a.status !== 'resolved'
        );
        if (existing) continue;

        const alert = await Alert.create({
          alertId: `ALERT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          title: `${rule.name.replace(/_/g, ' ').toUpperCase()} Alert in ${city}`,
          description: `${rule.pollutant.toUpperCase()} levels have reached ${currentValue} (threshold: ${threshold}). Immediate action recommended.`,
          severity: rule.severity,
          zone: {
            type: 'Polygon',
            coordinates: [[[0, 0], [0, 0], [0, 0], [0, 0]]],
          },
          city,
          ward: '',
          triggeredBy: rule.name,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + rule.duration * 60 * 60 * 1000),
          status: 'active',
          affectedPopulation: 0,
          channelsDelivered: [],
          recommendations: generateRecommendations(rule.pollutant, rule.severity),
          interventionIds: [],
        });

        await dispatchAlert(alert);
      }
    }
  } catch (error) {
    logger.error({ err: error, city }, 'Alert evaluation failed');
  }
}

function generateRecommendations(pollutant: string, severity: number): string[] {
  const recs: string[] = [];
  if (severity >= 4) {
    recs.push('Wear N95 masks when outdoors');
    recs.push('Avoid outdoor physical activity');
    recs.push('Keep windows and doors closed');
    recs.push('Use air purifiers indoors');
  }
  if (severity >= 3) {
    recs.push('Reduce vehicle usage, use public transport');
    recs.push('Avoid burning waste or biomass');
  }
  if (pollutant === 'pm25' || pollutant === 'pm10') {
    recs.push('Wet mopping recommended instead of sweeping');
  }
  if (pollutant === 'no2' || pollutant === 'o3') {
    recs.push('Limit outdoor exposure during peak hours (12 PM - 5 PM)');
  }
  return recs;
}

async function dispatchAlert(alert: any): Promise<void> {
  try {
    const channels = ['email', 'sms', 'push'];
    await sendNotification({
      type: 'alert',
      title: alert.title,
      message: alert.description,
      severity: alert.severity,
      channels,
      metadata: { alertId: alert.alertId, city: alert.city },
    });

    await Alert.updateOne(
      { alertId: alert.alertId },
      { $set: { channelsDelivered: channels } }
    );

    const redis = getRedisClient();
    await redis.publish('alerts', JSON.stringify(alert));
    logger.info({ alertId: alert.alertId }, 'Alert dispatched');
  } catch (error) {
    logger.error({ err: error, alertId: alert.alertId }, 'Alert dispatch failed');
  }
}

export async function acknowledgeAlert(alertId: string, userId: string): Promise<void> {
  const alert = await Alert.findOne({ alertId });
  if (!alert) throw new Error('Alert not found');

  alert.acknowledgedBy = alert.acknowledgedBy || [];
  if (!alert.acknowledgedBy.includes(userId)) {
    alert.acknowledgedBy.push(userId);
  }
  alert.status = 'acknowledged';
  await alert.save();
}

export async function resolveAlert(alertId: string): Promise<void> {
  await Alert.updateOne(
    { alertId },
    { $set: { status: 'resolved' } }
  );
}

export async function autoExpireAlerts(): Promise<void> {
  await Alert.updateMany(
    { expiresAt: { $lte: new Date() }, status: { $in: ['active', 'acknowledged'] } },
    { $set: { status: 'expired' } }
  );
}
