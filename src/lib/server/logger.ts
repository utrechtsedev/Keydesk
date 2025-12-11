import pino from 'pino';
import { dev } from '$app/environment';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || (dev ? 'debug' : 'info'),
  transport: dev
    ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname'
      }
    }
    : undefined,
});

export const logger = {
  info: (obj: object, msg: string) => pinoLogger.info(obj, msg),
  warn: (obj: object, msg: string) => pinoLogger.warn(obj, msg),
  error: (obj: object, msg: string) => pinoLogger.error(obj, msg),
  debug: (obj: object, msg: string) => pinoLogger.debug(obj, msg)
};
