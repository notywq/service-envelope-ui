/**
 * Documentation Parser
 * Provides schema 1.0.5 learning sections for the interactive documentation page.
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

const rawYAML = `# SERVICE DEFINITION RULES - Complete Technical Blueprint v2.1
# ALIGNED WITH: Service Definition Schema v1.0.5 (June 24, 2026)
#
# Requester flows use bearer auth from email OTP login.
# New service definitions should include a canonical email parameter.
# Template IDs in YAML are optional overrides; Mongo generic templates provide fallback.
#
# Email template resolution:
# 1. Service YAML override: emailTemplateStartEnvelope / emailTemplateEndEnvelope
# 2. Service YAML default: defaultEmailTemplateStartEnvelope / defaultEmailTemplateEndEnvelope
# 3. Service generic template: {serviceType}-{envelope}-{phase}
# 4. Global generic template: {envelope}-{phase}`;

const serviceSkeleton = `id: SERV-001
type: transcript-of-records
name: Transcript of Records
description: Official transcript request

envelopes:
  request:
    required: true
    parameters:
      email:
        type: String
        required: true
        description: "Requester email address"
        pattern: "^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$"
      firstName:
        type: String
        required: true
        description: "Requester first name"
    defaultEmailTemplateStartEnvelope: request-start
    defaultEmailTemplateEndEnvelope: request-end

  approval:
    required: true
    approvalRules:
      type: all_must_approve
      requiredApprovers:
        - registrar@mapua.edu.ph
        - dean@mapua.edu.ph
    defaultEmailTemplateStartEnvelope: approval-start
    defaultEmailTemplateEndEnvelope: approval-end
    defaultEmailTemplateCancelEnvelope: request-denied

  payment:
    required: true
    charges:
      - item: "Transcript Copy"
        amount: 50000
        currency: PHP
    defaultEmailTemplateStartEnvelope: payment-start
    defaultEmailTemplateEndEnvelope: payment-end

  processing:
    required: true
    stopOnFailure: true
    tasks:
      - type: api_call
        name: send_request
        method: POST
        url: "https://api.example.com/documents"
        timeout: 30000
        retries: 1
        successCodes: [200, 201]
    defaultEmailTemplateStartEnvelope: processing-start
    defaultEmailTemplateEndEnvelope: processing-end
    defaultEmailTemplateCancelEnvelope: request-cancelled

  delivery:
    required: true
    deliveryMethods:
      email:
        enabled: true
        recipient: "{{email}}"
    defaultEmailTemplateStartEnvelope: delivery-email-document
    defaultEmailTemplateEndEnvelope: delivery-end

  feedback:
    required: false`;

export function parseDocumentation(): DocumentationSection[] {
  return [
    {
      id: 0,
      title: 'Introduction',
      description: 'Schema 1.0.5 overview and runtime assumptions',
      learningGuides: [
        'Service definitions follow the 6-envelope pipeline: request, approval, payment, processing, delivery, feedback.',
        'Only the request envelope is mandatory; optional envelopes may be just required: false.',
        'When auth is enabled, protected API calls use Authorization: Bearer <accessToken> from OTP login.',
        'New request forms should prefer the canonical email parameter.',
      ],
      yamlContent: '',
      fullContent: rawYAML,
    },
    {
      id: 1,
      title: 'Service Metadata',
      description: 'Core service identification fields',
      learningGuides: [
        'Use id for the service identifier. Legacy serviceId can still be accepted by the backend, but id is preferred.',
        'Use lowercase hyphenated type values because generic templates use service type in fallback keys.',
        'name and description are shown in the UI.',
      ],
      yamlContent: `id: SERV-999
type: comprehensive-student-document
name: Comprehensive Student Document Service
description: "Request and process comprehensive student documents"`,
      fullContent: rawYAML,
    },
    {
      id: 2,
      title: 'REQUEST Envelope',
      description: 'Collect user parameters and requester identity',
      learningGuides: [
        'REQUEST is always required.',
        'Requester accounts may submit only when the submitted email matches the bearer user email.',
        'Supported parameter types: String, Number, Boolean, Date, Dropdown, Radio, Checkboxes.',
        'Delivery method/details are submitted later through POST /api/delivery/{requestId}/details.',
      ],
      yamlContent: `request:
  required: true
  parameters:
    email:
      type: String
      required: true
      description: "Requester email address"
      pattern: "^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$"
    documentType:
      type: Dropdown
      required: true
      description: "Type of document needed"
      options:
        - label: "Transcript of Records"
          value: "tor"
        - label: "Diploma Copy"
          value: "diploma"`,
      fullContent: rawYAML,
    },
    {
      id: 3,
      title: 'APPROVAL Envelope',
      description: 'Authorization workflow with rule-aware denial behavior',
      learningGuides: [
        'Rule types: all_must_approve, any_one, specific_approver, complex.',
        'Denial behavior is rule-aware: one denial fails all_must_approve and specific_approver, but any_one can continue while another approver can approve.',
        'Use defaultEmailTemplateCancelEnvelope for denial/cancellation fallback.',
      ],
      yamlContent: `approval:
  required: true
  approvalRules:
    type: complex
    requiredApprovers:
      - registrar@mapua.edu.ph
    atLeastOneOf:
      - dean@mapua.edu.ph
      - department-chair@mapua.edu.ph
  expiryHours: 48
  defaultEmailTemplateStartEnvelope: approval-start
  defaultEmailTemplateEndEnvelope: approval-end
  defaultEmailTemplateCancelEnvelope: request-denied`,
      fullContent: rawYAML,
    },
    {
      id: 4,
      title: 'PAYMENT Envelope',
      description: 'Payment collection and editable receipt email',
      learningGuides: [
        'Payment completion email is orchestrator/template-driven, not hardcoded by the payment endpoint.',
        'Use payment.emailTemplateEndEnvelope for a service-specific receipt override or defaultEmailTemplateEndEnvelope: payment-end.',
        'Payment templates can use transactionId, paymentAmount, paymentMethod, paymentReference, and paymentTimestamp.',
      ],
      yamlContent: `payment:
  required: true
  paymentProvider: maya
  charges:
    - item: "Document Processing Fee"
      amount: 50000
      currency: PHP
      quantity: 1
  expiryDays: 7
  defaultEmailTemplateStartEnvelope: payment-start
  defaultEmailTemplateEndEnvelope: payment-end`,
      fullContent: rawYAML,
    },
    {
      id: 5,
      title: 'PROCESSING Envelope',
      description: 'Sequential API tasks with failure behavior',
      learningGuides: [
        'Tasks run sequentially.',
        'If stopOnFailure is true, a failed task fails the envelope and cancels the request path.',
        'If stopOnFailure is false, failed tasks can be skipped according to processor behavior.',
      ],
      yamlContent: `processing:
  required: true
  stopOnFailure: true
  tasks:
    - type: api_call
      name: "Send Document Request"
      method: POST
      url: "https://api.registrar.edu/documents"
      payload:
        email: "{{email}}"
        documentType: "{{documentType}}"
      timeout: 30000
      retries: 2
      successCodes: [200, 201]
  defaultEmailTemplateStartEnvelope: processing-start
  defaultEmailTemplateEndEnvelope: processing-end
  defaultEmailTemplateCancelEnvelope: request-cancelled`,
      fullContent: rawYAML,
    },
    {
      id: 6,
      title: 'DELIVERY Envelope',
      description: 'Email, courier, or pickup delivery',
      learningGuides: [
        'Delivery details are submitted after request creation.',
        'Email delivery may use delivery-email-document generic fallback.',
        'Pickup notification may use delivery-pickup-ready generic fallback.',
      ],
      yamlContent: `delivery:
  required: true
  deliveryMethods:
    email:
      enabled: true
      recipient: "{{email}}"
      attachmentUrls:
        - "https://storage.edu/documents/{{requestId}}.pdf"
    pickup:
      enabled: true
      location: "Registrar Office"
      hoursOfOperation: "Monday-Friday, 8AM-5PM"
  defaultEmailTemplateStartEnvelope: delivery-email-document
  defaultEmailTemplateEndEnvelope: delivery-end`,
      fullContent: rawYAML,
    },
    {
      id: 7,
      title: 'FEEDBACK Envelope',
      description: 'Optional post-completion survey',
      learningGuides: [
        'Feedback can be skipped with required: false.',
        'autoCloseAfterHours controls when the request can be marked complete.',
        'expiryDays controls how long the feedback token remains valid.',
      ],
      yamlContent: `feedback:
  required: true
  autoCloseAfterHours: 24
  expiryDays: 7
  notificationRequired: true
  reminderDaysBefore: 3
  defaultEmailTemplateStartEnvelope: feedback-start
  defaultEmailTemplateEndEnvelope: feedback-end`,
      fullContent: rawYAML,
    },
    {
      id: 8,
      title: 'Email Templates',
      description: 'Override/default/generic fallback resolution',
      learningGuides: [
        'Service YAML override: emailTemplateStartEnvelope, emailTemplateEndEnvelope, emailTemplateCancelEnvelope.',
        'Service YAML default: defaultEmailTemplateStartEnvelope, defaultEmailTemplateEndEnvelope, defaultEmailTemplateCancelEnvelope.',
        'Generic fallbacks use service-scoped keys and global keys.',
        'OTP emails use otp-login or auth-otp and support otpCode/code plus expiry variables.',
      ],
      yamlContent: `# Resolution order
1. emailTemplateStartEnvelope / emailTemplateEndEnvelope
2. defaultEmailTemplateStartEnvelope / defaultEmailTemplateEndEnvelope
3. {serviceType}-{envelope}-{phase}
4. {envelope}-{phase}

# Generic template keys
approval-start
request-denied
payment-end
delivery-email-document
delivery-pickup-ready
otp-login`,
      fullContent: rawYAML,
    },
    {
      id: 9,
      title: 'Complete Example',
      description: 'A validator-friendly starter service',
      learningGuides: [
        'Copy this as a starting point for schema 1.0.5 services.',
        'Replace id, type, approvers, charges, and processing URLs before saving.',
        'Use service-specific emailTemplate* fields only when you need to override generic templates.',
      ],
      yamlContent: serviceSkeleton,
      fullContent: rawYAML,
    },
  ];
}
