import { Request, Response, NextFunction } from 'express';
import { Alert } from '../models/Alert';
import { Intervention } from '../models/Intervention';
import { AuditLog } from '../models/AuditLog';
import { AppError } from '../middleware/errorHandler';
import { acknowledgeAlert, resolveAlert } from '../services/alertService';
import { generateInterventions, calculateEffectiveness, getActiveDeployments } from '../services/interventionService';
import { getCitySourceBreakdown } from '../services/sourceAttributionService';

export async function getAlertQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, city, severity } = req.query as any;
    const query: any = {};

    if (status) query.status = status;
    else query.status = { $in: ['active', 'acknowledged'] };

    if (city) query.city = { $regex: new RegExp(city, 'i') };
    if (severity) query.severity = parseInt(severity);

    const alerts = await Alert.find(query).sort({ severity: -1, startedAt: -1 }).lean();
    res.json({ success: true, data: alerts, count: alerts.length });
  } catch (error) {
    next(error);
  }
}

export async function acknowledgeAlertHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    await acknowledgeAlert(id, userId);

    await AuditLog.create({
      userId,
      action: 'ALERT_ACKNOWLEDGE',
      resource: 'Alert',
      resourceId: id,
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    next(error);
  }
}

export async function resolveAlertHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await resolveAlert(id);

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'ALERT_RESOLVE',
      resource: 'Alert',
      resourceId: id,
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    next(error);
  }
}

export async function getInterventionQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.query as any;
    const query: any = {};
    if (status) query.status = status;
    else query.status = { $in: ['proposed', 'approved', 'active'] };

    const interventions = await Intervention.find(query).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: interventions });
  } catch (error) {
    next(error);
  }
}

export async function approveIntervention(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const intervention = await Intervention.findById(id);
    if (!intervention) throw new AppError('Intervention not found', 404);

    intervention.status = 'approved';
    intervention.approvedBy = approvedBy || req.user!.userId;
    await intervention.save();

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'INTERVENTION_APPROVE',
      resource: 'Intervention',
      resourceId: id,
      before: { status: 'proposed' },
      after: { status: 'approved' },
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.json({ success: true, data: intervention });
  } catch (error) {
    next(error);
  }
}

export async function rejectIntervention(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const intervention = await Intervention.findById(id);
    if (!intervention) throw new AppError('Intervention not found', 404);

    intervention.status = 'cancelled';
    await intervention.save();

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'INTERVENTION_REJECT',
      resource: 'Intervention',
      resourceId: id,
      before: { status: 'proposed' },
      after: { status: 'cancelled' },
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.json({ success: true, data: intervention });
  } catch (error) {
    next(error);
  }
}

export async function getSourceBreakdown(req: Request, res: Response, next: NextFunction) {
  try {
    const { city } = req.query as any;
    if (!city) throw new AppError('City parameter required', 400);

    const breakdown = await getCitySourceBreakdown(city);
    res.json({ success: true, data: breakdown });
  } catch (error) {
    next(error);
  }
}

export async function dispatchHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, zone, expectedReductionPct, resources, cost, startTime } = req.body;

    const intervention = await Intervention.create({
      name: `${type.replace(/_/g, ' ')} - ${new Date().toLocaleDateString()}`,
      type,
      triggeredBy: req.user!.userId,
      zone,
      expectedReductionPct,
      resources,
      cost,
      status: 'proposed',
      startTime: new Date(startTime),
    });

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'DISPATCH_INTERVENTION',
      resource: 'Intervention',
      resourceId: intervention._id.toString(),
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.status(201).json({ success: true, data: intervention });
  } catch (error) {
    next(error);
  }
}

export async function getActiveDeploymentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const deployments = await getActiveDeployments();
    res.json({ success: true, data: deployments });
  } catch (error) {
    next(error);
  }
}

export async function getEffectivenessReport(req: Request, res: Response, next: NextFunction) {
  try {
    const interventions = await Intervention.find({
      status: { $in: ['completed', 'active'] },
    }).sort({ startTime: -1 }).lean();

    const results = await Promise.all(
      interventions.map(async (i) => {
        const score = await calculateEffectiveness(i._id.toString());
        return {
          id: i._id,
          name: i.name,
          type: i.type,
          expectedReduction: i.expectedReductionPct,
          actualReduction: i.actualReductionPct,
          effectivenessScore: score,
          cost: i.cost,
          status: i.status,
          startTime: i.startTime,
        };
      })
    );

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
}
