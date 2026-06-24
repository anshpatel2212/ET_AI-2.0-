import { Router } from 'express';
import { validate } from '../middleware/validate';
import { aqiQuerySchema, stationQuerySchema, healthAdvisoryQuerySchema } from '../validation';
import { publicRateLimiter } from '../middleware/rateLimiter';
import { optionalAuth } from '../middleware/auth';
import * as publicCtrl from '../controllers/publicController';

const router = Router();

router.use(publicRateLimiter);

router.get('/aqi/current', validate(aqiQuerySchema, 'query'), publicCtrl.getCurrentAqi);
router.get('/cities', publicCtrl.getCities);
router.get('/stations', validate(stationQuerySchema, 'query'), publicCtrl.getStations);
router.get('/stations/:id/latest', publicCtrl.getStationLatest);
router.get('/stations/:id/history', validate(aqiQuerySchema, 'query'), publicCtrl.getStationHistory);
router.get('/alerts/active', publicCtrl.getActiveAlerts);
router.get('/forecast', publicCtrl.getForecast);
router.get('/health-advisory', validate(healthAdvisoryQuerySchema, 'query'), publicCtrl.getHealthAdvisory);

export default router;
