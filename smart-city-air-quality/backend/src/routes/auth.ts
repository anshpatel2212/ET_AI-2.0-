import { Router } from 'express';
import { validate } from '../middleware/validate';
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  createUserSchema,
} from '../validation';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate, authorize } from '../middleware/auth';
import * as authCtrl from '../controllers/authController';

const router = Router();

router.use(authRateLimiter);

router.post('/signup', validate(signupSchema), authCtrl.signup);
router.post('/login', validate(loginSchema), authCtrl.login);
router.post('/refresh-token', validate(refreshTokenSchema), authCtrl.refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), authCtrl.forgotPassword);
router.post('/verify-otp', validate(verifyOtpSchema), authCtrl.verifyOtp);
router.post('/logout', authenticate, authCtrl.logout);
router.post('/admin/users/create', authenticate, authorize('admin'), validate(createUserSchema), authCtrl.adminCreateUser);

export default router;
