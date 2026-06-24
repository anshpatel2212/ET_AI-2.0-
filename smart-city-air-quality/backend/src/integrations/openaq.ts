import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export class OpenaqClient {
  private client: AxiosInstance;
  private baseUrl = 'https://api.openaq.org/v3';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: config.openaqApiKey ? { 'X-API-Key': config.openaqApiKey } : {},
    });
  }

  async getLatest(limit = 100, offset = 0, city?: string): Promise<any> {
    try {
      const params: any = { limit, offset };
      if (city) params.city = city;
      const res = await this.client.get('/latest', { params });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message }, 'OpenAQ getLatest failed');
      return null;
    }
  }

  async getLocations(limit = 100, offset = 0, city?: string): Promise<any> {
    try {
      const params: any = { limit, offset };
      if (city) params.city = city;
      const res = await this.client.get('/locations', { params });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message }, 'OpenAQ getLocations failed');
      return null;
    }
  }

  async getMeasurements(locationId: number, limit = 100, offset = 0): Promise<any> {
    try {
      const res = await this.client.get(`/locations/${locationId}/measurements`, {
        params: { limit, offset },
      });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, locationId }, 'OpenAQ getMeasurements failed');
      return null;
    }
  }
}

export const openaqClient = new OpenaqClient();
