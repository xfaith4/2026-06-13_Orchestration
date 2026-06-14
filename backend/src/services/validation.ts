import fs from 'fs/promises';
import path from 'path';

export interface ValidationError {
  path: string;
  message: string;
  value: unknown;
}

export interface JSONSchema {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  items?: JSONSchema;
  [key: string]: unknown;
}

export class ValidationService {
  private schemas: Map<string, JSONSchema> = new Map();
  private schemasDir: string;

  constructor(schemasDir: string) {
    this.schemasDir = schemasDir;
  }

  async loadSchema(schemaName: string): Promise<JSONSchema | null> {
    if (this.schemas.has(schemaName)) {
      return this.schemas.get(schemaName) || null;
    }

    try {
      const schemaPath = path.join(this.schemasDir, `${schemaName}.json`);
      const data = await fs.readFile(schemaPath, 'utf-8');
      const schema = JSON.parse(data) as JSONSchema;
      this.schemas.set(schemaName, schema);
      return schema;
    } catch {
      return null;
    }
  }

  validate(data: unknown, schema: JSONSchema): ValidationError[] {
    const errors: ValidationError[] = [];
    this.validateValue(data, schema, '', errors);
    return errors;
  }

  private validateValue(
    data: unknown,
    schema: JSONSchema,
    path: string,
    errors: ValidationError[]
  ): void {
    // Type validation
    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      const actualType = Array.isArray(data) ? 'array' : typeof data;
      
      if (!types.includes(actualType)) {
        errors.push({
          path: path || '/',
          message: `Expected type ${types.join(' or ')}, got ${actualType}`,
          value: data,
        });
        return;
      }
    }

    // Required fields
    if (schema.type === 'object' && schema.required && typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      for (const field of schema.required) {
        if (!(field in obj)) {
          errors.push({
            path: path ? `${path}.${field}` : field,
            message: `Required field missing`,
            value: undefined,
          });
        }
      }
    }

    // Properties validation
    if (schema.properties && typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in obj) {
          const propPath = path ? `${path}.${key}` : key;
          this.validateValue(obj[key], propSchema, propPath, errors);
        }
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({
        path: path || '/',
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        value: data,
      });
    }

    // String validations
    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push({
          path: path || '/',
          message: `String must be at least ${schema.minLength} characters`,
          value: data,
        });
      }
      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.push({
          path: path || '/',
          message: `String must be at most ${schema.maxLength} characters`,
          value: data,
        });
      }
    }

    // Number validations
    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({
          path: path || '/',
          message: `Number must be at least ${schema.minimum}`,
          value: data,
        });
      }
      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push({
          path: path || '/',
          message: `Number must be at most ${schema.maximum}`,
          value: data,
        });
      }
    }

    // Array validations
    if (Array.isArray(data) && schema.items) {
      for (let i = 0; i < data.length; i++) {
        const itemPath = `${path}[${i}]`;
        this.validateValue(data[i], schema.items, itemPath, errors);
      }
    }
  }
}
