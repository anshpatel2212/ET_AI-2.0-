import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export class GoogleAirQualityClient {
  private client: AxiosInstance;
  private baseUrl = 'https://airquality.googleapis.com/v1';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  async getCurrentConditions(lat: number, lon: number): Promise<any> {
    if (!config.googleAqiApiKey) {
      logger.warn('Google AQI API key not configured');
      return null;
    }
    try {
      const res = await this.client.post(`/currentConditions:lookup?key=${config.googleAqiApiKey}`, {
        location: { latitude: lat, longitude: lon },
        universalAqi: true,
        extraComputations: [
          'POLLUTANT_CONCENTRATION',
          'HEALTH_RECOMMENDATIONS',
          'DOMINANT_POLLUTANT_CONCENTRATION',
        ],
      });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, lat, lon }, 'Google Air Quality getCurrentConditions failed');
      return null;
    }
  }

  async getHourlyForecast(lat: number, lon: number, hours = 24): Promise<any> {
    if (!config.googleAqiApiKey) {
      logger.warn('Google AQI API key not configured');
      return null;
    }
    try {
      const startTime = new Date().toISOString();
      const endTime = new Date(Date.now() + hours * 3600000).toISOString();
      const res = await this.client.post(`/forecast:lookup?key=${config.googleAqiApiKey}`, {
        location: { latitude: lat, longitude: lon },
        universalAqi: true,
        period: { startTime, endTime },
      });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, lat, lon, hours }, 'Google Air Quality getHourlyForecast failed');
      return null;
    }
  }

  async getDailyForecast(lat: number, lon: number, days = 7): Promise<any> {
    if (!config.googleAqiApiKey) {
      logger.warn('Google AQI API key not configured');
      return null;
    }
    try {
      const startTime = new Date().toISOString();
      const endTime = new Date(Date.now() + days * 86400000).toISOString();
      const res = await this.client.post(`/forecast:lookup?key=${config.googleAqiApiKey}`, {
        location: { latitude: lat, longitude: lon },
        universalAqi: true,
        period: { startTime, endTime },
      });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, lat, lon, days }, 'Google Air Quality getDailyForecast failed');
      return null;
    }
  }
}

export const googleAirQualityClient = new GoogleAirQualityClient();
