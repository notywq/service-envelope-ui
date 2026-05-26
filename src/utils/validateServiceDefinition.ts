/**
 * Service Definition YAML Validator
 * Validates service definitions against SERVICE_DEFINITION_RULES.yaml
 */

interface ValidationError {
  section: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================================================
// PARAMETER TYPE VALIDATORS
// ============================================================================

const SUPPORTED_PARAMETER_TYPES = [
  'String',
  'Number',
  'Boolean',
  'Date',
  'Dropdown',
  'Radio',
  'Checkboxes',
];

function validateStringParameter(
  paramName: string,
  param: any,
  errors: ValidationError[]
): void {
  if (param.minLength && typeof param.minLength !== 'number') {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.minLength`,
      message: 'minLength must be a number',
      severity: 'error',
    });
  }
  if (param.maxLength && typeof param.maxLength !== 'number') {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.maxLength`,
      message: 'maxLength must be a number',
      severity: 'error',
    });
  }
  if (param.pattern && typeof param.pattern !== 'string') {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.pattern`,
      message: 'pattern must be a string (regex)',
      severity: 'error',
    });
  }
  if (param.minLength && param.maxLength && param.minLength > param.maxLength) {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}`,
      message: 'minLength cannot be greater than maxLength',
      severity: 'error',
    });
  }
}

function validateNumberParameter(paramName: string, param: any, errors: ValidationError[]): void {
  if (param.min !== undefined && typeof param.min !== 'number') {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.min`,
      message: 'min must be a number',
      severity: 'error',
    });
  }
  if (param.max !== undefined && typeof param.max !== 'number') {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.max`,
      message: 'max must be a number',
      severity: 'error',
    });
  }
  if (param.step && typeof param.step !== 'number') {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.step`,
      message: 'step must be a number',
      severity: 'error',
    });
  }
  if (param.min !== undefined && param.max !== undefined && param.min > param.max) {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}`,
      message: 'min cannot be greater than max',
      severity: 'error',
    });
  }
}

function validateDateParameter(paramName: string, param: any, errors: ValidationError[]): void {
  const validFormats = ['YYYY-MM-DD', 'DD-MM-YYYY', 'MM-DD-YYYY', 'ISO8601'];
  if (param.format && !validFormats.includes(param.format)) {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.format`,
      message: `Invalid date format. Must be one of: ${validFormats.join(', ')}`,
      severity: 'error',
    });
  }
  if (param.min && typeof param.min !== 'string') {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.min`,
      message: 'min must be a date string',
      severity: 'error',
    });
  }
  if (param.max && typeof param.max !== 'string') {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.max`,
      message: 'max must be a date string',
      severity: 'error',
    });
  }
}

function validateDropdownOrRadioParameter(
  paramName: string,
  param: any,
  errors: ValidationError[],
  type: 'Dropdown' | 'Radio'
): void {
  if (!param.options) {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.options`,
      message: `${type} must have 'options' array`,
      severity: 'error',
    });
    return;
  }

  if (!Array.isArray(param.options) || param.options.length === 0) {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.options`,
      message: `${type} options must be a non-empty array`,
      severity: 'error',
    });
    return;
  }

  // Validate default value is in options
  if (param.default !== undefined) {
    const optionValues = param.options.map((opt: any) =>
      typeof opt === 'string' ? opt : opt.value
    );
    if (!optionValues.includes(param.default)) {
      errors.push({
        section: 'request.parameters',
        field: `${paramName}.default`,
        message: `Default value must be one of the options`,
        severity: 'error',
      });
    }
  }
}

function validateCheckboxesParameter(paramName: string, param: any, errors: ValidationError[]): void {
  if (!param.options) {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.options`,
      message: 'Checkboxes must have "options" array',
      severity: 'error',
    });
    return;
  }

  if (!Array.isArray(param.options) || param.options.length === 0) {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.options`,
      message: 'Checkboxes options must be a non-empty array',
      severity: 'error',
    });
  }

  if (param.minSelected !== undefined && typeof param.minSelected !== 'number') {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.minSelected`,
      message: 'minSelected must be a number',
      severity: 'error',
    });
  }

  if (param.maxSelected !== undefined && typeof param.maxSelected !== 'number') {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}.maxSelected`,
      message: 'maxSelected must be a number',
      severity: 'error',
    });
  }

  if (
    param.minSelected !== undefined &&
    param.maxSelected !== undefined &&
    param.minSelected > param.maxSelected
  ) {
    errors.push({
      section: 'request.parameters',
      field: `${paramName}`,
      message: 'minSelected cannot be greater than maxSelected',
      severity: 'error',
    });
  }

  // Validate default values are in options
  if (param.default && Array.isArray(param.default)) {
    const optionValues = param.options.map((opt: any) =>
      typeof opt === 'string' ? opt : opt.value
    );
    param.default.forEach((defVal: any) => {
      if (!optionValues.includes(defVal)) {
        errors.push({
          section: 'request.parameters',
          field: `${paramName}.default`,
          message: `Default value "${defVal}" is not in options`,
          severity: 'error',
        });
      }
    });
  }
}

// ============================================================================
// APPROVAL ENVELOPE VALIDATORS
// ============================================================================

function validateApprovalEnvelope(envelope: any, errors: ValidationError[]): void {
  if (!envelope.approvalRules) {
    errors.push({
      section: 'approval',
      field: 'approvalRules',
      message: 'approval.approvalRules is required',
      severity: 'error',
    });
    return;
  }

  const { type } = envelope.approvalRules;
  const validTypes = ['all_must_approve', 'any_one', 'specific_approver', 'complex'];

  if (!validTypes.includes(type)) {
    errors.push({
      section: 'approval.approvalRules',
      field: 'type',
      message: `type must be one of: ${validTypes.join(', ')}`,
      severity: 'error',
    });
  }

  if (type === 'complex') {
    if (!envelope.approvalRules.requiredApprovers || envelope.approvalRules.requiredApprovers.length === 0) {
      errors.push({
        section: 'approval.approvalRules',
        field: 'requiredApprovers',
        message: 'complex type REQUIRES requiredApprovers array',
        severity: 'error',
      });
    }
    if (!envelope.approvalRules.atLeastOneOf || envelope.approvalRules.atLeastOneOf.length === 0) {
      errors.push({
        section: 'approval.approvalRules',
        field: 'atLeastOneOf',
        message: 'complex type REQUIRES atLeastOneOf array',
        severity: 'error',
      });
    }
  }
}

// ============================================================================
// PAYMENT ENVELOPE VALIDATORS
// ============================================================================

function validatePaymentEnvelope(envelope: any, errors: ValidationError[]): void {
  if (envelope.required === true) {
    if (!envelope.charges || !Array.isArray(envelope.charges) || envelope.charges.length === 0) {
      errors.push({
        section: 'payment',
        field: 'charges',
        message: 'If payment is required, at least one charge item must be defined',
        severity: 'error',
      });
      return;
    }

    envelope.charges.forEach((charge: any, index: number) => {
      if (!charge.item) {
        errors.push({
          section: 'payment.charges',
          field: `[${index}].item`,
          message: 'Charge item must have "item" field',
          severity: 'error',
        });
      }
      if (charge.amount === undefined || typeof charge.amount !== 'number') {
        errors.push({
          section: 'payment.charges',
          field: `[${index}].amount`,
          message: 'Charge must have numeric "amount" field',
          severity: 'error',
        });
      } else if (charge.amount <= 0) {
        errors.push({
          section: 'payment.charges',
          field: `[${index}].amount`,
          message: 'Charge amount must be greater than 0',
          severity: 'error',
        });
      }
      if (!charge.currency) {
        errors.push({
          section: 'payment.charges',
          field: `[${index}].currency`,
          message: 'Charge must have "currency" field (ISO 4217 code)',
          severity: 'error',
        });
      }
    });
  }

  if (envelope.paymentProvider && typeof envelope.paymentProvider !== 'string') {
    errors.push({
      section: 'payment',
      field: 'paymentProvider',
      message: 'paymentProvider must be a string',
      severity: 'error',
    });
  }
}

// ============================================================================
// PROCESSING ENVELOPE VALIDATORS
// ============================================================================

function validateProcessingEnvelope(envelope: any, errors: ValidationError[]): void {
  if (!envelope.tasks || !Array.isArray(envelope.tasks)) {
    errors.push({
      section: 'processing',
      field: 'tasks',
      message: 'processing.tasks must be an array',
      severity: 'warning',
    });
    return;
  }

  envelope.tasks.forEach((task: any, index: number) => {
    if (task.type !== 'api_call') {
      errors.push({
        section: 'processing.tasks',
        field: `[${index}].type`,
        message: 'Only "api_call" task type is supported',
        severity: 'error',
      });
    }

    const requiredFields = ['name', 'method', 'url'];
    requiredFields.forEach((field) => {
      if (!task[field]) {
        errors.push({
          section: 'processing.tasks',
          field: `[${index}].${field}`,
          message: `api_call task requires "${field}" field`,
          severity: 'error',
        });
      }
    });

    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (task.method && !validMethods.includes(task.method.toUpperCase())) {
      errors.push({
        section: 'processing.tasks',
        field: `[${index}].method`,
        message: `method must be one of: ${validMethods.join(', ')}`,
        severity: 'error',
      });
    }

    if (task.timeout && typeof task.timeout !== 'number') {
      errors.push({
        section: 'processing.tasks',
        field: `[${index}].timeout`,
        message: 'timeout must be a number (milliseconds)',
        severity: 'error',
      });
    }

    if (task.retries && typeof task.retries !== 'number') {
      errors.push({
        section: 'processing.tasks',
        field: `[${index}].retries`,
        message: 'retries must be a number',
        severity: 'error',
      });
    }
  });
}

// ============================================================================
// DELIVERY ENVELOPE VALIDATORS
// ============================================================================

function validateDeliveryEnvelope(envelope: any, errors: ValidationError[]): void {
  if (!envelope.deliveryMethods) {
    errors.push({
      section: 'delivery',
      field: 'deliveryMethods',
      message: 'delivery.deliveryMethods is required',
      severity: 'warning',
    });
    return;
  }

  const validMethods = ['email', 'physical_mail', 'pickup'];

  for (const method of validMethods) {
    const methodConfig = envelope.deliveryMethods[method];

    if (methodConfig && methodConfig.enabled !== false) {
      if (method === 'email') {
        if (!methodConfig.subject) {
          errors.push({
            section: 'delivery.deliveryMethods.email',
            field: 'subject',
            message: 'Email delivery method requires "subject"',
            severity: 'error',
          });
        }
        if (!methodConfig.recipient) {
          errors.push({
            section: 'delivery.deliveryMethods.email',
            field: 'recipient',
            message: 'Email delivery method requires "recipient"',
            severity: 'error',
          });
        }
      }

      if (method === 'physical_mail') {
        if (!methodConfig.address) {
          errors.push({
            section: 'delivery.deliveryMethods.physical_mail',
            field: 'address',
            message: 'Physical mail delivery requires "address"',
            severity: 'error',
          });
        }
        if (!methodConfig.carrier) {
          errors.push({
            section: 'delivery.deliveryMethods.physical_mail',
            field: 'carrier',
            message: 'Physical mail delivery requires "carrier"',
            severity: 'warning',
          });
        }
        if (methodConfig.estimatedDays && typeof methodConfig.estimatedDays !== 'number') {
          errors.push({
            section: 'delivery.deliveryMethods.physical_mail',
            field: 'estimatedDays',
            message: 'estimatedDays must be a number',
            severity: 'error',
          });
        }
      }

      if (method === 'pickup') {
        if (!methodConfig.location) {
          errors.push({
            section: 'delivery.deliveryMethods.pickup',
            field: 'location',
            message: 'Pickup delivery requires "location"',
            severity: 'error',
          });
        }
        if (!methodConfig.hoursOfOperation) {
          errors.push({
            section: 'delivery.deliveryMethods.pickup',
            field: 'hoursOfOperation',
            message: 'Pickup delivery requires "hoursOfOperation"',
            severity: 'warning',
          });
        }
      }
    }
  }
}

// ============================================================================
// EMAIL TEMPLATE ID VALIDATOR
// ============================================================================

function validateEmailTemplateId(templateId: string, _expectedEnvelopeType: string): boolean {
  // Pattern: SERV-{number}-{envelope}-{start|end}
  // Example: SERV-3-approval-start
  const pattern = /^SERV-\d+-[\w-]+-(?:start|end)$/;
  return pattern.test(templateId);
}

function validateEmailTemplateReferences(definition: any, errors: ValidationError[]): void {
  const envelopes = ['approval', 'payment', 'processing', 'delivery', 'feedback'];

  envelopes.forEach((envelope) => {
    const env = definition.envelopes?.[envelope];
    if (!env) return;

    // Check emailTemplateStartEnvelope
    if (env.emailTemplateStartEnvelope) {
      if (!validateEmailTemplateId(env.emailTemplateStartEnvelope, envelope)) {
        errors.push({
          section: envelope,
          field: 'emailTemplateStartEnvelope',
          message: `Email template ID "${env.emailTemplateStartEnvelope}" does not match pattern SERV-#-${envelope}-start`,
          severity: 'warning',
        });
      }
    }

    // Check emailTemplateEndEnvelope
    if (env.emailTemplateEndEnvelope) {
      if (!validateEmailTemplateId(env.emailTemplateEndEnvelope, envelope)) {
        errors.push({
          section: envelope,
          field: 'emailTemplateEndEnvelope',
          message: `Email template ID "${env.emailTemplateEndEnvelope}" does not match pattern SERV-#-${envelope}-end`,
          severity: 'warning',
        });
      }
    }
  });
}

// ============================================================================
// MAIN VALIDATOR
// ============================================================================

export function validateServiceDefinition(definition: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!definition) {
    return {
      isValid: false,
      errors: [
        {
          section: 'root',
          field: 'definition',
          message: 'Service definition is empty or invalid',
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }

  // ========================================================================
  // METADATA VALIDATION
  // ========================================================================

  if (!definition.serviceId) {
    errors.push({
      section: 'metadata',
      field: 'serviceId',
      message: 'serviceId is required (format: UPPERCASE-###)',
      severity: 'error',
    });
  } else if (!/^[A-Z0-9]+-\d{3}$/.test(definition.serviceId)) {
    errors.push({
      section: 'metadata',
      field: 'serviceId',
      message: 'serviceId must match format: UPPERCASE-### (e.g., SERVICE-001)',
      severity: 'error',
    });
  }

  if (!definition.type) {
    errors.push({
      section: 'metadata',
      field: 'type',
      message: 'type is required (lowercase with hyphens)',
      severity: 'error',
    });
  } else if (!/^[a-z0-9-]+$/.test(definition.type)) {
    errors.push({
      section: 'metadata',
      field: 'type',
      message: 'type must be lowercase with hyphens only (e.g., transcript-of-records)',
      severity: 'error',
    });
  }

  if (!definition.name) {
    errors.push({
      section: 'metadata',
      field: 'name',
      message: 'name is required',
      severity: 'error',
    });
  }

  // ========================================================================
  // REQUEST ENVELOPE VALIDATION
  // ========================================================================

  const requestEnv = definition.request || definition.envelopes?.request;
  if (!requestEnv) {
    errors.push({
      section: 'root',
      field: 'request',
      message: 'request envelope is required',
      severity: 'error',
    });
  } else {
    const parameters = requestEnv.parameters || {};

    Object.entries(parameters).forEach(([paramName, param]: [string, any]) => {
      if (!param.type) {
        errors.push({
          section: 'request.parameters',
          field: `${paramName}.type`,
          message: 'Parameter must have a "type" field',
          severity: 'error',
        });
        return;
      }

      if (!SUPPORTED_PARAMETER_TYPES.includes(param.type)) {
        errors.push({
          section: 'request.parameters',
          field: `${paramName}.type`,
          message: `Parameter type "${param.type}" is not supported. Must be one of: ${SUPPORTED_PARAMETER_TYPES.join(', ')}`,
          severity: 'error',
        });
        return;
      }

      // Type-specific validation
      switch (param.type) {
        case 'String':
          validateStringParameter(paramName, param, errors);
          break;
        case 'Number':
          validateNumberParameter(paramName, param, errors);
          break;
        case 'Date':
          validateDateParameter(paramName, param, errors);
          break;
        case 'Dropdown':
          validateDropdownOrRadioParameter(paramName, param, errors, 'Dropdown');
          break;
        case 'Radio':
          validateDropdownOrRadioParameter(paramName, param, errors, 'Radio');
          break;
        case 'Checkboxes':
          validateCheckboxesParameter(paramName, param, errors);
          break;
      }
    });
  }

  // ========================================================================
  // ENVELOPE VALIDATION
  // ========================================================================

  const envelopes = definition.envelopes;
  if (!envelopes) {
    errors.push({
      section: 'root',
      field: 'envelopes',
      message: 'envelopes section is required',
      severity: 'error',
    });
  } else {
    // Check required envelopes
    const requiredEnvelopes = ['request', 'approval', 'payment', 'processing', 'delivery', 'feedback'];
    requiredEnvelopes.forEach((env) => {
      if (!(env in envelopes)) {
        errors.push({
          section: 'root',
          field: env,
          message: `Missing required envelope: "${env}"`,
          severity: 'error',
        });
      }
    });

    // Validate specific envelopes
    if (envelopes.approval) {
      validateApprovalEnvelope(envelopes.approval, errors);
    }

    if (envelopes.payment) {
      validatePaymentEnvelope(envelopes.payment, errors);
    }

    if (envelopes.processing) {
      validateProcessingEnvelope(envelopes.processing, errors);
    }

    if (envelopes.delivery) {
      validateDeliveryEnvelope(envelopes.delivery, errors);
    }
  }

  // ========================================================================
  // EMAIL TEMPLATE VALIDATION
  // ========================================================================

  validateEmailTemplateReferences(definition, warnings);

  // ========================================================================
  // SEPARATE ERRORS AND WARNINGS
  // ========================================================================

  const allErrors = errors.filter((e) => e.severity === 'error');
  const allWarnings = [...errors.filter((e) => e.severity === 'warning'), ...warnings];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}
