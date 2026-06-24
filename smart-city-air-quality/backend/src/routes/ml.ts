import { Router } from 'express';
import { validate } from '../middleware/validate';
import { predictQuerySchema } from '../validation';
import { mlRateLimiter } from '../middleware/rateLimiter';
import { authenticate, authorize } from '../middleware/auth';
import multer from 'multer';
import * as mlCtrl from '../controllers/mlController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const router = Router();

router.use(mlRateLimiter);
router.use(authenticate, authorize('operator', 'admin'));

router.post('/predict', validate(predictQuerySchema), mlCtrl.predict);
router.post('/detect-image', upload.single('image'), mlCtrl.detectImage);
router.get('/model-status', mlCtrl.getModelStatus);
router.get('/feature-importance', mlCtrl.getFeatureImportance);
router.post('/source-attribution', mlCtrl.sourceAttribution);

export default router;
