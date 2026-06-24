import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export class CpcbClient {
  private client: AxiosInstance;
  private waqiBaseUrl = 'https://api.waqi.info';

  constructor() {
    this.client = axios.create({
      baseURL: this.waqiBaseUrl,
      timeout: 15000,
    });
  }

  async getStationData(stationId: string): Promise<any> {
    try {
      logger.info({ stationId }, 'CPCB getStationData via WAQI CPCB search fallback');
      const searchRes = await this.client.get('/search/', {
        params: { token: config.waqiApiKey, keyword: `CPCB ${stationId}` },
      });
      if (searchRes.data.status !== 'ok' || !searchRes.data.data?.length) return null;
      const station = searchRes.data.data[0];
      const feedRes = await this.client.get(`/feed/@${station.uid}/`, {
        params: { token: config.waqiApiKey },
      });
      if (feedRes.data.status !== 'ok') return null;
      return feedRes.data.data;
    } catch (error: any) {
      logger.error({ err: error.message, stationId }, 'CPCB getStationData failed');
      return null;
    }
  }

  async getAllStations(city?: string): Promise<any> {
    try {
      logger.info({ city }, 'CPCB getAllStations via WAQI CPCB search fallback');
      const searchRes = await this.client.get('/search/', {
        params: { token: config.waqiApiKey, keyword: city ? `CPCB ${city}` : 'CPCB' },
      });
      if (searchRes.data.status !== 'ok') return [];
      let stations = searchRes.data.data || [];
      if (city) {
        stations = stations.filter((s: any) =>
          s.station?.name?.toLowerCase().includes(city.toLowerCase())
        );
      }
      return stations;
    } catch (error: any) {
      logger.error({ err: error.message, city }, 'CPCB getAllStations failed');
      return [];
    }
  }

  async getHourlyData(date?: string): Promise<any> {
    try {
      logger.info({ date }, 'CPCB getHourlyData via WAQI CPCB search fallback');
      const searchRes = await this.client.get('/search/', {
        params: { token: config.waqiApiKey, keyword: 'CPCB' },
      });
      if (searchRes.data.status !== 'ok' || !searchRes.data.data?.length) return null;
      const results = [];
      for (const station of searchRes.data.data.slice(0, 5)) {
        const feedRes = await this.client.get(`/feed/@${station.uid}/`, {
          params: { token: config.waqiApiKey },
        });
        if (feedRes.data.status === 'ok') results.push(feedRes.data.data);
      }
      return results;
    } catch (error: any) {
      logger.error({ err: error.message, date }, 'CPCB getHourlyData failed');
      return null;
    }
  }
}

export const cpcbClient = new CpcbClient();
