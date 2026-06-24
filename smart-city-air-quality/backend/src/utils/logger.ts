import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  serializers: {
    req: (req: any) => ({
      method: req.method,
      url: req.url,
      headers: req.headers,
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
});
