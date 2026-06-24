import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export class NasaFirmsClient {
  private client: AxiosInstance;
  private baseUrl = 'https://firms.modaps.eosdis.nasa.gov/api';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  async getFireData(countryCode: string, dataset = 'VIIRS_SNPP_NRT'): Promise<any> {
    try {
      const url = `/country/country/${dataset}/${config.nasaFirmsApiKey}/${countryCode}/1`;
      const res = await this.client.get(url);
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, countryCode }, 'NASA FIRMS getFireData failed');
      return null;
    }
  }

  async getFireDataByBounds(
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
    dataset = 'VIIRS_SNPP_NRT'
  ): Promise<any> {
    try {
      const url = `/area/csv/${config.nasaFirmsApiKey}/${dataset}/${minLng},${minLat},${maxLng},${maxLat}/1`;
      const res = await this.client.get(url, { responseType: 'text' });
      const lines = (res.data as string).trim().split('\n');
      if (lines.length < 2) return [];
      const headers = lines[0].split(',');
      const results = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length !== headers.length) continue;
        const obj: any = {};
        headers.forEach((h, idx) => { obj[h.trim()] = values[idx]?.trim(); });
        results.push(obj);
      }
      return results;
    } catch (error: any) {
      logger.error({ err: error.message, bounds: { minLat, minLng, maxLat, maxLng } }, 'NASA FIRMS getFireDataByBounds failed');
      return [];
    }
  }
}

export const nasaFirmsClient = new NasaFirmsClient();
