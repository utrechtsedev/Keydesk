import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  serializers: {
    error: pino.stdSerializers.err
  },
  transport: isDev
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



