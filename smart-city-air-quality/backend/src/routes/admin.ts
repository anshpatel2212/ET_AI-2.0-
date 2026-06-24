import { Router } from 'express';
import { validate } from '../middleware/validate';
import {
  stationCreateSchema,
  stationQuerySchema,
  calibrateSchema,
  updateUserSchema,
  apiKeyCreateSchema,
} from '../validation';
import { authenticate, authorize } from '../middleware/auth';
import * as adminCtrl from '../controllers/adminController';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard/overview', adminCtrl.getDashboardOverview);

router.get('/stations', validate(stationQuerySchema, 'query'), adminCtrl.getStations);
router.post('/stations', validate(stationCreateSchema), adminCtrl.createStation);
router.put('/stations/:id', adminCtrl.updateStation);
router.delete('/stations/:id', adminCtrl.deleteStation);
router.put('/stations/:id/calibrate', validate(calibrateSchema), adminCtrl.calibrateStation);

router.get('/users', adminCtrl.getUsers);
router.put('/users/:id', validate(updateUserSchema), adminCtrl.updateUser);
router.delete('/users/:id', adminCtrl.deleteUser);

router.post('/api-keys', validate(apiKeyCreateSchema), adminCtrl.createApiKey);
router.get('/api-keys', adminCtrl.getApiKeys);

router.post('/model/retrain', adminCtrl.triggerModelRetrain);
router.get('/audit-log', adminCtrl.getAuditLog);
router.get('/data-quality/report', adminCtrl.getDataQualityReport);

export default router;
