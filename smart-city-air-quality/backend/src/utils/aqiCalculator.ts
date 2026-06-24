export interface PollutantLevels {
  pm25?: number;
  pm10?: number;
  no2?: number;
  so2?: number;
  co?: number;
  o3?: number;
  nh3?: number;
  nox?: number;
}

export interface AQIResult {
  aqi: number;
  category: string;
  color: string;
  primaryPollutant: string;
  healthAdvice: string;
  individualAQI: Record<string, { aqi: number; category: string }>;
}

interface Breakpoint {
  low: number;
  high: number;
  aqiLow: number;
  aqiHigh: number;
}

const BREAKPOINTS: Record<string, Breakpoint[]> = {
  pm25: [
    { low: 0, high: 30, aqiLow: 0, aqiHigh: 50 },
    { low: 31, high: 60, aqiLow: 51, aqiHigh: 100 },
    { low: 61, high: 90, aqiLow: 101, aqiHigh: 200 },
    { low: 91, high: 120, aqiLow: 201, aqiHigh: 300 },
    { low: 121, high: 250, aqiLow: 301, aqiHigh: 400 },
    { low: 251, high: 500, aqiLow: 401, aqiHigh: 500 },
  ],
  pm10: [
    { low: 0, high: 50, aqiLow: 0, aqiHigh: 50 },
    { low: 51, high: 100, aqiLow: 51, aqiHigh: 100 },
    { low: 101, high: 250, aqiLow: 101, aqiHigh: 200 },
    { low: 251, high: 350, aqiLow: 201, aqiHigh: 300 },
    { low: 351, high: 430, aqiLow: 301, aqiHigh: 400 },
    { low: 431, high: 600, aqiLow: 401, aqiHigh: 500 },
  ],
  no2: [
    { low: 0, high: 40, aqiLow: 0, aqiHigh: 50 },
    { low: 41, high: 80, aqiLow: 51, aqiHigh: 100 },
    { low: 81, high: 180, aqiLow: 101, aqiHigh: 200 },
    { low: 181, high: 280, aqiLow: 201, aqiHigh: 300 },
    { low: 281, high: 400, aqiLow: 301, aqiHigh: 400 },
    { low: 401, high: 800, aqiLow: 401, aqiHigh: 500 },
  ],
  so2: [
    { low: 0, high: 40, aqiLow: 0, aqiHigh: 50 },
    { low: 41, high: 80, aqiLow: 51, aqiHigh: 100 },
    { low: 81, high: 380, aqiLow: 101, aqiHigh: 200 },
    { low: 381, high: 800, aqiLow: 201, aqiHigh: 300 },
    { low: 801, high: 1600, aqiLow: 301, aqiHigh: 400 },
    { low: 1601, high: 2000, aqiLow: 401, aqiHigh: 500 },
  ],
  co: [
    { low: 0, high: 1.0, aqiLow: 0, aqiHigh: 50 },
    { low: 1.1, high: 2.0, aqiLow: 51, aqiHigh: 100 },
    { low: 2.1, high: 10.0, aqiLow: 101, aqiHigh: 200 },
    { low: 10.1, high: 17.0, aqiLow: 201, aqiHigh: 300 },
    { low: 17.1, high: 34.0, aqiLow: 301, aqiHigh: 400 },
    { low: 34.1, high: 50.0, aqiLow: 401, aqiHigh: 500 },
  ],
  o3: [
    { low: 0, high: 50, aqiLow: 0, aqiHigh: 50 },
    { low: 51, high: 100, aqiLow: 51, aqiHigh: 100 },
    { low: 101, high: 168, aqiLow: 101, aqiHigh: 200 },
    { low: 169, high: 208, aqiLow: 201, aqiHigh: 300 },
    { low: 209, high: 748, aqiLow: 301, aqiHigh: 400 },
    { low: 749, high: 1000, aqiLow: 401, aqiHigh: 500 },
  ],
  nh3: [
    { low: 0, high: 200, aqiLow: 0, aqiHigh: 50 },
    { low: 201, high: 400, aqiLow: 51, aqiHigh: 100 },
    { low: 401, high: 800, aqiLow: 101, aqiHigh: 200 },
    { low: 801, high: 1200, aqiLow: 201, aqiHigh: 300 },
    { low: 1201, high: 1800, aqiLow: 301, aqiHigh: 400 },
    { low: 1801, high: 2500, aqiLow: 401, aqiHigh: 500 },
  ],
};

const CATEGORIES = [
  { min: 0, max: 50, category: 'Good', color: '#00E400', advice: 'Air quality is satisfactory, little or no health risk.' },
  { min: 51, max: 100, category: 'Satisfactory', color: '#FFFF00', advice: 'May cause minor breathing discomfort to sensitive people.' },
  { min: 101, max: 200, category: 'Moderate', color: '#FF7E00', advice: 'May cause breathing discomfort to people with lung disease, heart disease, and children.' },
  { min: 201, max: 300, category: 'Poor', color: '#FF0000', advice: 'May cause breathing discomfort to people on prolonged exposure, and discomfort to people with heart disease.' },
  { min: 301, max: 400, category: 'Very Poor', color: '#99004C', advice: 'May cause respiratory illness to people on prolonged exposure. Health warning of serious conditions.' },
  { min: 401, max: 500, category: 'Severe', color: '#7E0023', advice: 'May cause respiratory impact even on healthy people, serious health impacts on people with lung/heart diseases.' },
];

function computeSubIndex(concentration: number, breakpoints: Breakpoint[]): number {
  for (const bp of breakpoints) {
    if (concentration >= bp.low && concentration <= bp.high) {
      return Math.round(
        ((bp.aqiHigh - bp.aqiLow) / (bp.high - bp.low)) * (concentration - bp.low) + bp.aqiLow
      );
    }
  }
  if (concentration < breakpoints[0].low) return breakpoints[0].aqiLow;
  const last = breakpoints[breakpoints.length - 1];
  if (concentration > last.high) return last.aqiHigh;
  return 0;
}

function getCategoryInfo(aqi: number): { category: string; color: string; healthAdvice: string } {
  for (const cat of CATEGORIES) {
    if (aqi >= cat.min && aqi <= cat.max) {
      return { category: cat.category, color: cat.color, healthAdvice: cat.advice };
    }
  }
  return { category: 'Severe', color: '#7E0023', healthAdvice: 'Severe health risk.' };
}

export function computeAQI(pollutants: PollutantLevels): AQIResult {
  const individualAQI: Record<string, { aqi: number; category: string }> = {};
  let maxAQI = 0;
  let primaryPollutant = 'pm25';

  for (const [pollutant, concentration] of Object.entries(pollutants)) {
    if (concentration === undefined || concentration === null) continue;
    const breaks = BREAKPOINTS[pollutant];
    if (!breaks) continue;

    const aqiValue = computeSubIndex(concentration, breaks);
    const cat = getCategoryInfo(aqiValue);
    individualAQI[pollutant] = { aqi: aqiValue, category: cat.category };

    if (aqiValue > maxAQI) {
      maxAQI = aqiValue;
      primaryPollutant = pollutant;
    }
  }

  const overallCat = getCategoryInfo(maxAQI);

  return {
    aqi: maxAQI,
    category: overallCat.category,
    color: overallCat.color,
    primaryPollutant,
    healthAdvice: overallCat.healthAdvice,
    individualAQI,
  };
}
