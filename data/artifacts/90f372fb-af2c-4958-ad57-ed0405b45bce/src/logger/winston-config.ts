import winston from 'winston';
import path from 'path';
import fs from 'fs';

/**
 * Winston Logger Configuration
 * Provides centralized logging with console and file transports
 * Supports multiple log levels and custom formatting
 */

const logsDir = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom format for Winston logs
 * Includes timestamp, level, message, and request ID if available
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, requestId, stack, ...meta }) => {
    const baseLog = `${timestamp} [${level.toUpperCase()}]${requestId ? ` [${requestId}]` : ''}: ${message}`;
    
    if (stack) {
      return `${baseLog}\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      return `${baseLog} ${JSON.stringify(meta)}`;
    }
    
    return baseLog;
  })
);

/**
 * Console format for development (more readable)
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const baseLog = `${timestamp} ${level}${requestId ? ` [${requestId}]` : ''}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      return `${baseLog} ${JSON.stringify(meta, null, 2)}`;
    }
    
    return baseLog;
  })
);

/**
 * Initialize Winston logger with transports
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {},
  transports: [
    // Console transport - development/debugging
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    }),
    
    // Combined logs - all levels
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    }),
    
    // Error logs only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760,
      maxFiles: 10,
      tailable: true,
    }),
  ],
});

// Handle uncaught exceptions
logger.exitOnError = false;

export default logger;
