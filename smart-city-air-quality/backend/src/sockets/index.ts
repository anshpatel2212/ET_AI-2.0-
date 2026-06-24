import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getRedisClient } from '../utils/redis';

let io: Server | null = null;

export function setupSocketIO(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token as string, config.jwtSecret) as any;
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    logger.info({ userId: user?.userId, socketId: socket.id }, 'Socket connected');

    socket.on('subscribe:city', (city: string) => {
      const room = `city:${city.toLowerCase()}`;
      socket.join(room);
      logger.info({ userId: user?.userId, room }, 'Subscribed to city room');
      socket.emit('subscribed', { room });
    });

    socket.on('subscribe:zone', (zoneId: string) => {
      const room = `zone:${zoneId}`;
      socket.join(room);
      logger.info({ userId: user?.userId, room }, 'Subscribed to zone room');
      socket.emit('subscribed', { room });
    });

    socket.on('subscribe:station', (stationId: string) => {
      const room = `station:${stationId}`;
      socket.join(room);
      logger.info({ userId: user?.userId, room }, 'Subscribed to station room');
      socket.emit('subscribed', { room });
    });

    socket.on('unsubscribe:city', (city: string) => {
      socket.leave(`city:${city.toLowerCase()}`);
    });

    socket.on('unsubscribe:zone', (zoneId: string) => {
      socket.leave(`zone:${zoneId}`);
    });

    socket.on('unsubscribe:station', (stationId: string) => {
      socket.leave(`station:${stationId}`);
    });

    socket.on('disconnect', () => {
      logger.info({ userId: user?.userId, socketId: socket.id }, 'Socket disconnected');
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function emitAqiUpdate(data: any): void {
  if (!io) return;
  const city = data?.stationMeta?.city;
  const stationId = data?.stationId;

  if (city) io.to(`city:${city.toLowerCase()}`).emit('aqi:update', data);
  if (stationId) io.to(`station:${stationId}`).emit('aqi:update', data);
  io.emit('aqi:update', data);
}

export function emitAlert(alert: any): void {
  if (!io) return;
  const city = alert?.city;
  if (city) io.to(`city:${city.toLowerCase()}`).emit('alert:new', alert);
  io.emit('alert:new', alert);
}
