import { Intervention } from '../models/Intervention';
import { Alert } from '../models/Alert';
import { AqiReading } from '../models/AqiReading';
import { logger } from '../utils/logger';

export interface InterventionRecommendation {
  type: string;
  name: string;
  description: string;
  expectedReductionPct: number;
  priority: number;
  cost: number;
}

export async function generateInterventions(alertId: string): Promise<InterventionRecommendation[]> {
  const alert = await Alert.findOne({ alertId });
  if (!alert) return [];

  const recommendations: InterventionRecommendation[] = [];
  const severity = alert.severity;

  if (severity >= 4) {
    recommendations.push({
      type: 'traffic_diversion',
      name: 'Traffic Diversion Plan',
      description: 'Divert heavy vehicles from affected zones and implement alternate route plans.',
      expectedReductionPct: 25,
      priority: 1,
      cost: 50000,
    });

    recommendations.push({
      type: 'water_sprinkling',
      name: 'Water Sprinkling on Roads',
      description: 'Deploy water sprinklers on major roads to suppress dust particles.',
      expectedReductionPct: 15,
      priority: 2,
      cost: 20000,
    });
  }

  if (severity >= 3) {
    recommendations.push({
      type: 'construction_ban',
      name: 'Temporary Construction Ban',
      description: 'Impose temporary ban on construction and demolition activities in affected zone.',
      expectedReductionPct: 30,
      priority: 3,
      cost: 10000,
    });

    recommendations.push({
      type: 'vehicle_restriction',
      name: 'Odd-Even Vehicle Scheme',
      description: 'Implement odd-even vehicle number plate scheme to reduce traffic emissions.',
      expectedReductionPct: 20,
      priority: 4,
      cost: 10000,
    });
  }

  if (severity === 5) {
    recommendations.push({
      type: 'industrial_shutdown',
      name: 'Temporary Industrial Shutdown',
      description: 'Order temporary shutdown of major industrial units in the affected zone.',
      expectedReductionPct: 40,
      priority: 5,
      cost: 100000,
    });

    recommendations.push({
      type: 'evacuation',
      name: 'Evacuation Advisory',
      description: 'Issue evacuation advisory for sensitive populations (elderly, children, patients).',
      expectedReductionPct: 0,
      priority: 0,
      cost: 500000,
    });
  }

  return recommendations;
}

export async function calculateEffectiveness(interventionId: string): Promise<number | null> {
  const intervention = await Intervention.findById(interventionId);
  if (!intervention || intervention.status !== 'completed') return null;

  if (intervention.actualReductionPct !== undefined) {
    return Math.round((intervention.actualReductionPct / intervention.expectedReductionPct) * 100);
  }

  const readings = await AqiReading.aggregate([
    {
      $match: {
        timestamp: {
          $gte: intervention.startTime,
          $lte: intervention.endTime || new Date(),
        },
      },
    },
    { $sort: { timestamp: 1 } },
    { $group: { _id: null, avgAqi: { $avg: '$aqi' } } },
  ]);

  if (readings.length === 0) return null;
  const avgAqi = readings[0].avgAqi || 0;

  const beforeReadings = await AqiReading.aggregate([
    {
      $match: {
        timestamp: {
          $gte: new Date(intervention.startTime.getTime() - 24 * 60 * 60 * 1000),
          $lt: intervention.startTime,
        },
      },
    },
    { $group: { _id: null, avgAqi: { $avg: '$aqi' } } },
  ]);

  if (beforeReadings.length === 0) return null;
  const beforeAvg = beforeReadings[0].avgAqi || 0;

  if (beforeAvg === 0) return null;
  const reductionPct = Math.round(((beforeAvg - avgAqi) / beforeAvg) * 100);
  intervention.actualReductionPct = Math.max(0, reductionPct);
  await intervention.save();

  return Math.round((reductionPct / intervention.expectedReductionPct) * 100);
}

export async function getActiveDeployments(): Promise<any[]> {
  return Intervention.find({
    status: { $in: ['approved', 'active'] },
    startTime: { $lte: new Date() },
    $or: [{ endTime: { $gte: new Date() } }, { endTime: null }],
  })
    .sort({ startTime: -1 })
    .lean();
}
