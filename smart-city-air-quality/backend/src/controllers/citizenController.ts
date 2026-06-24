import { Request, Response, NextFunction } from 'express';
import { CitizenReport } from '../models/CitizenReport';
import { User } from '../models/User';
import { AqiReading } from '../models/AqiReading';
import { AuditLog } from '../models/AuditLog';
import { AppError } from '../middleware/errorHandler';
import { getRedisClient } from '../utils/redis';
import { computeAQI } from '../utils/aqiCalculator';

export async function submitReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { anonymous, location, category, description } = req.body;
    const userId = req.user!.userId;

    const photoUrls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        photoUrls.push(file.path || file.filename);
      }
    }

    const report = await CitizenReport.create({
      userId,
      anonymous: anonymous || false,
      location: {
        type: 'Point',
        coordinates: [location.lng, location.lat],
      },
      category,
      description,
      photoUrls,
      status: 'pending',
      greenPointsEarned: 10,
    });

    await User.findByIdAndUpdate(userId, { $inc: { greenPoints: 10 } });

    await AuditLog.create({
      userId,
      action: 'SUBMIT_REPORT',
      resource: 'CitizenReport',
      resourceId: report._id.toString(),
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

export async function getMyReports(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { limit = 20, offset = 0 } = req.query as any;

    const [reports, total] = await Promise.all([
      CitizenReport.find({ userId })
        .sort({ timestamp: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .lean(),
      CitizenReport.countDocuments({ userId }),
    ]);

    res.json({ success: true, data: reports, total });
  } catch (error) {
    next(error);
  }
}

export async function getAqiNearMe(req: Request, res: Response, next: NextFunction) {
  try {
    const { lat, lng, radius = 5000 } = req.query as any;

    if (!lat || !lng) {
      throw new AppError('Latitude and longitude are required', 400);
    }

    const readings = await AqiReading.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: 'distance',
          spherical: true,
          maxDistance: parseInt(radius),
        },
      },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$stationId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
      { $limit: 20 },
    ]);

    res.json({ success: true, data: readings, count: readings.length });
  } catch (error) {
    next(error);
  }
}

export async function createSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { city, location, threshold, channels } = req.body;

    const redis = getRedisClient();
    const key = `subscription:${userId}`;
    const existing = redis ? await redis.get(key) : null;
    const subscriptions = existing ? JSON.parse(existing) : [];

    subscriptions.push({
      id: Date.now().toString(),
      city,
      location,
      threshold,
      channels,
      createdAt: new Date().toISOString(),
    });

    if (redis) await redis.set(key, JSON.stringify(subscriptions));

    res.status(201).json({ success: true, data: subscriptions });
  } catch (error) {
    next(error);
  }
}

export async function getMySubscriptions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const redis = getRedisClient();
    const data = redis ? await redis.get(`subscription:${userId}`) : null;
    const subscriptions = data ? JSON.parse(data) : [];

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    next(error);
  }
}

export async function getLeaderboard(req: Request, res: Response, next: NextFunction) {
  try {
    const leaderboard = await User.find({ greenPoints: { $gt: 0 } })
      .sort({ greenPoints: -1 })
      .limit(50)
      .select('name greenPoints badges')
      .lean();

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    next(error);
  }
}

export async function getMyNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const redis = getRedisClient();
    const key = `notifications:${userId}`;
    const data = redis ? await redis.lrange(key, 0, 50) : [];
    const notifications = data.map((d) => JSON.parse(d));

    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
}
