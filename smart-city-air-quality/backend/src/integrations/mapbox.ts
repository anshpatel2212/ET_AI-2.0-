import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export class MapboxClient {
  private client: AxiosInstance;
  private baseUrl = 'https://api.mapbox.com';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  async geocode(query: string): Promise<any> {
    try {
      const res = await this.client.get('/geocoding/v5/mapbox.places/' + encodeURIComponent(query) + '.json', {
        params: { access_token: config.mapboxToken, limit: 5 },
      });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, query }, 'Mapbox geocode failed');
      return null;
    }
  }

  async reverseGeocode(lng: number, lat: number): Promise<any> {
    try {
      const res = await this.client.get(`/geocoding/v5/mapbox.places/${lng},${lat}.json`, {
        params: { access_token: config.mapboxToken },
      });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, lat, lng }, 'Mapbox reverseGeocode failed');
      return null;
    }
  }

  async getIsochrone(lng: number, lat: number, minutes: number[]): Promise<any> {
    try {
      const res = await this.client.get(`/isochrone/v1/mapbox/driving/${lng},${lat}`, {
        params: {
          contours_minutes: minutes.join(','),
          polygons: true,
          access_token: config.mapboxToken,
        },
      });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, lat, lng }, 'Mapbox isochrone failed');
      return null;
    }
  }
}

export const mapboxClient = new MapboxClient();
