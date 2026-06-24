import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export class ImdClient {
  private client: AxiosInstance;
  private baseUrl = 'https://mausam.imd.gov.in/api';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'User-Agent': 'SmartCity-AQI/1.0',
        Accept: 'application/json',
      },
    });
  }

  async getCurrentWeather(stationCode: string): Promise<any> {
    try {
      const res = await this.client.get(`/current/${stationCode}`);
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, stationCode }, 'IMD getCurrentWeather failed');
      return null;
    }
  }

  async getForecast(cityCode: string): Promise<any> {
    try {
      const res = await this.client.get(`/forecast/${cityCode}`);
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, cityCode }, 'IMD getForecast failed');
      return null;
    }
  }

  async getRainfallData(date: string, region?: string): Promise<any> {
    try {
      const params: any = { date };
      if (region) params.region = region;
      const res = await this.client.get('/rainfall', { params });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, date }, 'IMD getRainfallData failed');
      return null;
    }
  }
}

export const imdClient = new ImdClient();
