import express, { Express, Request, Response, NextFunction } from 'express';
import { config } from 'dotenv';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { AppDataSource } from './database';
import flowsRouter from './routes/flows';

// Load environment variables
config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Initialize database
AppDataSource.initialize()
  .then(() => logger.info('Database connection established'))
  .catch((err) => logger.error('Database initialization failed', { error: err.message }));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes will be mounted here
app.get('/api/v1', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to API v1' });
});

app.use('/api/flows', flowsRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, { port: PORT });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection', { reason });
  process.exit(1);
});

export default app;