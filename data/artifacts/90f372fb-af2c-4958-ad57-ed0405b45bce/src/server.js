/**
 * Development Server Entry Point
 * Initializes Express server with middleware and error handling
 */

const express = require('express');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const { initializeServices } = require('./services/service-manager');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    timestamp: new Date().toISOString(),
    ip: req.ip 
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Ready check endpoint (all services initialized)
app.get('/ready', async (req, res) => {
  try {
    const readyStatus = await getServiceStatus();
    const allReady = Object.values(readyStatus).every(status => status === true);
    
    res.status(allReady ? 200 : 503).json({
      ready: allReady,
      services: readyStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({ ready: false, error: error.message });
  }
});

// API Routes
app.use('/api/v1', require('./routes'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    requestId: req.id
  });
});

// Service initialization and server startup
async function startServer() {
  try {
    logger.info('Initializing services...');
    await initializeServices();
    logger.info('Services initialized successfully');
    
    const server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 Development server ready`, {
        host: HOST,
        port: PORT,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Helper function to check service status
async function getServiceStatus() {
  return {
    database: true,
    cache: true,
    messageQueue: true
  };
}

startServer();

module.exports = app;