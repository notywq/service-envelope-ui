/**
 * JSON Schema Validator
 * Uses AJV to validate service definitions against the canonical schema
 */

import Ajv from 'ajv';

interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  data?: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  schemaVersion?: string;
}

class SchemaValidator {
  private ajv: Ajv;
  private schema: any = null;
  private schemaVersion: string | null = null;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });
  }

  /**
   * Initialize validator with schema and version
   */
  setSchema(schema: any, version?: string): void {
    this.schema = schema;
    this.schemaVersion = version || '1.0.0';
  }

  /**
   * Get current schema
   */
  getSchema(): any {
    return this.schema;
  }

  /**
   * Get current schema version
   */
  getSchemaVersion(): string | null {
    return this.schemaVersion;
  }

  /**
   * Validate data against current schema
   */
  validate(data: any): ValidationResult {
    if (!this.schema) {
      return {
        isValid: false,
        errors: [
          {
            path: '/',
            message: 'Schema not loaded',
            keyword: 'schema',
          },
        ],
      };
    }

    const validate = this.ajv.compile(this.schema);
    const isValid = validate(data);

    const errors: ValidationError[] = [];

    if (!isValid && validate.errors) {
      errors.push(
        ...validate.errors.map((err) => ({
          path: err.instancePath || '/',
          message: this.getErrorMessage(err),
          keyword: err.keyword || 'unknown',
          data: err.data,
        }))
      );
    }

    return {
      isValid,
      errors,
      schemaVersion: this.schemaVersion || undefined,
    };
  }

  /**
   * Validate specific envelope section
   */
  validateEnvelope(
    envelopeType: 'request' | 'approval' | 'payment' | 'processing' | 'delivery' | 'feedback',
    data: any
  ): ValidationResult {
    if (!this.schema?.properties?.envelopes?.properties?.[envelopeType]) {
      return {
        isValid: false,
        errors: [
          {
            path: `/envelopes/${envelopeType}`,
            message: `Schema for ${envelopeType} envelope not found`,
            keyword: 'schema',
          },
        ],
      };
    }

    const envelopeSchema = this.schema.properties.envelopes.properties[envelopeType];
    const validate = this.ajv.compile(envelopeSchema);
    const isValid = validate(data);

    const errors: ValidationError[] = [];

    if (!isValid && validate.errors) {
      errors.push(
        ...validate.errors.map((err) => ({
          path: `/envelopes/${envelopeType}${err.instancePath || ''}`,
          message: this.getErrorMessage(err),
          keyword: err.keyword || 'unknown',
          data: err.data,
        }))
      );
    }

    return {
      isValid,
      errors,
      schemaVersion: this.schemaVersion || undefined,
    };
  }

  /**
   * Validate request parameters specifically
   */
  validateRequestParameters(parameters: Record<string, any>): ValidationResult {
    if (!this.schema?.properties?.envelopes?.properties?.request?.properties?.parameters) {
      return {
        isValid: false,
        errors: [
          {
            path: '/envelopes/request/parameters',
            message: 'Request parameters schema not found',
            keyword: 'schema',
          },
        ],
      };
    }

    const parametersSchema = this.schema.properties.envelopes.properties.request.properties.parameters;
    const validate = this.ajv.compile(parametersSchema);
    const isValid = validate(parameters);

    const errors: ValidationError[] = [];

    if (!isValid && validate.errors) {
      errors.push(
        ...validate.errors.map((err) => ({
          path: `/envelopes/request/parameters${err.instancePath || ''}`,
          message: this.getErrorMessage(err),
          keyword: err.keyword || 'unknown',
          data: err.data,
        }))
      );
    }

    return {
      isValid,
      errors,
      schemaVersion: this.schemaVersion || undefined,
    };
  }

  /**
   * Validate individual parameter
   */
  validateParameter(
    paramName: string,
    value: any,
    paramSchema: any
  ): ValidationResult {
    const validate = this.ajv.compile(paramSchema);
    const isValid = validate(value);

    const errors: ValidationError[] = [];

    if (!isValid && validate.errors) {
      errors.push(
        ...validate.errors.map((err) => ({
          path: `/${paramName}`,
          message: this.getErrorMessage(err),
          keyword: err.keyword || 'unknown',
          data: err.data,
        }))
      );
    }

    return {
      isValid,
      errors,
      schemaVersion: this.schemaVersion || undefined,
    };
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(err: any): string {
    switch (err.keyword) {
      case 'required':
        return `Missing required field: "${err.params.missingProperty}"`;
      case 'type':
        return `Expected ${err.params.type}, but got ${typeof err.data}`;
      case 'minimum':
        return `Must be at least ${err.params.limit}`;
      case 'maximum':
        return `Must be at most ${err.params.limit}`;
      case 'minLength':
        return `Minimum ${err.params.limit} characters required`;
      case 'maxLength':
        return `Maximum ${err.params.limit} characters allowed`;
      case 'minItems':
        return `At least ${err.params.limit} items required`;
      case 'maxItems':
        return `At most ${err.params.limit} items allowed`;
      case 'pattern':
        return `Invalid format. Pattern: ${err.params.pattern}`;
      case 'enum':
        return `Must be one of: ${err.params.allowedValues.join(', ')}`;
      case 'format':
        return `Invalid ${err.params.format} format`;
      case 'additionalProperties':
        return `Unknown property "${err.params.additionalProperty}" is not allowed`;
      case 'oneOf':
      case 'anyOf':
        return `Value does not match any of the allowed schemas`;
      case 'not':
        return `Value matches a schema that should not be matched`;
      default:
        return err.message || 'Validation failed';
    }
  }

  /**
   * Get supported parameter types based on schema
   */
  getSupportedParameterTypes(): string[] {
    // Returns the supported types for request parameters based on schema
    return [
      'String',
      'Number',
      'Boolean',
      'Date',
      'Dropdown',
      'Radio',
      'Checkboxes',
    ];
  }

  /**
   * Get parameter template for a given type
   */
  getParameterTemplate(type: string): Record<string, any> {
    const templates: Record<string, any> = {
      String: {
        type: 'String',
        required: false,
        minLength: 0,
        maxLength: 255,
        pattern: null,
      },
      Number: {
        type: 'Number',
        required: false,
        min: 0,
        max: 100,
        step: 1,
      },
      Boolean: {
        type: 'Boolean',
        required: false,
      },
      Date: {
        type: 'Date',
        required: false,
        format: 'YYYY-MM-DD',
      },
      Dropdown: {
        type: 'Dropdown',
        required: false,
        options: ['Option 1', 'Option 2', 'Option 3'],
      },
      Radio: {
        type: 'Radio',
        required: false,
        options: ['Option 1', 'Option 2', 'Option 3'],
      },
      Checkboxes: {
        type: 'Checkboxes',
        required: false,
        options: ['Option 1', 'Option 2', 'Option 3'],
        minSelected: 1,
        maxSelected: 3,
      },
    };

    return templates[type] || templates.String;
  }
}

// Export singleton instance
export const schemaValidator = new SchemaValidator();

export type { ValidationError, ValidationResult };
export default schemaValidator;
