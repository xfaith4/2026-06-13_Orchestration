/**
 * Service Manager
 * Handles initialization and status tracking of all services
 */

const logger = require('../utils/logger');

const serviceRegistry = new Map();

/**
 * Register a service
 * @param {string} name - Service name
 * @param {Function} initFn - Async initialization function
 * @param {number} timeout - Timeout in ms
 */
function registerService(name, initFn, timeout = 5000) {
  serviceRegistry.set(name, {
    initialized: false,
    initFn,
    timeout,
    error: null,
    initTime: null
  });
}

/**
 * Initialize all registered services
 */
async function initializeServices() {
  logger.info('Initializing all services...');
  const promises = [];
  
  for (const [name, service] of serviceRegistry) {
    promises.push(
      Promise.race([
        service.initFn()
          .then(() => {
            service.initialized = true;
            service.initTime = Date.now();
            logger.info(`Service initialized: ${name}`);
          })
          .catch(error => {
            service.error = error;
            logger.error(`Service initialization failed: ${name}`, { error: error.message });
            throw error;
          }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${name} initialization timeout after ${service.timeout}ms`)), service.timeout)
        )
      ])
    );
  }
  
  try {
    await Promise.all(promises);
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization error', { error: error.message });
    throw error;
  }
}

/**
 * Get status of all services
 */
function getServiceStatus() {
  const status = {};
  for (const [name, service] of serviceRegistry) {
    status[name] = {
      initialized: service.initialized,
      error: service.error ? service.error.message : null,
      initTime: service.initTime
    };
  }
  return status;
}

module.exports = {
  registerService,
  initializeServices,
  getServiceStatus
};