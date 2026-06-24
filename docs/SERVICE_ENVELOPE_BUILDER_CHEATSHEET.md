# Service Envelope Builder Cheatsheet

Schema target: `1.0.5`

## Core Shape

```yaml
id: SERV-001
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
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"

  approval:
    required: false
  payment:
    required: false
  processing:
    required: false
  delivery:
    required: false
  feedback:
    required: false
```

## Request Parameters

Use typed parameter objects. New services should include canonical `email`; requester accounts can submit only for their own bearer-token email.

```yaml
request:
  required: true
  parameters:
    studentId:
      type: String
      required: true
      description: "Student ID"
      minLength: 8
      maxLength: 15
    email:
      type: String
      required: true
      description: "Requester email address"
    copies:
      type: Number
      required: true
      min: 1
      max: 10
      step: 1
    documentType:
      type: Dropdown
      required: true
      options:
        - label: "Transcript"
          value: "transcript"
        - label: "Diploma Copy"
          value: "diploma-copy"
    requestedDate:
      type: Date
      required: false
      format: YYYY-MM-DD
```

## Template Resolution

Service template fields are optional overrides. Generic Mongo templates keep required system emails working.

Resolution order:

1. YAML override: `emailTemplateStartEnvelope`, `emailTemplateEndEnvelope`, `emailTemplateCancelEnvelope`
2. YAML default: `defaultEmailTemplateStartEnvelope`, `defaultEmailTemplateEndEnvelope`, `defaultEmailTemplateCancelEnvelope`
3. Service generic: `{serviceType}-{envelope}-{phase}`
4. Global generic: `{envelope}-{phase}`

Useful generic keys:

```text
approval-start
approval-end
request-denied
request-cancelled
payment-start
payment-end
processing-start
processing-end
delivery-email-document
delivery-pickup-ready
feedback-start
feedback-end
otp-login
```

## Complete Working Example

```yaml
id: SERV-101
type: transcript-of-records
name: Transcript of Records
description: Request an official academic transcript

envelopes:
  request:
    required: true
    parameters:
      email:
        type: String
        required: true
        description: "Requester email address"
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
      studentId:
        type: String
        required: true
        description: "Student ID"
      numberOfCopies:
        type: Number
        required: true
        min: 1
        max: 10
        step: 1
    defaultEmailTemplateStartEnvelope: request-start
    defaultEmailTemplateEndEnvelope: request-end

  approval:
    required: true
    approvalRules:
      type: complex
      requiredApprovers:
        - records@mapua.edu.ph
      atLeastOneOf:
        - registrar@mapua.edu.ph
        - dean@mapua.edu.ph
    expiryHours: 48
    defaultEmailTemplateStartEnvelope: approval-start
    defaultEmailTemplateEndEnvelope: approval-end
    defaultEmailTemplateCancelEnvelope: request-denied

  payment:
    required: true
    paymentProvider: maya
    charges:
      - item: "Processing Fee"
        amount: 50000
        currency: PHP
        quantity: 1
    defaultEmailTemplateStartEnvelope: payment-start
    defaultEmailTemplateEndEnvelope: payment-end

  processing:
    required: true
    stopOnFailure: true
    tasks:
      - type: api_call
        name: verify_student
        method: POST
        url: "https://api.example.com/students/verify"
        payload:
          studentId: "{{studentId}}"
          requestId: "{{requestId}}"
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
        attachmentUrls:
          - "https://storage.example.com/{{requestId}}.pdf"
      pickup:
        enabled: true
        location: "Registrar Office"
        hoursOfOperation: "Monday-Friday, 8AM-5PM"
    defaultEmailTemplateStartEnvelope: delivery-email-document
    defaultEmailTemplateEndEnvelope: delivery-end

  feedback:
    required: false
```

## Auth Notes

The web UI uses email OTP login:

- `POST /api/OTP/send`
- `POST /api/OTP/verify`
- protected calls include `Authorization: Bearer <accessToken>`

Role summary:

- `requester`: submit requests and view owned request details/history
- `admin`: manage services, schema tools, templates, requests
- `super_admin`: full admin plus OTP user/role CRUD
- `orchestrator`: internal/system operational role
