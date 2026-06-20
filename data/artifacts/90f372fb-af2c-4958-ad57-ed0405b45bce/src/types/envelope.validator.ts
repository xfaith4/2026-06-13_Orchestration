/**
 * Envelope Validator
 * Validates requests and responses against standard schemas
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ApiEnvelope, ErrorEnvelope, SuccessEnvelope } from './envelope.types';

const ajv = new Ajv({
  useDefaults: true,
  removeAdditional: 'all',
  allErrors: true,
});

addFormats(ajv);

/**
 * Schema definitions as TypeScript types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const successEnvelopeSchema: any = {
  type: 'object',
  required: ['status', 'data', 'meta', 'errors'],
  properties: {
    status: { type: 'string', const: 'success' },
    data: { type: ['object', 'array', 'null', 'string', 'number', 'boolean'] },
    meta: {
      type: 'object',
      required: ['timestamp', 'version', 'requestId'],
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
        requestId: { type: 'string', format: 'uuid' },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1 },
            total: { type: 'integer', minimum: 0 },
            hasMore: { type: 'boolean' },
          },
          required: [],
        },
      },
    },
    errors: { const: null },
  },
};

const errorEnvelopeSchema: any = {
  type: 'object',
  required: ['status', 'data', 'meta', 'errors'],
  properties: {
    status: { const: 'error' },
    data: { const: null },
    meta: {
      type: 'object',
      required: ['timestamp', 'version', 'requestId'],
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        version: { type: 'string' },
        requestId: { type: 'string', format: 'uuid' },
        pagination: { type: 'object' },
      },
    },
    errors: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', pattern: '^[A-Z_]+$' },
          message: { type: 'string' },
          field: { type: 'string', nullable: true },
          details: { type: 'object', nullable: true },
        },
      },
    },
  },
};

class EnvelopeValidator {
  private validateSuccess = ajv.compile(successEnvelopeSchema);
  private validateError = ajv.compile(errorEnvelopeSchema);

  /**
   * Validates response envelope structure and content
   * @throws {ValidationError} if envelope does not match schema
   */
  validateResponse(response: unknown): asserts response is ApiEnvelope {
    // Ensure it's an object
    if (typeof response !== 'object' || response === null) {
      throw new ValidationError('Response must be an object', {
        received: typeof response,
      });
    }

    const envelope = response as Record<string, unknown>;
    const status = envelope.status;

    // Validate based on status
    if (status === 'success') {
      if (!this.validateSuccess(envelope)) {
        throw new ValidationError('Success envelope validation failed', {
          errors: this.validateSuccess.errors,
        });
      }
    } else if (status === 'error') {
      if (!this.validateError(envelope)) {
        throw new ValidationError('Error envelope validation failed', {
          errors: this.validateError.errors,
        });
      }
    } else {
      throw new ValidationError(
        `Invalid status: must be 'success' or 'error', got '${status}'`,
        { received: status }
      );
    }
  }

  /**
   * Type guard for success envelopes
   */
  isSuccessEnvelope(response: ApiEnvelope): response is SuccessEnvelope {
    return response.status === 'success';
  }

  /**
   * Type guard for error envelopes
   */
  isErrorEnvelope(response: ApiEnvelope): response is ErrorEnvelope {
    return response.status === 'error';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public context: Record<string, unknown>
  ) {
    super(message);
    this.name = 'EnvelopeValidationError';
  }
}

export const envelopeValidator = new EnvelopeValidator();
