import pino from 'pino';

// Readable output while developing; plain JSON in production and in tests
const isDev = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test';

// pino-pretty runs in-process: pino's usual transport worker can't find it when Vite runs the app.
// It is a development dependency, so it is only imported while developing.
const prettyStream = isDev
  ? (await import('pino-pretty')).default({
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname'
    })
  : undefined;

const pinoLogger = pino(
  {
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
    serializers: {
      error: pino.stdSerializers.err
    }
  },
  prettyStream ?? pino.destination(1)
);

export const logger = {
  info: (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      pinoLogger.info(objOrMsg);
    } else {
      pinoLogger.info(objOrMsg, msg);
    }
  },
  warn: (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      pinoLogger.warn(objOrMsg);
    } else {
      pinoLogger.warn(objOrMsg, msg);
    }
  },
  error: (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      pinoLogger.error(objOrMsg);
    } else {
      pinoLogger.error(objOrMsg, msg);
    }
  },
  debug: (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      pinoLogger.debug(objOrMsg);
    } else {
      pinoLogger.debug(objOrMsg, msg);
    }
  }
};



