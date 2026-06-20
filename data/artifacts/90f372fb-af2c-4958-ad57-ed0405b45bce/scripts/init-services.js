#!/usr/bin/env node
/**
 * Service Initialization Script
 * Initializes all required services for development environment
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const logger = require('../src/utils/logger');

dotenv.config();

const services = {
  database: {
    name: 'Database',
    initialize: initializeDatabase,
    timeout: 5000
  },
  cache: {
    name: 'Cache Layer',
    initialize: initializeCache,
    timeout: 3000
  },
  messageQueue: {
    name: 'Message Queue',
    initialize: initializeMessageQueue,
    timeout: 4000
  }
};

async function initializeDatabase() {
  logger.info('Initializing database connection...');
  // Simulate database connection
  await new Promise(resolve => setTimeout(resolve, 1000));
  logger.info('✓ Database initialized');
}

async function initializeCache() {
  logger.info('Initializing cache layer...');
  // Simulate cache initialization
  await new Promise(resolve => setTimeout(resolve, 800));
  logger.info('✓ Cache layer initialized');
}

async function initializeMessageQueue() {
  logger.info('Initializing message queue...');
  // Simulate message queue initialization
  await new Promise(resolve => setTimeout(resolve, 1200));
  logger.info('✓ Message queue initialized');
}

async function initializeAllServices() {
  logger.info('Starting service initialization sequence...');
  const startTime = Date.now();
  const results = {};
  
  for (const [key, service] of Object.entries(services)) {
    try {
      await Promise.race([
        service.initialize(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${service.name} initialization timeout`)), service.timeout)
        )
      ]);
      results[key] = { status: 'initialized', error: null };
    } catch (error) {
      logger.error(`Failed to initialize ${service.name}`, { error: error.message });
      results[key] = { status: 'failed', error: error.message };
    }
  }
  
  const duration = Date.now() - startTime;
  const allInitialized = Object.values(results).every(r => r.status === 'initialized');
  
  logger.info('Service initialization complete', {
    allInitialized,
    duration: `${duration}ms`,
    results
  });
  
  return allInitialized ? 0 : 1;
}

initializeAllServices()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    logger.error('Service initialization failed', { error: error.message });
    process.exit(1);
  });