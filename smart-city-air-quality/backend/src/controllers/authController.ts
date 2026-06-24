import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { getRedisClient } from '../utils/redis';
import crypto from 'crypto';

function generateAccessToken(user: { userId: string; email: string; role: string }): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
}

function generateRefreshToken(user: { userId: string; email: string; role: string }): string {
  return jwt.sign(user, config.refreshTokenSecret, { expiresIn: config.refreshTokenExpiresIn as any });
}

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name, mobile, healthProfile, preferences } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      name,
      mobile,
      passwordHash,
      healthProfile,
      preferences: {
        notifications: { email: true, sms: false, push: true },
        alertThresholds: { aqi: 200 },
        preferredCities: preferences?.preferredCities || [],
        language: preferences?.language || 'en',
      },
    });

    const accessToken = generateAccessToken({ userId: user._id.toString(), email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user._id.toString(), email: user.email, role: user.role });

    await AuditLog.create({
      userId: user._id.toString(),
      action: 'USER_SIGNUP',
      resource: 'User',
      resourceId: user._id.toString(),
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.status(201).json({
      success: true,
      data: {
        user: { id: user._id, email: user.email, name: user.name, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    user.lastLogin = new Date();
    await user.save();

    const accessToken = generateAccessToken({ userId: user._id.toString(), email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user._id.toString(), email: user.email, role: user.role });

    await AuditLog.create({
      userId: user._id.toString(),
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user._id.toString(),
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.json({
      success: true,
      data: {
        user: { id: user._id, email: user.email, name: user.name, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) throw new AppError('Refresh token required', 400);

    const decoded = jwt.verify(token, config.refreshTokenSecret) as any;
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) throw new AppError('Invalid refresh token', 401);

    const accessToken = generateAccessToken({ userId: user._id.toString(), email: user.email, role: user.role });
    const newRefreshToken = generateRefreshToken({ userId: user._id.toString(), email: user.email, role: user.role });

    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.json({ success: true, message: 'If the email exists, a reset OTP has been sent.' });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redis = getRedisClient();
    await redis.set(`otp:${email}`, otp, 'EX', 600);

    logger.info({ email, otp }, 'Password reset OTP generated');

    res.json({ success: true, message: 'If the email exists, a reset OTP has been sent.' });
  } catch (error) {
    next(error);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, otp } = req.body;
    const redis = getRedisClient();
    const storedOtp = await redis.get(`otp:${email}`);

    if (!storedOtp || storedOtp !== otp) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    await redis.del(`otp:${email}`);

    const resetToken = crypto.randomBytes(32).toString('hex');
    await redis.set(`reset:${email}`, resetToken, 'EX', 300);

    res.json({ success: true, data: { resetToken } });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const redis = getRedisClient();
      const decoded = jwt.decode(token) as any;
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redis.set(`blacklist:${token}`, 'true', 'EX', ttl);
        }
      }
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
}

export async function adminCreateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name, role, mobile } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new AppError('Email already exists', 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      name,
      mobile,
      role,
      passwordHash,
    });

    await AuditLog.create({
      userId: req.user!.userId,
      action: 'ADMIN_CREATE_USER',
      resource: 'User',
      resourceId: user._id.toString(),
      ip: req.ip || '',
      userAgent: req.get('user-agent') || '',
    });

    res.status(201).json({
      success: true,
      data: { id: user._id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    next(error);
  }
}
