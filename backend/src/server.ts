import express, { Express, Request, Response } from 'express';

const PORT: number = parseInt(process.env.BACKEND_PORT ?? '3000', 10);
const HOST: string = process.env.BACKEND_HOST ?? 'localhost';

const app: Express = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development)
// TODO: Phase 1 - Replace console.log with structured logging library (winston/pino)
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, _res: Response, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// CORS middleware
app.use((_req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
  });
});

// API version endpoint
app.get('/api/v1', (_req: Request, res: Response): void => {
  res.json({
    message: 'UnifiedAIToolbox API v1',
    version: '0.1.0',
    phase: 'Phase 0.1 - Bootstrap',
  });
});

// 404 handler
app.use((_req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response): void => {
  console.error(err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Start server
const server = app.listen(PORT, HOST, (): void => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log(`API endpoint: http://${HOST}:${PORT}/api/v1`);
});

// Graceful shutdown
process.on('SIGTERM', (): void => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close((): void => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', (): void => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close((): void => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
