import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const logDir = process.env.LOG_DIR || 'logs';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'kreativ-icon-backend' },
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        simple()
      ),
    }),
  ],
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));
  logger.add(new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    maxsize: 5242880,
    maxFiles: 5,
  }));
}
