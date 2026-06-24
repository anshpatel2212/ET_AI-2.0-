import { Router } from 'express';
import { validate } from '../middleware/validate';
import { reportCreateSchema, subscriptionSchema } from '../validation';
import { citizenRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import * as citizenCtrl from '../controllers/citizenController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const router = Router();

router.use(citizenRateLimiter);
router.use(authenticate);

router.post('/reports', upload.array('photos', 5), validate(reportCreateSchema), citizenCtrl.submitReport);
router.get('/reports/me', citizenCtrl.getMyReports);
router.get('/aqi-near-me', citizenCtrl.getAqiNearMe);
router.post('/subscriptions', validate(subscriptionSchema), citizenCtrl.createSubscription);
router.get('/subscriptions/me', citizenCtrl.getMySubscriptions);
router.get('/leaderboard', citizenCtrl.getLeaderboard);
router.get('/notifications/me', citizenCtrl.getMyNotifications);

export default router;
