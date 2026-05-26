/**
 * Admin Learning Guide - Service Definition Rules
 * Interactive guide to help admins understand service definition structure
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Stack,
  Alert,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const ParameterTypesData = [
  {
    type: 'String',
    description: 'Text input',
    validation: 'minLength, maxLength, pattern (regex)',
    example: `firstName:
  type: String
  required: true
  description: "Student's first name"
  minLength: 2
  maxLength: 50`,
  },
  {
    type: 'Number',
    description: 'Numeric input',
    validation: 'min, max, step',
    example: `numberOfCopies:
  type: Number
  required: true
  description: "Number of copies needed"
  min: 1
  max: 10
  step: 1`,
  },
  {
    type: 'Boolean',
    description: 'Toggle/Checkbox',
    validation: 'default value only',
    example: `isUrgent:
  type: Boolean
  required: false
  description: "Mark as urgent"
  default: false`,
  },
  {
    type: 'Date',
    description: 'Date picker',
    validation: 'minDate, maxDate',
    example: `requestDate:
  type: Date
  required: true
  description: "Request submission date"
  minDate: "2025-01-01"
  maxDate: "2025-12-31"`,
  },
  {
    type: 'Dropdown',
    description: 'Single select from options',
    validation: 'options array required',
    example: `program:
  type: Dropdown
  required: true
  description: "Choose your program"
  options:
    - value: BSCS
      label: Bachelor of Science in Computer Science
    - value: BSIT
      label: Bachelor of Science in Information Technology`,
  },
  {
    type: 'Radio',
    description: 'Radio button group',
    validation: 'options array required',
    example: `deliveryMode:
  type: Radio
  required: true
  options:
    - value: email
      label: Email Delivery
    - value: pickup
      label: Pickup at Campus`,
  },
  {
    type: 'Checkboxes',
    description: 'Multiple select from options',
    validation: 'options array, maxSelections',
    example: `courses:
  type: Checkboxes
  required: true
  maxSelections: 5
  options:
    - value: CS101
      label: Intro to CS
    - value: CS102
      label: Data Structures`,
  },
];

const EnvelopeGuideData = [
  {
    title: 'Request Envelope',
    icon: '📋',
    description: 'Initial submission of the service request',
    purpose: 'Capture and validate user input parameters',
    required: 'parameters object with schema definitions',
    optional: 'none',
    emailTemplates: ['SERV-X-request-start', 'SERV-X-request-end'],
  },
  {
    title: 'Approval Envelope',
    icon: '✅',
    description: 'Review and approval by authorized personnel',
    purpose: 'Gate the request - ensure it meets approval criteria',
    required: 'approvalRules, requiredApprovers',
    optional: 'emailTemplateStartEnvelope, emailTemplateEndEnvelope',
    emailTemplates: ['SERV-X-approval-start', 'SERV-X-approval-end'],
  },
  {
    title: 'Payment Envelope',
    icon: '💳',
    description: 'Payment collection via MAYA gateway',
    purpose: 'Collect fees or charges from requestor',
    required: 'charges array with item, amount, currency',
    optional: 'paymentProvider (default: maya)',
    emailTemplates: ['SERV-X-payment-start', 'SERV-X-payment-end'],
  },
  {
    title: 'Processing Envelope',
    icon: '⚙️',
    description: 'Backend API task execution',
    purpose: 'Perform business logic and integrate with external systems',
    required: 'tasks array with API endpoints',
    optional: 'stopOnFailure (default: true), timeout, retries',
    emailTemplates: ['SERV-X-processing-start', 'SERV-X-processing-end'],
  },
  {
    title: 'Delivery Envelope',
    icon: '📦',
    description: 'Document/result delivery to requestor',
    purpose: 'Get deliverables to requestor via email, mail, or pickup',
    required: 'deliveryMethods array',
    optional: 'default delivery method',
    emailTemplates: ['SERV-X-delivery-start', 'SERV-X-delivery-end'],
  },
  {
    title: 'Feedback Envelope',
    icon: '⭐',
    description: 'Post-service feedback collection',
    purpose: 'Gather customer satisfaction and service quality data',
    required: 'required: true/false',
    optional: 'expiryDays (default: 30), surveyId',
    emailTemplates: ['SERV-X-feedback-start', 'SERV-X-feedback-end'],
  },
];

const CommonMistakesData = [
  {
    mistake: 'Parameter without type',
    wrong: `firstName:
  required: true
  description: "Name"`,
    right: `firstName:
  type: String
  required: true
  description: "Name"`,
    impact: '❌ Form generation will fail',
  },
  {
    mistake: 'Email template ID mismatch',
    wrong: `emailTemplateStartEnvelope: SERV-1-approval-start  # Template does not exist
emailTemplateEndEnvelope: my-custom-template`,
    right: `emailTemplateStartEnvelope: SERV-001-approval-start  # Template exists in MongoDB
emailTemplateEndEnvelope: SERV-001-approval-end`,
    impact: '⚠️ Email will not be sent, request stuck in pending',
  },
  {
    mistake: 'Invalid parameter substitution',
    wrong: `url: "https://api.example.com/enroll?student={studentId}"  # Wrong bracket`,
    right: `url: "https://api.example.com/enroll?student={{studentId}}"  # Double curly braces`,
    impact: '❌ API call will fail, parameter not substituted',
  },
  {
    mistake: 'Missing required approval fields',
    wrong: `approval:
  requiresApproval: true
  # Missing approvalRules and requiredApprovers`,
    right: `approval:
  requiresApproval: true
  approvalRules:
    type: all_must_approve
  requiredApprovers:
    - approver@example.com`,
    impact: '⚠️ Request will be stuck, approval cannot proceed',
  },
];

export const AdminLearningGuide: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box sx={{ width: '100%', textAlign: 'left' }}>
      {/* Header */}
      <Box sx={{ mb: 3, pl: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ textAlign: 'left' }}>
          Service Definition Learning Guide
        </Typography>
        <Typography color="textSecondary" sx={{ textAlign: 'left' }}>
          Learn how to create and structure service definitions for the Service Envelope system
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_e, newValue) => setTabValue(newValue)}>
          <Tab label="Parameter Types" />
          <Tab label="Envelope Guide" />
          <Tab label="Common Mistakes" />
          <Tab label="Quick Reference" />
        </Tabs>
      </Box>

      {/* Tab 1: Parameter Types */}
      <TabPanel value={tabValue} index={0}>
        <Stack spacing={3}>
          <Alert severity="info" icon={<InfoIcon />}>
            All parameters in the Request Envelope must have a <code>type</code> field and optional{' '}
            <code>required</code>, <code>description</code>, and validation constraints.
          </Alert>

          <Stack spacing={2}>
            {ParameterTypesData.map((param) => (
              <Card key={param.type}>
                  <CardContent sx={{ textAlign: 'left' }}>
                    <Typography variant="h6" gutterBottom sx={{ textAlign: 'left' }}>
                      {param.type}
                    </Typography>
                    <Typography color="textSecondary" variant="body2" gutterBottom sx={{ textAlign: 'left' }}>
                      {param.description}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, mb: 2, textAlign: 'left' }}>
                      <strong>Validation:</strong> {param.validation}
                    </Typography>
                    <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', textAlign: 'left' }}>
                      <code style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{param.example}</code>
                    </Paper>
                  </CardContent>
                </Card>
              ))}
            </Stack>
        </Stack>
      </TabPanel>

      {/* Tab 2: Envelope Guide */}
      <TabPanel value={tabValue} index={1}>
        <Stack spacing={2}>
          <Alert severity="info" icon={<InfoIcon />}>
            Services follow a 6-envelope pipeline. Each envelope has specific requirements and optional features.
          </Alert>

          {EnvelopeGuideData.map((envelope) => (
            <Card key={envelope.title}>
              <CardContent sx={{ textAlign: 'left' }}>
                <Typography variant="h6" gutterBottom sx={{ textAlign: 'left' }}>
                  {envelope.icon} {envelope.title}
                </Typography>
                <Typography color="textSecondary" variant="body2" gutterBottom sx={{ textAlign: 'left' }}>
                  {envelope.description}
                </Typography>

                <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, textAlign: 'left' }}>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, textAlign: 'left' }}>
                      Purpose
                    </Typography>
                    <Typography variant="body2" sx={{ textAlign: 'left' }}>{envelope.purpose}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, textAlign: 'left' }}>
                      Required Fields
                    </Typography>
                    <Typography variant="body2" sx={{ textAlign: 'left' }}>{envelope.required}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, textAlign: 'left' }}>
                      Optional Fields
                    </Typography>
                    <Typography variant="body2" sx={{ textAlign: 'left' }}>{envelope.optional}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, textAlign: 'left' }}>
                      Email Templates
                    </Typography>
                    {envelope.emailTemplates.map((template) => (
                      <Chip
                        key={template}
                        label={template}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mt: 0.5 }}
                      />
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </TabPanel>

      {/* Tab 3: Common Mistakes */}
      <TabPanel value={tabValue} index={2}>
        <Stack spacing={2}>
          <Alert severity="warning" icon={<WarningIcon />}>
            Avoid these common mistakes that cause service definitions to fail or behave unexpectedly.
          </Alert>

          {CommonMistakesData.map((mistake, idx) => (
            <Accordion key={idx}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <WarningIcon sx={{ mr: 2, color: 'warning.main' }} />
                <Typography>{mistake.mistake}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="subtitle2" color="error" gutterBottom sx={{ textAlign: 'left' }}>
                      ❌ Wrong:
                    </Typography>
                    <Paper sx={{ p: 2, backgroundColor: '#ffebee', textAlign: 'left' }}>
                      <code style={{ fontSize: 12, whiteSpace: 'pre-wrap', display: 'block' }}>
                        {mistake.wrong}
                      </code>
                    </Paper>
                  </Box>

                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="subtitle2" color="success.main" gutterBottom sx={{ textAlign: 'left' }}>
                      ✅ Correct:
                    </Typography>
                    <Paper sx={{ p: 2, backgroundColor: '#e8f5e9', textAlign: 'left' }}>
                      <code style={{ fontSize: 12, whiteSpace: 'pre-wrap', display: 'block' }}>
                        {mistake.right}
                      </code>
                    </Paper>
                  </Box>

                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="caption" color="textSecondary" sx={{ textAlign: 'left' }}>
                      <strong>Impact:</strong> {mistake.impact}
                    </Typography>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </TabPanel>

      {/* Tab 4: Quick Reference */}
      <TabPanel value={tabValue} index={3}>
        <Stack spacing={3}>
          <Card>
            <CardContent sx={{ textAlign: 'left' }}>
              <Typography variant="h6" gutterBottom sx={{ textAlign: 'left' }}>
                Service Definition Structure
              </Typography>
              <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', overflow: 'auto', textAlign: 'left' }}>
                <code style={{ fontSize: 11, whiteSpace: 'pre', display: 'block' }}>
{`serviceId: "SERVICE-001"
type: "transcript-of-records"
name: "Transcript of Records"
description: "Official transcript request"

envelopes:
  request:
    parameters:
      firstName:
        type: String
        required: true

  approval:
    requiresApproval: true
    approvalRules:
      type: all_must_approve
    requiredApprovers:
      - approver@example.com

  payment:
    required: true
    charges:
      - item: "Transcript Copy"
        amount: 50000
        currency: PHP

  processing:
    tasks:
      - type: api_call
        method: POST
        url: "https://api.example.com/..."

  delivery:
    methods:
      - type: email
        recipient: "{{email}}"

  feedback:
    required: true
    expiryDays: 30`}
                </code>
              </Paper>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ textAlign: 'left' }}>
              <Typography variant="h6" gutterBottom sx={{ textAlign: 'left' }}>
                Email Template Naming Convention
              </Typography>
              <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', textAlign: 'left' }}>
                <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace', whiteSpace: 'pre', textAlign: 'left' }}>
{`SERV-{serviceNumber}-{envelopeType}-{phase}

Examples:
  SERV-001-request-start    (Request envelope starts)
  SERV-001-approval-start   (Approval notification to approvers)
  SERV-001-approval-end     (Approval complete to requestor)
  SERV-001-payment-start    (Payment request email)
  SERV-001-payment-end      (Payment confirmation)
  SERV-001-processing-start (Processing started notification)
  SERV-001-delivery-start   (Document ready for delivery)
  SERV-001-feedback-start   (Feedback survey link)`}
                </Typography>
              </Paper>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ textAlign: 'left' }}>
              <Typography variant="h6" gutterBottom sx={{ textAlign: 'left' }}>
                Template Variable Categories
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CodeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="System Variables"
                    secondary="{{requestId}}, {{currentTimestamp}}, {{frontendBaseUrl}}"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CodeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Request Parameters"
                    secondary="{{firstName}}, {{lastName}}, {{email}}, or any custom parameter"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CodeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Envelope-Specific"
                    secondary="{{approvalLink}}, {{paymentLink}}, {{feedbackLink}}, {{trackingNumber}}"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Alert severity="success">
            <strong>Pro Tip:</strong> Use the Email Template Manager to create and test templates with live preview
            before publishing your service definition.
          </Alert>
        </Stack>
      </TabPanel>
    </Box>
  );
};
