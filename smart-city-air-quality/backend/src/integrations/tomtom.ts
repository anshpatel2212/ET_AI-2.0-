import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export class TomtomClient {
  private client: AxiosInstance;
  private baseUrl = 'https://api.tomtom.com/traffic';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  async getFlowSegmentData(lat: number, lon: number, zoom = 10): Promise<any> {
    try {
      const res = await this.client.get('/services/4/flowSegmentData/absolute/' + zoom + '/json', {
        params: {
          key: config.tomtomApiKey,
          point: `${lat},${lon}`,
          unit: 'KMPH',
        },
      });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, lat, lon }, 'TomTom getFlowSegmentData failed');
      return null;
    }
  }

  async getFlowTiles(tileX: number, tileY: number, zoom = 12): Promise<any> {
    try {
      const res = await this.client.get(
        `/maps/traffic/flow/tile/${zoom}/${tileX}/${tileY}.json`,
        { params: { key: config.tomtomApiKey } }
      );
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, tileX, tileY }, 'TomTom getFlowTiles failed');
      return null;
    }
  }
}

export const tomtomClient = new TomtomClient();
