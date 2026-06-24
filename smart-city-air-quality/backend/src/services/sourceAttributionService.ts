import { AqiReading } from '../models/AqiReading';
import { Station } from '../models/Station';
import { logger } from '../utils/logger';

export interface SourceBreakdown {
  traffic: number;
  industrial: number;
  construction: number;
  biomass: number;
  dust: number;
  others: number;
}

const DEFAULT_BREAKDOWN: SourceBreakdown = {
  traffic: 30,
  industrial: 25,
  construction: 15,
  biomass: 12,
  dust: 10,
  others: 8,
};

export function estimateSourceAttribution(
  pm25: number,
  pm10: number,
  no2: number,
  so2: number,
  co: number,
  temperature?: number,
  windSpeed?: number
): SourceBreakdown {
  let trafficWeight = DEFAULT_BREAKDOWN.traffic;
  let industrialWeight = DEFAULT_BREAKDOWN.industrial;
  let constructionWeight = DEFAULT_BREAKDOWN.construction;
  let biomassWeight = DEFAULT_BREAKDOWN.biomass;
  let dustWeight = DEFAULT_BREAKDOWN.dust;

  if (no2 > 80) trafficWeight += 15;
  if (co > 2.0) trafficWeight += 10;
  if (so2 > 40) industrialWeight += 15;
  if (pm10 > 200 && pm10 > pm25 * 2.5) constructionWeight += 10;
  if (pm25 > 100 && co > 3.0 && no2 < 60) biomassWeight += 15;
  if (pm10 > 150 && windSpeed !== undefined && windSpeed > 15) dustWeight += 10;
  if (temperature !== undefined && temperature > 35) industrialWeight += 5;

  const total = trafficWeight + industrialWeight + constructionWeight + biomassWeight + dustWeight;
  const scale = 100 / total;

  return {
    traffic: Math.round(trafficWeight * scale),
    industrial: Math.round(industrialWeight * scale),
    construction: Math.round(constructionWeight * scale),
    biomass: Math.round(biomassWeight * scale),
    dust: Math.round(dustWeight * scale),
    others: Math.round((DEFAULT_BREAKDOWN.others) * scale),
  };
}

export async function getCitySourceBreakdown(city: string): Promise<SourceBreakdown> {
  try {
    const latest = await AqiReading.findOne({
      'stationMeta.city': { $regex: new RegExp(`^${city}$`, 'i') },
    })
      .sort({ timestamp: -1 })
      .lean();

    if (!latest) return DEFAULT_BREAKDOWN;

    return estimateSourceAttribution(
      latest.pm25 || 0,
      latest.pm10 || 0,
      latest.no2 || 0,
      latest.so2 || 0,
      latest.co || 0,
      latest.temperature,
      latest.windSpeed
    );
  } catch (error) {
    logger.error({ err: error, city }, 'Source attribution failed');
    return DEFAULT_BREAKDOWN;
  }
}
