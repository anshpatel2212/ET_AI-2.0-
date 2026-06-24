import { EnrichedReading } from './aqiService';
import { Prediction } from '../models/Prediction';

export interface HealthAdvisory {
  city: string;
  overallAqi: number;
  category: string;
  populationGroups: {
    group: string;
    risk: 'low' | 'moderate' | 'high' | 'very high';
    advice: string;
  }[];
  generalAdvice: string[];
  recommendedActions: string[];
  forecastSummary?: string;
}

export function generateHealthAdvisory(
  readings: EnrichedReading[],
  includeForecast: boolean
): HealthAdvisory {
  if (readings.length === 0) {
    return {
      city: 'Unknown',
      overallAqi: 0,
      category: 'No Data',
      populationGroups: [],
      generalAdvice: ['No air quality data available for this city.'],
      recommendedActions: [],
    };
  }

  const avgAqi = Math.round(readings.reduce((sum, r) => sum + r.aqi, 0) / readings.length);
  const category = readings[0]?.aqiCategory || 'Unknown';
  const city = readings[0]?.city || 'Unknown';

  const populationGroups = getPopulationGroupAdvice(avgAqi);
  const generalAdvice = getGeneralAdvice(avgAqi);
  const recommendedActions = getRecommendedActions(avgAqi);

  let forecastSummary: string | undefined;

  return {
    city,
    overallAqi: avgAqi,
    category,
    populationGroups,
    generalAdvice,
    recommendedActions,
    forecastSummary,
  };
}

function getPopulationGroupAdvice(aqi: number) {
  const groups = [];
  if (aqi <= 50) {
    groups.push({ group: 'General Population', risk: 'low' as const, advice: 'Air quality is satisfactory. No health risks.' });
    groups.push({ group: 'Sensitive Individuals', risk: 'low' as const, advice: 'No precautions needed.' });
  } else if (aqi <= 100) {
    groups.push({ group: 'General Population', risk: 'low' as const, advice: 'May experience minor discomfort.' });
    groups.push({ group: 'Sensitive Individuals', risk: 'moderate' as const, advice: 'Limit prolonged outdoor exertion.' });
  } else if (aqi <= 200) {
    groups.push({ group: 'General Population', risk: 'moderate' as const, advice: 'May experience breathing discomfort.' });
    groups.push({ group: 'People with Lung Disease', risk: 'high' as const, advice: 'Avoid prolonged outdoor activities.' });
    groups.push({ group: 'Children & Elderly', risk: 'high' as const, advice: 'Stay indoors as much as possible.' });
  } else if (aqi <= 300) {
    groups.push({ group: 'General Population', risk: 'high' as const, advice: 'Avoid prolonged exposure. Wear masks outdoors.' });
    groups.push({ group: 'People with Heart/Lung Disease', risk: 'very high' as const, advice: 'Avoid all outdoor physical activity.' });
    groups.push({ group: 'Children & Elderly', risk: 'very high' as const, advice: 'Remain indoors. Keep windows closed.' });
  } else {
    groups.push({ group: 'General Population', risk: 'very high' as const, advice: 'Health emergency. Avoid all outdoor activities.' });
    groups.push({ group: 'People with Health Conditions', risk: 'very high' as const, advice: 'Seek medical attention if symptoms appear.' });
    groups.push({ group: 'Children & Elderly', risk: 'very high' as const, advice: 'Stay indoors with air purifiers.' });
  }
  return groups;
}

function getGeneralAdvice(aqi: number): string[] {
  if (aqi <= 50) return ['Air quality is good.', 'Enjoy outdoor activities.'];
  if (aqi <= 100) return ['Air quality is acceptable.', 'Sensitive individuals should limit prolonged outdoor exertion.'];
  if (aqi <= 200) return ['Air quality is moderate.', 'Reduce prolonged outdoor exertion.', 'Keep windows closed during peak hours.'];
  if (aqi <= 300) return ['Air quality is poor.', 'Wear N95 masks outdoors.', 'Use air purifiers indoors.', 'Avoid outdoor exercise.'];
  return ['Air quality is severe!', 'Stay indoors with windows sealed.', 'Run air purifiers at maximum.', 'Wear N95 masks if outdoors.', 'Emergency services may be activated.'];
}

function getRecommendedActions(aqi: number): string[] {
  const actions: string[] = [];
  if (aqi > 100) actions.push('Use public transportation to reduce emissions');
  if (aqi > 150) actions.push('Report air pollution sources to city authorities');
  if (aqi > 200) actions.push('Avoid burning trash or biomass');
  if (aqi > 100) actions.push('Plant indoor air-purifying plants');
  if (aqi > 50) actions.push('Check real-time AQI updates regularly');
  return actions;
}
