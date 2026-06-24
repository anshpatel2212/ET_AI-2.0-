import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Station } from '../models/Station';
import { User } from '../models/User';
import { ApiKey } from '../models/ApiKey';
import { AuditLog } from '../models/AuditLog';
import { AqiReading } from '../models/AqiReading';
import { ModelMetrics } from '../models/ModelMetrics';
import { AppError } from '../middleware/errorHandler';

export async function getDashboardOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const [
      totalStations,
      activeStations,
      totalUsers,
      citizenCount,
      operatorCount,
      totalAlerts,
      activeAlerts,
      totalReports,
      recentReadings,
    ] = await Promise.all([
      Station.countDocuments(),
      Station.countDocuments({ status: 'active' }),
      User.countDocuments(),
      User.countDocuments({ role: 'citizen' }),
      User.countDocuments({ role: 'operator' }),
      require('../models/Alert').Alert.countDocuments(),
      require('../models/Alert').Alert.countDocuments({ status: { $in: ['active', 'acknowledged'] } }),
      require('../models/CitizenReport').CitizenReport.countDocuments(),
      AqiReading.findOne().sort({ timestamp: -1 }).select('aqi aqiCategory timestamp stationMeta.city').lean(),
    ]);

    res.json({
      success: true,
      data: {
        stations: { total: totalStations, active: activeStations },
        users: { total: totalUsers, citizens: citizenCount, operators: operatorCount },
        alerts: { total: totalAlerts, active: activeAlerts },
        citizenReports: totalReports,
        latestReading: recentReadings,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createStation(req: Request, res: Response, next: NextFunction) {
  try {
    const { stationId, stationName, type, location, city, ward, dataSource } = req.body;

    const existing = await Station.findOne({ stationId });
    if (existing) throw new AppError('Station ID already exists', 409);

    const station = await Station.create({
      stationId,
      stationName,
      type,
      location: {
        type: 'Point',
        coordinates: [location.lng, location.lat],
      },
      city,
      ward: ward || '',
      status: 'active',
      installedAt: new Date(),
      lastCalibration: new Date(),
      accuracy: 1.0,
      dataSource: dataSource || 'custom',
    });

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'STATION_CREATE',
      resource: 'Station',
      resourceId: station.stationId,
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.status(201).json({ success: true, data: station });
  } catch (error) {
    next(error);
  }
}

export async function getStations(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, type, city, limit = 50, offset = 0 } = req.query as any;
    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (city) query.city = { $regex: new RegExp(city, 'i') };

    const [stations, total] = await Promise.all([
      Station.find(query).skip(parseInt(offset)).limit(parseInt(limit)).lean(),
      Station.countDocuments(query),
    ]);

    res.json({ success: true, data: stations, total });
  } catch (error) {
    next(error);
  }
}

export async function updateStation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.location) {
      updateData.location = {
        type: 'Point',
        coordinates: [updateData.location.lng, updateData.location.lat],
      };
    }

    const station = await Station.findOneAndUpdate(
      { stationId: id },
      { $set: updateData },
      { new: true }
    );

    if (!station) throw new AppError('Station not found', 404);

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'STATION_UPDATE',
      resource: 'Station',
      resourceId: id,
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.json({ success: true, data: station });
  } catch (error) {
    next(error);
  }
}

export async function deleteStation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const station = await Station.findOneAndDelete({ stationId: id });
    if (!station) throw new AppError('Station not found', 404);

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'STATION_DELETE',
      resource: 'Station',
      resourceId: id,
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.json({ success: true, message: 'Station deleted' });
  } catch (error) {
    next(error);
  }
}

export async function calibrateStation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { accuracy } = req.body;

    const station = await Station.findOneAndUpdate(
      { stationId: id },
      {
        $set: {
          accuracy,
          lastCalibration: new Date(),
        },
      },
      { new: true }
    );

    if (!station) throw new AppError('Station not found', 404);

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'STATION_CALIBRATE',
      resource: 'Station',
      resourceId: id,
      before: {},
      after: { accuracy },
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.json({ success: true, data: station });
  } catch (error) {
    next(error);
  }
}

export async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { role, isActive, limit = 50, offset = 0 } = req.query as any;
    const query: any = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({ success: true, data: users, total });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.password) {
      updateData.passwordHash = await bcrypt.hash(updateData.password, 12);
      delete updateData.password;
    }

    const user = await User.findByIdAndUpdate(id, { $set: updateData }, { new: true }).select('-passwordHash');
    if (!user) throw new AppError('User not found', 404);

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'ADMIN_UPDATE_USER',
      resource: 'User',
      resourceId: id,
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!user) throw new AppError('User not found', 404);

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'ADMIN_DEACTIVATE_USER',
      resource: 'User',
      resourceId: id,
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.json({ success: true, message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
}

export async function createApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, scopes, rateLimit, expiresInDays } = req.body;

    const rawKey = `sk-${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await ApiKey.create({
      name,
      hashedKey,
      scopes,
      rateLimit: rateLimit || 1000,
      createdBy: req.user!.userId,
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : undefined,
    });

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'API_KEY_CREATE',
      resource: 'ApiKey',
      resourceId: apiKey._id.toString(),
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.status(201).json({
      success: true,
      data: {
        id: apiKey._id,
        name: apiKey.name,
        key: rawKey,
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getApiKeys(req: Request, res: Response, next: NextFunction) {
  try {
    const keys = await ApiKey.find({ createdBy: req.user!.userId })
      .select('-hashedKey')
      .lean();
    res.json({ success: true, data: keys });
  } catch (error) {
    next(error);
  }
}

export async function triggerModelRetrain(req: Request, res: Response, next: NextFunction) {
  try {
    const modelMetrics = await ModelMetrics.create({
      modelName: 'aqi-ensemble',
      version: new Date().toISOString().slice(0, 10),
      trainingDate: new Date(),
      metrics: {},
      status: 'training',
    });

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'MODEL_RETRAIN',
      resource: 'ModelMetrics',
      resourceId: modelMetrics._id.toString(),
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.json({ success: true, data: modelMetrics, message: 'Model retraining initiated' });
  } catch (error) {
    next(error);
  }
}

export async function getAuditLog(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, action, resource, limit = 100, offset = 0 } = req.query as any;
    const query: any = {};
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resource) query.resource = resource;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ timestamp: -1 }).skip(parseInt(offset)).limit(parseInt(limit)).lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({ success: true, data: logs, total });
  } catch (error) {
    next(error);
  }
}

export async function getDataQualityReport(req: Request, res: Response, next: NextFunction) {
  try {
    const totalReadings = await AqiReading.countDocuments();
    const recentReadings = await AqiReading.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const stationsWithData = await AqiReading.distinct('stationId', {
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    const totalStations = await Station.countDocuments({ status: 'active' });
    const confidenceAvg = await AqiReading.aggregate([
      { $group: { _id: null, avgConfidence: { $avg: '$confidence' } } },
    ]);

    res.json({
      success: true,
      data: {
        totalReadings,
        readingsLast24h: recentReadings,
        stationsReporting: stationsWithData.length,
        totalActiveStations: totalStations,
        stationCoveragePct: totalStations > 0 ? Math.round((stationsWithData.length / totalStations) * 100) : 0,
        averageConfidence: confidenceAvg[0]?.avgConfidence || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}
