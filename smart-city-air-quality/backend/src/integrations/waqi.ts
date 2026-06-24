import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export class WaqiClient {
  private client: AxiosInstance;
  private baseUrl = 'https://api.waqi.info';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  async getFeedByCity(city: string): Promise<any> {
    try {
      const res = await this.client.get(`/feed/${encodeURIComponent(city)}/`, {
        params: { token: config.waqiApiKey },
      });
      if (res.data.status !== 'ok') {
        logger.warn({ city, apiResponse: res.data }, 'WAQI API returned non-ok status');
        return null;
      }
      return res.data.data;
    } catch (error: any) {
      logger.error({ err: error.message, city }, 'WAQI getFeedByCity failed');
      return null;
    }
  }

  async getFeedByGeo(lat: number, lng: number): Promise<any> {
    try {
      const res = await this.client.get(`/feed/geo:${lat};${lng}/`, {
        params: { token: config.waqiApiKey },
      });
      if (res.data.status !== 'ok') return null;
      return res.data.data;
    } catch (error: any) {
      logger.error({ err: error.message, lat, lng }, 'WAQI getFeedByGeo failed');
      return null;
    }
  }

  async getMapBounds(latlng: [number, number, number, number]): Promise<any[]> {
    try {
      const res = await this.client.get('/map/bounds/', {
        params: {
          token: config.waqiApiKey,
          latlng: latlng.join(','),
        },
      });
      if (res.data.status !== 'ok') return [];
      return res.data.data || [];
    } catch (error: any) {
      logger.error({ err: error.message, latlng }, 'WAQI getMapBounds failed');
      return [];
    }
  }
}

export const waqiClient = new WaqiClient();
