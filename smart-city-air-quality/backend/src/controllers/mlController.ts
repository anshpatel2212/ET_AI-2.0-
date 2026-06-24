import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { config } from '../config';
import { Prediction } from '../models/Prediction';
import { ModelMetrics } from '../models/ModelMetrics';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { computeAQI } from '../utils/aqiCalculator';
import { AqiReading } from '../models/AqiReading';

const ML_TIMEOUT = 15000;

export async function predict(req: Request, res: Response, next: NextFunction) {
  try {
    const { stationId, city, lat, lng, hours } = req.body;

    const latestReadings = await AqiReading.findOne(
      stationId ? { stationId } : { 'stationMeta.city': city }
    )
      .sort({ timestamp: -1 })
      .lean();

    if (!latestReadings) throw new AppError('No recent readings found for prediction', 404);

    const features = {
      pm25: latestReadings.pm25 || 0,
      pm10: latestReadings.pm10 || 0,
      no2: latestReadings.no2 || 0,
      so2: latestReadings.so2 || 0,
      co: latestReadings.co || 0,
      o3: latestReadings.o3 || 0,
      temperature: latestReadings.temperature || 0,
      humidity: latestReadings.humidity || 0,
      windSpeed: latestReadings.windSpeed || 0,
      pressure: latestReadings.pressure || 0,
    };

    let predictions: Record<string, number> = {};
    let models: string[] = [];
    let shapExplanation: Record<string, number> | undefined;

    try {
      const mlResponse = await axios.post(
        `${config.mlServiceUrl}/predict`,
        { features, hours: hours || [1, 3, 6, 12, 24] },
        { timeout: ML_TIMEOUT }
      );

      if (mlResponse.data?.predictions) {
        predictions = mlResponse.data.predictions;
        models = mlResponse.data.models || ['ml-ensemble'];
        shapExplanation = mlResponse.data.shap;
      }
    } catch (mlError: any) {
      logger.warn({ err: mlError.message }, 'ML service unavailable, using fallback prediction');

      for (const h of (hours || [1, 3, 6, 12, 24])) {
        const decay = Math.exp(-h * 0.05);
        predictions[`hour${h}`] = Math.round(computeAQI(features).aqi * decay);
      }
      models = ['fallback-linear'];
    }

    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + Math.max(...(hours || [24])));

    const prediction = await Prediction.create({
      stationId: stationId || latestReadings.stationId,
      city: city || latestReadings.stationMeta.city,
      generatedAt: new Date(),
      validUntil,
      horizons: predictions,
      models,
      ensembleWeights: models.reduce((acc: any, m: string) => {
        acc[m] = 1 / models.length;
        return acc;
      }, {}),
      features,
      shapExplanation,
    });

    res.json({ success: true, data: prediction });
  } catch (error) {
    next(error);
  }
}

export async function detectImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new AppError('Image file is required', 400);
    }

    let analysis: Record<string, any> = {};

    try {
      const formData = new FormData();
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
      formData.append('image', blob, req.file.originalname);

      const mlResponse = await axios.post(
        `${config.mlServiceUrl}/detect`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: ML_TIMEOUT,
        }
      );

      if (mlResponse.data) {
        analysis = mlResponse.data;
      }
    } catch (mlError: any) {
      logger.warn({ err: mlError.message }, 'ML image detection service unavailable');
      analysis = {
        predictedCategory: 'unknown',
        confidence: 0,
        detectedObjects: [],
        note: 'ML service unavailable, analysis may be incomplete',
      };
    }

    res.json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
}

export async function getModelStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const models = await ModelMetrics.find({ status: 'deployed' })
      .sort({ deployedAt: -1 })
      .lean();

    let mlServiceStatus = 'unavailable';
    try {
      await axios.get(`${config.mlServiceUrl}/health`, { timeout: 5000 });
      mlServiceStatus = 'available';
    } catch {
      mlServiceStatus = 'unavailable';
    }

    res.json({
      success: true,
      data: {
        deployedModels: models,
        mlServiceStatus,
        mlServiceUrl: config.mlServiceUrl,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getFeatureImportance(req: Request, res: Response, next: NextFunction) {
  try {
    let featureImportance: Record<string, number> = {};

    try {
      const mlResponse = await axios.get(
        `${config.mlServiceUrl}/feature-importance`,
        { timeout: 5000 }
      );
      if (mlResponse.data?.importance) {
        featureImportance = mlResponse.data.importance;
      }
    } catch {
      featureImportance = {
        pm25: 0.35,
        pm10: 0.20,
        no2: 0.15,
        temperature: 0.10,
        humidity: 0.08,
        windSpeed: 0.07,
        so2: 0.03,
        co: 0.02,
      };
    }

    res.json({ success: true, data: featureImportance });
  } catch (error) {
    next(error);
  }
}

export async function sourceAttribution(req: Request, res: Response, next: NextFunction) {
  try {
    const { city, lat, lng } = req.body;

    let attribution: Record<string, number> = {};

    try {
      const mlResponse = await axios.post(
        `${config.mlServiceUrl}/source-attribution`,
        { city, lat, lng },
        { timeout: ML_TIMEOUT }
      );
      if (mlResponse.data?.attribution) {
        attribution = mlResponse.data.attribution;
      }
    } catch {
      const latest = await AqiReading.findOne(
        city ? { 'stationMeta.city': city } : {}
      ).sort({ timestamp: -1 }).lean();

      if (latest) {
        const { pm25, pm10, no2, so2, co } = latest;
        let traffic = 30, industrial = 25, construction = 15, biomass = 12, dust = 10;
        if ((no2 || 0) > 80) traffic += 15;
        if ((so2 || 0) > 40) industrial += 15;
        if ((pm10 || 0) > 200) construction += 10;
        if ((pm25 || 0) > 100 && (co || 0) > 3) biomass += 15;
        const total = traffic + industrial + construction + biomass + dust;
        attribution = {
          traffic: Math.round(traffic / total * 100),
          industrial: Math.round(industrial / total * 100),
          construction: Math.round(construction / total * 100),
          biomass: Math.round(biomass / total * 100),
          dust: Math.round(dust / total * 100),
          others: 100 - Math.round((traffic + industrial + construction + biomass + dust) / total * 100),
        };
      }
    }

    res.json({ success: true, data: attribution });
  } catch (error) {
    next(error);
  }
}
