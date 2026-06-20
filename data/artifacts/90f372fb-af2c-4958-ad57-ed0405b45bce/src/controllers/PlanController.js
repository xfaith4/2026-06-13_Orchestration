/**
 * PlanController - Handles all plan-related API endpoints
 * Extends BaseController for standardized response and error handling
 */
const BaseController = require('./BaseController');

class PlanController extends BaseController {
  /**
   * Constructor with dependency injection for repositories
   * @param {object} dependencies - Injected dependencies
   * @param {object} dependencies.planRepository - Plan data repository
   * @param {object} dependencies.logger - Logger instance
   * @param {object} dependencies.validationService - Validation service
   */
  constructor(dependencies = {}) {
    super(dependencies);
    
    if (!dependencies.planRepository) {
      throw new Error('planRepository is required');
    }

    this.planRepository = dependencies.planRepository;
  }

  /**
   * Create a new plan
   * POST /api/plans
   * 
   * @param {object} req - Express request
   * @param {object} req.body - Request payload
   * @param {object} res - Express response
   */
  createPlan = this.asyncHandler(async (req, res) => {
    const context = this.getRequestContext(req);
    this.logger.info('Creating plan', { context });

    // Validate request payload
    const validation = await this.validateRequest(req.body, {
      name: { type: 'string', required: true, minLength: 1, maxLength: 255 },
      description: { type: 'string', required: false, maxLength: 2000 },
      startDate: { type: 'date', required: true },
      endDate: { type: 'date', required: true }
    });

    if (!validation.valid) {
      return this.sendError(
        res,
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        { fields: validation.errors }
      );
    }

    // Create plan using repository
    const plan = await this.planRepository.create({
      ...validation.data,
      userId: context.userId,
      createdAt: new Date()
    });

    this.logger.info('Plan created successfully', { planId: plan.id, userId: context.userId });
    return this.sendSuccess(res, plan, 'Plan created successfully', 201);
  });

  /**
   * Retrieve all plans for authenticated user
   * GET /api/plans
   * 
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  getPlans = this.asyncHandler(async (req, res) => {
    const context = this.getRequestContext(req);
    this.logger.info('Fetching plans', { context });

    const { skip = 0, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Validate pagination parameters
    const skipNum = Math.max(0, parseInt(skip, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const plans = await this.planRepository.findByUserId(
      context.userId,
      {
        skip: skipNum,
        limit: limitNum,
        sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
      }
    );

    const total = await this.planRepository.countByUserId(context.userId);

    return this.sendSuccess(
      res,
      {
        plans,
        pagination: {
          skip: skipNum,
          limit: limitNum,
          total,
          hasMore: skipNum + limitNum < total
        }
      },
      'Plans retrieved successfully'
    );
  });

  /**
   * Retrieve a specific plan by ID
   * GET /api/plans/:id
   * 
   * @param {object} req - Express request
   * @param {string} req.params.id - Plan ID
   * @param {object} res - Express response
   */
  getPlanById = this.asyncHandler(async (req, res) => {
    const context = this.getRequestContext(req);
    const { id } = req.params;

    this.logger.info('Fetching plan by ID', { planId: id, context });

    const plan = await this.planRepository.findById(id);

    if (!plan) {
      return this.sendError(
        res,
        'Plan not found',
        404,
        'PLAN_NOT_FOUND',
        { planId: id }
      );
    }

    // Verify user ownership
    if (plan.userId !== context.userId) {
      this.logger.warn('Unauthorized plan access attempt', { planId: id, userId: context.userId });
      return this.sendError(
        res,
        'Forbidden',
        403,
        'FORBIDDEN_ACCESS',
        { planId: id }
      );
    }

    return this.sendSuccess(res, plan, 'Plan retrieved successfully');
  });

  /**
   * Update a specific plan
   * PUT /api/plans/:id
   * 
   * @param {object} req - Express request
   * @param {string} req.params.id - Plan ID
   * @param {object} req.body - Update payload
   * @param {object} res - Express response
   */
  updatePlan = this.asyncHandler(async (req, res) => {
    const context = this.getRequestContext(req);
    const { id } = req.params;

    this.logger.info('Updating plan', { planId: id, context });

    // Validate update payload (all fields optional)
    const validation = await this.validateRequest(req.body, {
      name: { type: 'string', required: false, minLength: 1, maxLength: 255 },
      description: { type: 'string', required: false, maxLength: 2000 },
      startDate: { type: 'date', required: false },
      endDate: { type: 'date', required: false }
    });

    if (!validation.valid) {
      return this.sendError(
        res,
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        { fields: validation.errors }
      );
    }

    // Retrieve existing plan
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      return this.sendError(res, 'Plan not found', 404, 'PLAN_NOT_FOUND', { planId: id });
    }

    // Verify ownership
    if (plan.userId !== context.userId) {
      return this.sendError(res, 'Forbidden', 403, 'FORBIDDEN_ACCESS', { planId: id });
    }

    // Update plan
    const updated = await this.planRepository.update(id, {
      ...validation.data,
      updatedAt: new Date()
    });

    this.logger.info('Plan updated successfully', { planId: id, userId: context.userId });
    return this.sendSuccess(res, updated, 'Plan updated successfully');
  });

  /**
   * Delete a specific plan
   * DELETE /api/plans/:id
   * 
   * @param {object} req - Express request
   * @param {string} req.params.id - Plan ID
   * @param {object} res - Express response
   */
  deletePlan = this.asyncHandler(async (req, res) => {
    const context = this.getRequestContext(req);
    const { id } = req.params;

    this.logger.info('Deleting plan', { planId: id, context });

    const plan = await this.planRepository.findById(id);
    if (!plan) {
      return this.sendError(res, 'Plan not found', 404, 'PLAN_NOT_FOUND', { planId: id });
    }

    if (plan.userId !== context.userId) {
      return this.sendError(res, 'Forbidden', 403, 'FORBIDDEN_ACCESS', { planId: id });
    }

    await this.planRepository.delete(id);

    this.logger.info('Plan deleted successfully', { planId: id, userId: context.userId });
    return this.sendSuccess(res, null, 'Plan deleted successfully');
  });
}

module.exports = PlanController;