import { Request, Response, NextFunction } from 'express';
import { Station } from '../models/Station';
import { AqiReading } from '../models/AqiReading';
import { Prediction } from '../models/Prediction';
import { Alert } from '../models/Alert';
import { getCurrentAqiForCity, getCurrentAqiForStation } from '../services/aqiService';
import { generateHealthAdvisory } from '../services/healthAdvisoryService';

export async function getCurrentAqi(req: Request, res: Response, next: NextFunction) {
  try {
    const { city, lat, lng, stationId } = req.query as any;

    if (stationId) {
      const data = await getCurrentAqiForStation(stationId);
      if (!data) {
        res.status(404).json({ success: false, error: 'Station not found' });
        return;
      }
      res.json({ success: true, data });
      return;
    }

    if (city) {
      const data = await getCurrentAqiForCity(city);
      res.json({ success: true, data, count: data.length });
      return;
    }

    const query: any = {};
    if (lat && lng) {
      const readings = await AqiReading.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            distanceField: 'distance',
            spherical: true,
            maxDistance: 50000,
          },
        },
        { $sort: { timestamp: -1 } },
        { $group: { _id: '$stationId', doc: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$doc' } },
        { $limit: 10 },
      ]);
      res.json({ success: true, data: readings, count: readings.length });
      return;
    }

    const cities = await AqiReading.distinct('stationMeta.city');
    const results: any[] = [];
    for (const c of cities.slice(0, 20)) {
      const cityData = await getCurrentAqiForCity(c);
      if (cityData.length > 0) results.push(cityData[0]);
    }
    res.json({ success: true, data: results, count: results.length });
  } catch (error) {
    next(error);
  }
}

export async function getCities(req: Request, res: Response, next: NextFunction) {
  try {
    const cities = await Station.distinct('city', { status: 'active' });
    const result = await Promise.all(
      cities.map(async (city) => {
        const latest = await AqiReading.findOne({ 'stationMeta.city': city })
          .sort({ timestamp: -1 })
          .select('aqi aqiCategory stationMeta.city timestamp')
          .lean();
        return {
          name: city,
          aqi: latest?.aqi || 0,
          category: latest?.aqiCategory || 'Unknown',
          lastUpdated: latest?.timestamp,
        };
      })
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getStations(req: Request, res: Response, next: NextFunction) {
  try {
    const { city, status, type, limit = 50, offset = 0 } = req.query as any;
    const query: any = {};
    if (city) query.city = { $regex: new RegExp(city as string, 'i') };
    if (status) query.status = status;
    if (type) query.type = type;

    const [stations, total] = await Promise.all([
      Station.find(query).skip(parseInt(offset)).limit(parseInt(limit)).lean(),
      Station.countDocuments(query),
    ]);

    res.json({ success: true, data: stations, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    next(error);
  }
}

export async function getStationLatest(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getCurrentAqiForStation(req.params.id);
    if (!data) {
      res.status(404).json({ success: false, error: 'Station not found' });
      return;
    }
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getStationHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to, limit = 100, offset = 0 } = req.query as any;
    const query: any = { stationId: req.params.id };

    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const [readings, total] = await Promise.all([
      AqiReading.find(query)
        .sort({ timestamp: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .lean(),
      AqiReading.countDocuments(query),
    ]);

    res.json({ success: true, data: readings, total });
  } catch (error) {
    next(error);
  }
}

export async function getActiveAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const { city } = req.query as any;
    const query: any = { status: { $in: ['active', 'acknowledged'] } };
    if (city) query.city = { $regex: new RegExp(city, 'i') };

    const alerts = await Alert.find(query).sort({ severity: -1, startedAt: -1 }).lean();
    res.json({ success: true, data: alerts, count: alerts.length });
  } catch (error) {
    next(error);
  }
}

export async function getForecast(req: Request, res: Response, next: NextFunction) {
  try {
    const { city, stationId } = req.query as any;
    const query: any = {};
    if (city) query.city = { $regex: new RegExp(city, 'i') };
    if (stationId) query.stationId = stationId;

    const predictions = await Prediction.find(query)
      .sort({ generatedAt: -1 })
      .limit(10)
      .lean();

    res.json({ success: true, data: predictions });
  } catch (error) {
    next(error);
  }
}

export async function getHealthAdvisory(req: Request, res: Response, next: NextFunction) {
  try {
    const { city, includeForecast } = req.query as any;
    if (!city) {
      res.status(400).json({ success: false, error: 'City parameter is required' });
      return;
    }

    const readings = await getCurrentAqiForCity(city);
    const advisory = generateHealthAdvisory(readings, includeForecast !== 'false');
    res.json({ success: true, data: advisory });
  } catch (error) {
    next(error);
  }
}
