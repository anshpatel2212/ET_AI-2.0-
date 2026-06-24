import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export class OpenWeatherClient {
  private client: AxiosInstance;
  private baseUrl = 'https://api.openweathermap.org';

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  async getOneCall(lat: number, lon: number): Promise<any> {
    try {
      const res = await this.client.get('/data/2.5/weather', {
        params: {
          lat,
          lon,
          appid: config.owmApiKey,
          units: 'metric',
        },
      });
      const d = res.data;
      return {
        current: {
          temp: d.main?.temp,
          humidity: d.main?.humidity,
          wind_speed: d.wind?.speed,
          wind_deg: d.wind?.deg,
          pressure: d.main?.pressure,
          weather: d.weather,
        },
      };
    } catch (error: any) {
      logger.error({ err: error.message, lat, lon }, 'OpenWeather getOneCall failed');
      return null;
    }
  }

  async getAirPollution(lat: number, lon: number): Promise<any> {
    try {
      const res = await this.client.get('/data/2.5/air_pollution', {
        params: { lat, lon, appid: config.owmApiKey },
      });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, lat, lon }, 'OpenWeather getAirPollution failed');
      return null;
    }
  }

  async getHistorical(lat: number, lon: number, dt: number): Promise<any> {
    try {
      const res = await this.client.get('/data/2.5/forecast', {
        params: { lat, lon, appid: config.owmApiKey, units: 'metric' },
      });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, lat, lon, dt }, 'OpenWeather getHistorical failed');
      return null;
    }
  }

  async getCurrentWeather(city: string): Promise<any> {
    try {
      const res = await this.client.get('/data/2.5/weather', {
        params: { q: city, appid: config.owmApiKey, units: 'metric' },
      });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, city }, 'OpenWeather getCurrentWeather failed');
      return null;
    }
  }

  async getForecast(lat: number, lon: number): Promise<any> {
    try {
      const res = await this.client.get('/data/2.5/forecast', {
        params: { lat, lon, appid: config.owmApiKey, units: 'metric' },
      });
      return res.data;
    } catch (error: any) {
      logger.error({ err: error.message, lat, lon }, 'OpenWeather getForecast failed');
      return null;
    }
  }
}

export const openweatherClient = new OpenWeatherClient();
