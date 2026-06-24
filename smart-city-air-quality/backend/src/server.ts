import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase, closeDatabaseConnection } from './utils/db';
import { getRedisClient, closeRedisConnection } from './utils/redis';
import { setupSocketIO } from './sockets/index';
import { setupWorkers, scheduleRecurringJobs } from './jobs/index';
import { globalRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import publicRoutes from './routes/public';
import authRoutes from './routes/auth';
import citizenRoutes from './routes/citizen';
import operatorRoutes from './routes/operator';
import adminRoutes from './routes/admin';
import mlRoutes from './routes/ml';

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => (req.url || '').includes('/health'),
  },
}));

app.use(globalRateLimiter);

app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime() });
});

app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/citizen', citizenRoutes);
app.use('/api/v1/operator', operatorRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/ml', mlRoutes);

app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await connectDatabase();

    // Redis is optional — don't crash if unavailable
    try {
      getRedisClient();
    } catch (err) {
      logger.warn('Redis not available — running without caching/queues');
    }

    const io = setupSocketIO(server);
    logger.info('Socket.IO attached to HTTP server');

    // Workers depend on Redis — skip if unavailable
    try {
      await setupWorkers();
      await scheduleRecurringJobs();
    } catch (err) {
      logger.warn('Job workers not started — Redis may be unavailable');
    }

    server.listen(config.port, () => {
      logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down gracefully...');

  server.close(async () => {
    await closeDatabaseConnection();
    await closeRedisConnection();
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (error: NodeJS.ErrnoException) => {
  logger.error({ err: error }, 'Uncaught Exception');
  // Don't crash on Redis connection errors or EADDRINUSE
  if (error.code === 'ECONNREFUSED' || error.code === 'EADDRINUSE') {
    logger.warn('Non-fatal uncaught exception — continuing');
    return;
  }
  process.exit(1);
});

start();

export { app, server };
