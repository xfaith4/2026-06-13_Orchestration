/**
 * BaseController - Abstract base class for all API controllers
 * Provides standardized response handling, error management, and request context
 * 
 * @abstract
 */
class BaseController {
  /**
   * Constructor with dependency injection
   * @param {object} dependencies - Injected dependencies
   * @param {object} dependencies.logger - Logger instance
   * @param {object} dependencies.validationService - Validation service
   * @throws {Error} If required dependencies are missing
   */
  constructor(dependencies = {}) {
    const requiredDeps = ['logger', 'validationService'];
    const missingDeps = requiredDeps.filter(dep => !dependencies[dep]);
    
    if (missingDeps.length > 0) {
      throw new Error(`Missing required dependencies: ${missingDeps.join(', ')}`);
    }

    this.logger = dependencies.logger;
    this.validationService = dependencies.validationService;
  }

  /**
   * Extract and validate request context from Express request object
   * @param {object} req - Express request object
   * @returns {object} Normalized request context
   */
  getRequestContext(req) {
    return {
      requestId: req.id || this._generateRequestId(),
      userId: req.user?.id || null,
      userRole: req.user?.role || 'guest',
      ip: req.ip,
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
      headers: {
        contentType: req.get('content-type'),
        authorization: req.get('authorization') ? 'present' : 'absent'
      }
    };
  }

  /**
   * Send standardized success response
   * @param {object} res - Express response object
   * @param {*} data - Response payload
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code (default: 200)
   * @returns {object} JSON response
   */
  sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      status: statusCode,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    this.logger.info(`Success response [${statusCode}]: ${message}`);
    return res.status(statusCode).json(response);
  }

  /**
   * Send standardized error response
   * @param {object} res - Express response object
   * @param {Error|string} error - Error object or message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} errorCode - Machine-readable error code
   * @param {object} details - Additional error details
   * @returns {object} JSON response
   */
  sendError(res, error, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR', details = null) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const response = {
      success: false,
      status: statusCode,
      message: errorMessage,
      errorCode,
      details: details || null,
      timestamp: new Date().toISOString()
    };

    // Log full error with stack trace for debugging
    if (error instanceof Error) {
      this.logger.error(`Error [${errorCode}] [${statusCode}]:`, error);
    } else {
      this.logger.warn(`Error [${errorCode}] [${statusCode}]: ${errorMessage}`);
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Validate request payload against schema
   * @param {object} data - Data to validate
   * @param {object} schema - Validation schema (Joi/Yup compatible)
   * @returns {object} {valid: boolean, errors: array, data: object}
   */
  async validateRequest(data, schema) {
    try {
      const result = await this.validationService.validate(data, schema);
      return result;
    } catch (error) {
      this.logger.error('Validation error:', error);
      return {
        valid: false,
        errors: [error.message],
        data: null
      };
    }
  }

  /**
   * Handle async controller method with automatic error catching
   * @param {function} handler - Async handler function
   * @returns {function} Express middleware function
   */
  asyncHandler(handler) {
    return (req, res, next) => {
      Promise.resolve(handler(req, res, next)).catch(error => {
        const context = this.getRequestContext(req);
        this.logger.error('Unhandled async error in controller:', {
          context,
          error: error.message,
          stack: error.stack
        });
        this.sendError(res, error, 500, 'INTERNAL_SERVER_ERROR');
      });
    };
  }

  /**
   * Generate unique request ID if not present
   * @private
   * @returns {string} Unique request ID
   */
  _generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = BaseController;