import { AqiReading } from '../models/AqiReading';
import { Station } from '../models/Station';
import { computeAQI, PollutantLevels } from '../utils/aqiCalculator';
import { logger } from '../utils/logger';
import { waqiClient } from '../integrations/waqi';
import { openaqClient } from '../integrations/openaq';
import { openweatherClient } from '../integrations/openweather';
import { cpcbClient } from '../integrations/cpcb';

export interface EnrichedReading {
  stationId: string;
  stationName: string;
  city: string;
  ward: string;
  location: { type: 'Point'; coordinates: [number, number] };
  pollutants: PollutantLevels;
  weather: {
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    windDirection?: number;
    pressure?: number;
    rainfall?: number;
  };
  aqi: number;
  aqiCategory: string;
  primaryPollutant: string;
  healthAdvice: string;
  source: string;
  timestamp: Date;
}

export function computeConfidence(
  source: string,
  pollutants: string[],
  timestamp: Date
): number {
  let base: number;
  switch (source) {
    case 'waqi':
      base = 0.85;
      break;
    case 'openaq':
      base = 0.75;
      break;
    case 'google':
      base = 0.90;
      break;
    case 'cpcb':
      base = 0.95;
      break;
    default:
      base = 0.7;
  }

  if (source === 'waqi' || source === 'openaq') {
    const majorPollutants = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3'];
    const hasAllMajor = majorPollutants.every((p) => pollutants.includes(p));
    if (hasAllMajor) base += 0.05;
  }

  const ageMinutes = (Date.now() - new Date(timestamp).getTime()) / 60000;

  if (source === 'waqi' && ageMinutes > 60) {
    base -= 0.1;
  }

  if (ageMinutes > 30) {
    const hoursStale = Math.max(1, Math.floor((ageMinutes - 30) / 60));
    base -= 0.05 * hoursStale;
  }

  if (pollutants.length < 3) {
    base -= 0.1;
  }

  return Math.min(0.99, Math.max(0.3, Math.round(base * 100) / 100));
}

export async function getCurrentAqiForStation(stationId: string): Promise<EnrichedReading | null> {
  const station = await Station.findOne({ stationId });
  if (!station) return null;

  const latestReading = await AqiReading.findOne({ stationId })
    .sort({ timestamp: -1 })
    .lean();

  if (!latestReading) return null;

  return {
    stationId: latestReading.stationId,
    stationName: latestReading.stationMeta.stationName,
    city: latestReading.stationMeta.city,
    ward: latestReading.stationMeta.ward,
    location: latestReading.stationMeta.location,
    pollutants: {
      pm25: latestReading.pm25,
      pm10: latestReading.pm10,
      no2: latestReading.no2,
      so2: latestReading.so2,
      co: latestReading.co,
      o3: latestReading.o3,
      nh3: latestReading.nh3,
      nox: latestReading.nox,
    },
    weather: {
      temperature: latestReading.temperature,
      humidity: latestReading.humidity,
      windSpeed: latestReading.windSpeed,
      windDirection: latestReading.windDirection,
      pressure: latestReading.pressure,
      rainfall: latestReading.rainfall,
    },
    aqi: latestReading.aqi || 0,
    aqiCategory: latestReading.aqiCategory || 'Unknown',
    primaryPollutant: latestReading.primaryPollutant || '',
    healthAdvice: latestReading.healthAdvice || '',
    source: latestReading.source,
    timestamp: latestReading.timestamp,
  };
}

export async function getCurrentAqiForCity(city: string): Promise<EnrichedReading[]> {
  const readings = await AqiReading.aggregate([
    { $match: { 'stationMeta.city': { $regex: new RegExp(`^${city}$`, 'i') } } },
    { $sort: { timestamp: -1 } },
    { $group: { _id: '$stationId', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
    { $limit: 50 },
  ]);

  return readings.map((r) => ({
    stationId: r.stationId,
    stationName: r.stationMeta.stationName,
    city: r.stationMeta.city,
    ward: r.stationMeta.ward,
    location: r.stationMeta.location,
    pollutants: {
      pm25: r.pm25, pm10: r.pm10, no2: r.no2, so2: r.so2,
      co: r.co, o3: r.o3, nh3: r.nh3, nox: r.nox,
    },
    weather: {
      temperature: r.temperature, humidity: r.humidity,
      windSpeed: r.windSpeed, windDirection: r.windDirection,
      pressure: r.pressure, rainfall: r.rainfall,
    },
    aqi: r.aqi || 0,
    aqiCategory: r.aqiCategory || 'Unknown',
    primaryPollutant: r.primaryPollutant || '',
    healthAdvice: r.healthAdvice || '',
    source: r.source,
    timestamp: r.timestamp,
  }));
}

export async function ingestFromWaqi(city: string): Promise<void> {
  const data = await waqiClient.getFeedByCity(city);
  if (!data) return;

  const iaqi = data.iaqi || {};
  const pollutants: PollutantLevels = {
    pm25: iaqi.pm25?.v,
    pm10: iaqi.pm10?.v,
    no2: iaqi.no2?.v,
    so2: iaqi.so2?.v,
    co: iaqi.co?.v,
    o3: iaqi.o3?.v,
  };

  const result = computeAQI(pollutants);
  const coords: [number, number] = data.city?.geo
    ? [data.city.geo[1], data.city.geo[0]]
    : [0, 0];

  await AqiReading.create({
    timestamp: new Date(),
    stationId: `waqi_${city.toLowerCase().replace(/\s+/g, '_')}`,
    stationMeta: {
      stationName: `WAQI ${city}`,
      city,
      ward: '',
      location: { type: 'Point', coordinates: coords },
    },
    ...pollutants,
    temperature: iaqi.t?.v,
    humidity: iaqi.h?.v,
    windSpeed: iaqi.w?.v,
    windDirection: iaqi.wd?.v,
    pressure: iaqi.p?.v,
    aqi: result.aqi,
    aqiCategory: result.category,
    primaryPollutant: result.primaryPollutant,
    healthAdvice: result.healthAdvice,
    source: 'waqi',
    confidence: computeConfidence('waqi', Object.keys(pollutants).filter((k) => pollutants[k as keyof PollutantLevels] !== undefined), new Date()),
  });
}

export async function ingestFromOpenaq(city: string): Promise<void> {
  const data = await openaqClient.getLatest(100, 0, city);
  if (!data?.results) return;

  for (const result of data.results) {
    const measurements = result.measurements || [];
    const pollutants: PollutantLevels = {};
    const coords: [number, number] = result.coordinates
      ? [result.coordinates.longitude, result.coordinates.latitude]
      : [0, 0];

    for (const m of measurements) {
      const param = m.parameter?.toLowerCase();
      const val = m.value;
      if (param === 'pm25') pollutants.pm25 = val;
      else if (param === 'pm10') pollutants.pm10 = val;
      else if (param === 'no2') pollutants.no2 = val;
      else if (param === 'so2') pollutants.so2 = val;
      else if (param === 'co') pollutants.co = val;
      else if (param === 'o3') pollutants.o3 = val;
    }

    const aqiResult = computeAQI(pollutants);

    await AqiReading.create({
      timestamp: new Date(result.date?.utc || new Date()),
      stationId: `openaq_${result.locationId || Math.random().toString(36).slice(2, 10)}`,
      stationMeta: {
        stationName: result.location || 'Unknown',
        city,
        ward: '',
        location: { type: 'Point', coordinates: coords },
      },
      ...pollutants,
      aqi: aqiResult.aqi,
      aqiCategory: aqiResult.category,
      primaryPollutant: aqiResult.primaryPollutant,
      healthAdvice: aqiResult.healthAdvice,
      source: 'openaq',
      confidence: computeConfidence('openaq', Object.keys(pollutants).filter((k) => pollutants[k as keyof PollutantLevels] !== undefined), new Date(result.date?.utc || new Date())),
    });
  }
}

export async function fetchAndStoreAqiData(city: string): Promise<void> {
  try {
    await ingestFromWaqi(city);
    await ingestFromOpenaq(city);
    logger.info({ city }, 'AQI data ingested successfully');
  } catch (error) {
    logger.error({ err: error, city }, 'Failed to ingest AQI data');
  }
}
