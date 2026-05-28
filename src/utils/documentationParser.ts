/**
 * Documentation Parser
 * Parses SERVICE_DEFINITION_RULES.yaml into sections for interactive display
 */

export interface DocumentationSection {
  id: number;
  title: string;
  description: string;
  learningGuides: string[];
  yamlContent: string;
  yamlBlocks?: { title: string; content: string }[];
  fullContent: string;
}

const rawYAML = `# SERVICE DEFINITION RULES - Complete Technical Blueprint v2.0
# ALIGNED WITH: Service Definition Schema v1.0.1 (May 29, 2026)
#
# PURPOSE: This is the DEFINITIVE REFERENCE for all Service Envelope YAML definitions.
# Every service created with the Service Envelope system MUST follow these rules and patterns.
# This document is the BIBLE that shows every possible configuration option and constraint.
#
# PHILOSOPHY: 
#   - Type-safe: Every field has explicit type and validation
#   - Flexible: Services can be minimal (1 envelope) or complex (all 6)
#   - Powerful: Parameter substitution, conditional delivery, approval workflows
#   - Documented: Extensive comments explain the "why" and "how"
#
# USE THIS DOCUMENT TO:
#   - Understand all configuration options available
#   - Learn patterns for your specific service needs
#   - Find examples of every parameter type and constraint
#   - Understand envelope flow and responsibilities
#   - Reference validation rules before testing

# ============================================================================
# QUICK START: ARCHITECTURE PATTERN
# ============================================================================
# Service Envelope follows a 6-envelope SEQUENTIAL PIPELINE per request:
#   1. REQUEST    - Collect user parameters (ALWAYS REQUIRED)
#   2. APPROVAL   - Get approval(s) before proceeding (optional: required: false)
#   3. PAYMENT    - Collect payment (optional: required: false)
#   4. PROCESSING - Execute backend tasks/APIs (optional: required: false)
#   5. DELIVERY   - Send/deliver documents (optional: required: false) ← NEW: Can be empty
#   6. FEEDBACK   - Collect user feedback (optional: required: false) ← NEW: Can be empty
#
# NEW ARCHITECTURE (May 29, 2026):
# - Delivery details (method, address) now submitted via separate API: POST /api/delivery/{requestId}/details
# - Delivery is NOT part of request submission (separation of concerns)
# - Optional envelopes (required:false) can have empty configuration
# - Backend validates envelope is empty if required:false

# ============================================================================
# 1. SERVICE METADATA
# ============================================================================
# Service metadata identifies and describes the service
# serviceId: Unique identifier format UPPERCASE-###
# type: Lowercase with hyphens, used to link requests
# name: Display name for UI and logs
# description: What the service does (optional but recommended)

# ============================================================================
# 2. REQUEST ENVELOPE - PARAMETER SCHEMA DEFINITION
# ============================================================================
# REQUEST PURPOSE: Collect user input via form fields
# REQUEST FLOW: Form rendering → validation → submission
# SUPPORTED PARAMETER TYPES: String, Number, Boolean, Date, Dropdown, Radio, Checkboxes
# DELIVERY SUBMITTED SEPARATELY: Post-request via /api/delivery/{requestId}/details

# ============================================================================
# 3. APPROVAL ENVELOPE - Authorization Workflow
# ============================================================================
# APPROVAL PURPOSE: Enforce authorization checks before proceeding
# APPROVAL RULE TYPES: all_must_approve, any_one, specific_approver, complex
# EMAIL NOTIFICATIONS: Start email to approvers, end email to requestor
# OPTIONAL: Can be skipped entirely with required: false

# ============================================================================
# 4. PAYMENT ENVELOPE - Collect Money Before Proceeding
# ============================================================================
# PAYMENT PURPOSE: Collect payment before processing request
# CHARGE CALCULATION: amount × quantity = item total
# PAYMENT PROVIDERS: maya, stripe, gcash
# AMOUNT UNITS: Smallest currency unit (PHP 500 = ₱5.00)
# OPTIONAL: Can be skipped for free services with required: false

# ============================================================================
# 5. PROCESSING ENVELOPE - Execute Backend Tasks
# ============================================================================
# PROCESSING PURPOSE: Execute automatic backend tasks (API calls, integrations)
# TASK EXECUTION: SEQUENTIAL (one after another, not parallel)
# HTTP METHODS: GET, POST, PUT, DELETE, PATCH
# SUBSTITUTION: {{parameterName}} replaced before each API call
# RETRY POLICY: Per-task retries and timeout handling
# STOP ON FAILURE: Can continue or halt pipeline on task failure

# ============================================================================
# 6. DELIVERY ENVELOPE - Send/Deliver Documents (OPTIONAL - NEW May 29)
# ============================================================================
# DELIVERY PURPOSE: Deliver processed documents to requestor
# DELIVERY METHODS: EMAIL, PHYSICAL_MAIL, PICKUP
# NEW ARCHITECTURE: Delivery details submitted separately via API
# DELIVERY STATUS: 0=processing, 1=ready_to_deliver, 2=out_for_delivery, 3=delivered
# OPTIONAL: Can be completely empty if not needed with required: false

# ============================================================================
# 7. FEEDBACK ENVELOPE - Collect User Feedback (OPTIONAL - NEW May 29)
# ============================================================================
# FEEDBACK PURPOSE: Gather user satisfaction after delivery
# AUTO-CLOSE: Request can auto-close after N hours
# EXPIRY: Feedback link becomes inactive after N days
# REMINDERS: Optional email reminders before deadline
# OPTIONAL: Can be skipped entirely with required: false

# ============================================================================
# 8. EMAIL TEMPLATE ID NAMING CONVENTION
# ============================================================================
# PATTERN: SERV-{serviceId}-{envelopeType}-{phase}
# EXAMPLE: SERV-999-approval-start = approval envelope start email
# TEMPLATES STORED IN: MongoDB EmailTemplate collection
# SUBSTITUTION IN TEMPLATES: {{parameterName}}, {{approvalLink}}, {{paymentLink}}, etc.

# ============================================================================
# 9. COMPLETE VALIDATION RULES SUMMARY
# ============================================================================
# SERVICE RULES: serviceId uniqueness, type format, REQUEST always required
# REQUEST VALIDATION: Parameter types, constraints (min/max, pattern, etc.)
# APPROVAL VALIDATION: Rule types, approver emails, template existence
# PAYMENT VALIDATION: Charges, provider, amounts, template existence
# PROCESSING VALIDATION: Tasks, HTTP methods, URLs, timeouts, success codes
# DELIVERY VALIDATION: Methods enabled, email/mail/pickup config, templates
# FEEDBACK VALIDATION: Expiry, auto-close, notification settings
# OPTIONAL ENVELOPE RULE: Empty optional envelopes are valid

# ============================================================================
# 10. TEMPLATE VARIABLE SUBSTITUTION - COMPLETE REFERENCE
# ============================================================================
# SYSTEM VARIABLES: {{requestId}}, {{currentTimestamp}}, {{totalAmount}}
# PAYMENT VARIABLES: {{paymentLink}} (payment envelope only)
# FEEDBACK VARIABLES: {{feedbackLink}} (feedback envelope only)
# REQUEST PARAMETERS: {{anyParameterName}} from request parameters
# SUBSTITUTION FORMAT: Double curly braces {{variableName}}
# UNKNOWN PARAMETERS: Replaced with empty string`;

export function parseDocumentation(): DocumentationSection[] {
  const sections: DocumentationSection[] = [
    {
      id: 0,
      title: "Introduction",
      description: "Overview and key concepts of Service Envelope system",
      learningGuides: [
        "This is the DEFINITIVE REFERENCE for all Service Envelope YAML definitions",
        "Every service created MUST follow these rules and patterns",
        "This document is the BIBLE showing every possible configuration option",
        "Key Philosophy: Type-safe, Flexible, Powerful, and well-documented",
      ],
      yamlContent: "",
      fullContent: rawYAML,
    },
    {
      id: 1,
      title: "Quick Start: Architecture Pattern",
      description: "Understanding the 6-envelope sequential pipeline",
      learningGuides: [
        "Service Envelope follows a 6-envelope SEQUENTIAL PIPELINE per request",
        "REQUEST (ALWAYS REQUIRED) - Collect user parameters",
        "APPROVAL (optional) - Get authorization before proceeding",
        "PAYMENT (optional) - Collect payment before processing",
        "PROCESSING (optional) - Execute backend tasks/APIs",
        "DELIVERY (optional) - Send documents via email/mail/pickup",
        "FEEDBACK (optional) - Collect user satisfaction feedback",
        "ARCHITECTURE: Delivery details submitted separately via API",
        "Optional envelopes can be completely empty if not needed",
      ],
      yamlContent: `# 6-Envelope Sequential Pipeline
1. REQUEST    - Collect user parameters (ALWAYS REQUIRED)
2. APPROVAL   - Get approval(s) before proceeding (optional)
3. PAYMENT    - Collect payment (optional)
4. PROCESSING - Execute backend tasks/APIs (optional)
5. DELIVERY   - Send/deliver documents (optional)
6. FEEDBACK   - Collect user feedback (optional)`,
      fullContent: rawYAML,
    },
    {
      id: 2,
      title: "Service Metadata",
      description: "Core service identification and metadata fields",
      learningGuides: [
        "serviceId: Unique identifier (format: UPPERCASE-###)",
        "type: Lowercase with hyphens, used to link requests",
        "name: Display name for UI and logs",
        "description: What the service does (optional but recommended)",
      ],
      yamlContent: `serviceId: "SERVICE-999"     # Unique identifier
type: "comprehensive-student-document"  # Lowercase with hyphens
name: "Comprehensive Student Document Service"  # Display name
description: "Request and process comprehensive student documents..."`,
      fullContent: rawYAML,
    },
    {
      id: 3,
      title: "REQUEST Envelope",
      description: "Collect user parameters via form fields",
      learningGuides: [
        "REQUEST PURPOSE: Collect user input via form fields",
        "REQUEST is ALWAYS REQUIRED (cannot have required: false)",
        "SUPPORTED PARAMETER TYPES: String, Number, Boolean, Date, Dropdown, Radio, Checkboxes",
        "Each parameter must have: type, description, required fields",
        "String constraints: minLength, maxLength, pattern",
        "Number constraints: min, max, step",
        "Date constraints: format, min, max",
        "DELIVERY IS SUBMITTED SEPARATELY (NEW): POST /api/delivery/{requestId}/details",
        "This separation allows delivery to fail independently",
      ],
      yamlContent: `request:
  parameters:
    studentId:
      type: "String"
      required: true
      description: "Student ID number"
      minLength: 6
      maxLength: 10
      pattern: "^[A-Z0-9]+"
    firstName:
      type: "String"
      required: true
      description: "First name"
    documentType:
      type: "Dropdown"
      required: true
      description: "Type of document needed"
      options:
        - "Transcript of Records"
        - "Diploma Copy"
        - "Certification Letter"`,
      fullContent: rawYAML,
    },
    {
      id: 4,
      title: "APPROVAL Envelope",
      description: "Authorization workflow with multiple approvers",
      learningGuides: [
        "APPROVAL PURPOSE: Enforce authorization checks before proceeding",
        "APPROVAL RULE TYPES:",
        "  - all_must_approve: Every approver must approve (AND logic)",
        "  - any_one: Any single approver can approve (OR logic)",
        "  - specific_approver: Only ONE person can approve",
        "  - complex: all requiredApprovers must approve",
        "    AND at least one from atLeastOneOf must approve",
        "EMAIL FLOW: Start email sent to approvers, end email to requestor",
        "OPTIONAL: Can be skipped entirely with required: false",
        "Approver emails must be valid format",
        "Email templates must exist in MongoDB",
      ],
      yamlContent: `approval:
  required: true
  approvalRules:
    type: all_must_approve
    requiredApprovers:
      - registrar@mapua.edu.ph
      - dean@mapua.edu.ph
      - compliance@mapua.edu.ph
  emailTemplateStartEnvelope: SERV-999-approval-start
  emailTemplateEndEnvelope: SERV-999-approval-end
  expiryHours: 96`,
      yamlBlocks: [
        {
          title: "all_must_approve (AND logic)",
          content: `approval:
  required: true
  approvalRules:
    type: all_must_approve
    requiredApprovers:
      - registrar@mapua.edu.ph
      - dean@mapua.edu.ph
      - compliance@mapua.edu.ph
  emailTemplateStartEnvelope: SERV-999-approval-start
  emailTemplateEndEnvelope: SERV-999-approval-end
  expiryHours: 96`,
        },
        {
          title: "any_one (OR logic)",
          content: `approval:
  required: true
  approvalRules:
    type: any_one
    requiredApprovers:
      - coordinator1@mapua.edu.ph
      - coordinator2@mapua.edu.ph
      - coordinator3@mapua.edu.ph
  emailTemplateStartEnvelope: SERV-999-approval-start
  emailTemplateEndEnvelope: SERV-999-approval-end
  expiryHours: 24`,
        },
        {
          title: "specific_approver (single approver)",
          content: `approval:
  required: true
  approvalRules:
    type: specific_approver
    specificApprover: department-head@mapua.edu.ph
  emailTemplateStartEnvelope: SERV-999-approval-start
  emailTemplateEndEnvelope: SERV-999-approval-end
  expiryHours: 0`,
        },
        {
          title: "complex (requiredApprovers AND atLeastOneOf)",
          content: `approval:
  required: true
  approvalRules:
    type: complex
    requiredApprovers:
      - coordinator1@mapua.edu.ph
      - coordinator2@mapua.edu.ph
    atLeastOneOf:
      - dean@mapua.edu.ph
      - registrar@mapua.edu.ph
  emailTemplateStartEnvelope: SERV-999-approval-start
  emailTemplateEndEnvelope: SERV-999-approval-end
  expiryHours: 96`,
        },
      ],
      fullContent: rawYAML,
    },
    {
      id: 5,
      title: "PAYMENT Envelope",
      description: "Collect payment before processing",
      learningGuides: [
        "PAYMENT PURPOSE: Collect payment before processing request",
        "CHARGE CALCULATION: amount × quantity = item total",
        "AMOUNT UNITS: Smallest currency unit (PHP 500 = ₱5.00)",
        "PAYMENT PROVIDERS: maya, stripe, gcash",
        "Charges array must be non-empty if required: true",
        "Each charge needs: item, amount (> 0), currency",
        "PAYMENT LINK: {{paymentLink}} substitution in email",
        "OPTIONAL: Can be skipped for free services with required: false",
      ],
      yamlContent: `payment:
  required: true
  paymentProvider: "maya"
  charges:
    - item: "Document Processing Fee"
      amount: 50000  # PHP 500.00
      currency: "PHP"
      quantity: 1
    - item: "Rush Processing"
      amount: 25000  # PHP 250.00
      currency: "PHP"
      quantity: 1
  expiryDays: 7
  emailTemplateStartEnvelope: "SERV-999-payment-start"
  emailTemplateEndEnvelope: "SERV-999-payment-end"`,
      fullContent: rawYAML,
    },
    {
      id: 6,
      title: "PROCESSING Envelope",
      description: "Execute backend API tasks sequentially",
      learningGuides: [
        "PROCESSING PURPOSE: Execute automatic backend tasks (API calls, integrations)",
        "TASK EXECUTION: SEQUENTIAL (one completes before next starts)",
        "HTTP METHODS: GET, POST, PUT, DELETE, PATCH",
        "SUBSTITUTION: {{parameterName}} replaced before each API call",
        "Each task has independent: timeout, retries, success codes",
        "stopOnFailure: Continue or halt pipeline on task failure",
        "TIMEOUT: Minimum 10 seconds (10000 milliseconds) recommended",
        "SUCCESS CODES: Array of valid HTTP status codes (e.g., [200, 201])",
      ],
      yamlContent: `processing:
  stopOnFailure: true
  tasks:
    - type: "api_call"
      name: "Send Document Request"
      method: "POST"
      url: "https://api.registrar.edu/documents"
      payload:
        studentId: "{{studentId}}"
        documentType: "{{documentType}}"
      timeout: 30000
      retries: 2
      successCodes: [200, 201]
  emailTemplateStartEnvelope: "SERV-999-processing-start"
  emailTemplateEndEnvelope: "SERV-999-processing-end"`,
      fullContent: rawYAML,
    },
    {
      id: 7,
      title: "DELIVERY Envelope",
      description: "Send documents via email, physical mail, or pickup",
      learningGuides: [
        "DELIVERY PURPOSE: Deliver processed documents to requestor",
        "DELIVERY METHODS: EMAIL, PHYSICAL_MAIL, PICKUP",
        "NEW ARCHITECTURE (May 29): Delivery details submitted separately via API",
        "API ENDPOINT: POST /api/delivery/{requestId}/details",
        "DELIVERY STATUS CODES:",
        "  0 = processing: Preparing document",
        "  1 = ready_to_deliver: Queued for shipment",
        "  2 = out_for_delivery: In transit",
        "  3 = delivered: Recipient received",
        "OPTIONAL: Can be completely empty if not needed with required: false",
        "Email delivery: Instant with attachments",
        "Physical mail: Courier delivery (LBC, JNT, DHL, etc.)",
        "Pickup: In-person at designated location",
      ],
      yamlContent: `delivery:
  required: true
  deliveryMethods:
    email:
      enabled: true
      subject: "Your {{documentType}} is ready"
      recipient: "{{email}}"
      attachmentUrls:
        - "https://storage.edu/documents/{{requestId}}.pdf"
    physical_mail:
      enabled: true
      carrier: "LBC"
      estimatedDays: 3
      costPercentage: 5
      requiresSignature: true
      trackingEnabled: true
    pickup:
      enabled: true
      location: "Office, 2nd Floor, Building A"
      hoursOfOperation: "Monday-Friday, 8AM-5PM"
  emailTemplateStartEnvelope: "SERV-999-delivery-start"
  emailTemplateEndEnvelope: "SERV-999-delivery-end"`,
      fullContent: rawYAML,
    },
    {
      id: 8,
      title: "FEEDBACK Envelope",
      description: "Collect user satisfaction feedback",
      learningGuides: [
        "FEEDBACK PURPOSE: Gather user satisfaction after delivery",
        "AUTO-CLOSE: Request auto-closes after N hours (optional)",
        "EXPIRY: Feedback link becomes inactive after N days",
        "REMINDERS: Optional email reminders before deadline",
        "AUTO-CLOSE vs EXPIRY:",
        "  - autoCloseAfterHours: Request marked complete after N hours",
        "  - expiryDays: Feedback link dies after N days",
        "  - Both can coexist (e.g., auto-close at 24h, expiry at 7 days)",
        "OPTIONAL: Can be skipped entirely with required: false",
        "Useful for: Services with followup calls or internal processes",
      ],
      yamlContent: `feedback:
  required: true
  autoCloseAfterHours: 24
  expiryDays: 7
  notificationRequired: true
  reminderDaysBefore: 3
  emailTemplateStartEnvelope: "SERV-999-feedback-start"
  emailTemplateEndEnvelope: "SERV-999-feedback-end"

# Example: Optional feedback (skip if not needed)
# feedback:
#   required: false`,
      fullContent: rawYAML,
    },
    {
      id: 9,
      title: "Email Template Naming",
      description: "Naming convention for email templates",
      learningGuides: [
        "PATTERN: SERV-{serviceId}-{envelopeType}-{phase}",
        "EXAMPLE: SERV-999-approval-start means:",
        "  SERV- = Service template prefix",
        "  999 = Service ID number",
        "  approval = Envelope type",
        "  start/end = Phase (when envelope begins/completes)",
        "EMAIL ENVELOPE TYPES: approval, payment, processing, delivery, feedback",
        "TEMPLATES STORED IN: MongoDB EmailTemplate collection",
        "SUBSTITUTION VARIABLES: {{requestId}}, {{firstName}}, {{email}}, {{approvalLink}}, etc.",
      ],
      yamlContent: `# Email Template ID Pattern
# SERV-{serviceId}-{envelopeType}-{phase}

Approval Emails:
  SERV-999-approval-start    → Email to APPROVERS
  SERV-999-approval-end      → Email to REQUESTOR

Payment Emails:
  SERV-999-payment-start     → Email to REQUESTOR (includes {{paymentLink}})
  SERV-999-payment-end       → Email to REQUESTOR

Processing Emails:
  SERV-999-processing-start  → Email to REQUESTOR
  SERV-999-processing-end    → Email to REQUESTOR

Delivery Emails:
  SERV-999-delivery-start    → Email to REQUESTOR
  SERV-999-delivery-end      → Email to REQUESTOR

Feedback Emails:
  SERV-999-feedback-start    → Email to REQUESTOR (includes {{feedbackLink}})
  SERV-999-feedback-end      → Email to REQUESTOR`,
      fullContent: rawYAML,
    },
    {
      id: 10,
      title: "Validation Rules",
      description: "Complete validation rules for all envelopes",
      learningGuides: [
        "SERVICE RULES: Unique serviceId, lowercase type, REQUEST always required",
        "REQUEST VALIDATION: Parameter types, constraints (min/max, pattern)",
        "APPROVAL VALIDATION: Rule types, approver emails, template existence",
        "PAYMENT VALIDATION: Charges, provider, amounts, template existence",
        "PROCESSING VALIDATION: Tasks, HTTP methods, URLs, timeouts, success codes",
        "DELIVERY VALIDATION: Methods enabled, email/mail/pickup config, templates",
        "FEEDBACK VALIDATION: Expiry (1-365 days), auto-close (>= 0 hours)",
        "OPTIONAL ENVELOPE RULE: Empty optional envelopes are VALID",
        "IMPORTANT: Backend must skip optional (required: false) envelopes",
      ],
      yamlContent: `# Validation Summary

REQUEST Envelope:
  ✓ ALWAYS required (cannot be optional)
  ✓ Must have at least one parameter
  ✓ All parameters must have type and description
  ✓ Constraints must be valid (e.g., minLength <= maxLength)

Optional Envelopes (APPROVAL, PAYMENT, PROCESSING, DELIVERY, FEEDBACK):
  ✓ Can have required: false
  ✓ Can be completely empty if required: false
  ✓ Backend skips processing if required: false
  ✓ No validation errors for empty optional envelopes

Email Templates:
  ✓ Must exist in MongoDB (if envelope is used)
  ✓ Follow naming pattern: SERV-###-type-phase
  ✓ Support {{variableName}} substitution

All Envelope Config:
  ✓ Must be valid YAML syntax
  ✓ All referenced parameters must exist in REQUEST
  ✓ Email addresses must be valid format`,
      fullContent: rawYAML,
    },
    {
      id: 11,
      title: "Template Variables",
      description: "Variable substitution reference",
      learningGuides: [
        "SUBSTITUTION FORMAT: Double curly braces {{variableName}}",
        "SUBSTITUTION TIMING: Happens at runtime BEFORE value is used",
        "UNKNOWN PARAMETERS: Replaced with empty string (no error)",
        "SYSTEM VARIABLES: Available in all envelopes",
        "CONTEXT-SPECIFIC VARIABLES: Only available in certain envelopes",
        "REQUEST PARAMETERS: Any parameter from request can be substituted",
      ],
      yamlContent: `# System Variables (Available Everywhere)
{{requestId}}              → Unique request identifier (REQ-2025-001)
{{currentTimestamp}}       → Current server time (ISO8601)

# Payment Envelope Only
{{totalAmount}}            → Total payment amount (in piso)
{{paymentLink}}            → Link to MAYA payment gateway

# Feedback Envelope Only
{{feedbackLink}}           → Link to feedback survey form

# Request Parameters (From user input)
{{firstName}}              → Parameter from request
{{email}}                  → Parameter from request
{{studentId}}              → Parameter from request
{{anyParameterName}}       → Any parameter defined in REQUEST

# Example Email Template
Subject: Document Request {{requestId}} - {{firstName}}
Body: Hi {{firstName}},
      Your request (ID: {{requestId}}) has been approved.
      Total cost: {{totalAmount}} PHP
      Please complete payment: {{paymentLink}}`,
      fullContent: rawYAML,
    },
  ];

  return sections;
}
