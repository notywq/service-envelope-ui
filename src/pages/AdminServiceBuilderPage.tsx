/**
 * Admin Service Builder Page
 * Allows admins to create new service definitions using YAML
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Typography,
  Stack,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Save as SaveIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import YAML from 'js-yaml';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { EmailTemplateManager } from '../components/EmailTemplateManager';

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

export const AdminServiceBuilderPage: React.FC = () => {
  const { addNotification } = useNotification();

  const [tabValue, setTabValue] = useState(0);
  const [serviceName, setServiceName] = useState('');
  const [yamlContent, setYamlContent] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [parsedYaml, setParsedYaml] = useState<any>(null);
  const [isValid, setIsValid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoadingServices(true);
        const response = await api.getServices();
        setServices(response.services || []);
      } catch (err) {
        addNotification('Failed to load services', 'error');
      } finally {
        setLoadingServices(false);
      }
    };
    
    const loadEmailTemplates = async () => {
      try {
        const response = await api.getEmailTemplates();
        setEmailTemplates(response.templates || []);
      } catch (err) {
        console.error('Failed to load email templates:', err);
      }
    };
    
    loadServices();
    loadEmailTemplates();
  }, []);

  const validateAndParse = (yaml: string) => {
    const errors: string[] = [];

    try {
      const parsed = YAML.load(yaml) as any;
      setParsedYaml(parsed);

      // Validate required fields
      if (!parsed.type) errors.push('Missing required field: "type"');
      if (!parsed.initiator) errors.push('Missing required field: "initiator"');
      if (!parsed.envelopes) errors.push('Missing required field: "envelopes"');

      // Validate envelope structure
      if (parsed.envelopes) {
        const requiredEnvelopes = ['request', 'approval', 'payment', 'processing', 'delivery', 'feedback'];
        for (const envelope of requiredEnvelopes) {
          if (!(envelope in parsed.envelopes)) {
            errors.push(`Missing envelope: "${envelope}"`);
          }
        }

        // Validate envelope properties
        for (const [envName, env] of Object.entries(parsed.envelopes)) {
          if (!env || typeof env !== 'object') {
            errors.push(`Envelope "${envName}" is invalid`);
          }
        }

        // Validate email template references in delivery envelope
        if (parsed.envelopes.delivery && parsed.envelopes.delivery.details?.templateId) {
          const templateId = parsed.envelopes.delivery.details.templateId;
          const templateExists = emailTemplates.some(t => t.id === templateId);
          if (!templateExists) {
            errors.push(`Referenced email template "${templateId}" does not exist. Please create it in the Email Templates tab first.`);
          }
        }
      }

      setValidationErrors(errors);
      setIsValid(errors.length === 0);
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid YAML syntax';
      setValidationErrors([errorMsg]);
      setIsValid(false);
      setParsedYaml(null);
    }
  };

  const handleYamlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setYamlContent(content);
    if (content.trim()) {
      validateAndParse(content);
    } else {
      setValidationErrors([]);
      setIsValid(false);
      setParsedYaml(null);
    }
  };

  const handleSaveService = async () => {
    if (!serviceName.trim()) {
      addNotification('Please enter a service name', 'error');
      return;
    }

    if (!isValid || !parsedYaml) {
      addNotification('YAML validation failed. Please fix errors before saving', 'error');
      return;
    }

    setSaving(true);
    try {
      if (isEditingExisting && selectedServiceId) {
        await api.updateService(selectedServiceId, {
          name: serviceName,
          yaml: yamlContent,
          type: parsedYaml.type,
          initiator: parsedYaml.initiator,
        });
        addNotification(`Service "${serviceName}" updated successfully!`, 'success');
      } else {
        await api.createService({
          name: serviceName,
          yaml: yamlContent,
          type: parsedYaml.type,
          initiator: parsedYaml.initiator,
        });
        addNotification(`Service "${serviceName}" created successfully!`, 'success');
      }
      setServiceName('');
      setYamlContent('');
      setParsedYaml(null);
      setValidationErrors([]);
      setSelectedServiceId('');
      setIsEditingExisting(false);
    } catch (err: any) {
      addNotification(
        err.response?.data?.error || 'Failed to save service',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLoadService = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setSelectedServiceId(serviceId);
      setServiceName(service.name);
      setYamlContent(service.yaml);
      validateAndParse(service.yaml);
      setIsEditingExisting(true);
    }
  };

  const handleCreateNew = () => {
    setServiceName('');
    setYamlContent('');
    setParsedYaml(null);
    setValidationErrors([]);
    setSelectedServiceId('');
    setIsEditingExisting(false);
  };

  const loadTemplate = (template: string) => {
    setYamlContent(template);
    validateAndParse(template);
  };

  const basicTemplate = `# Service Definition Template
# Service metadata
id: SERV-X-04152026
name: Service Name
description: Brief description of what this service does
type: service-type-identifier
initiator: admin_portal

# All 6 envelopes are required
envelopes:
  request:
    required: true
    parameters:
      # Define custom parameters needed for this service
      # Use key-value pairs (not arrays!)
      studentId: ""
      courseCode: ""
      startDate: ""
  
  approval:
    required: true
    approvers:
      - id: registrar
        role: Registrar
        status: pending
    approvalRules:
      type: all_must_approve

  payment:
    required: true
    charges:
      - item: "Service Fee"
        amount: 500.00
        currency: PHP
    paymentMethod: credit_card

  processing:
    required: true
    tasks:
      - name: validate_request
        description: Validate incoming request
      - name: process_business_logic
        description: Execute business logic
      - name: update_database
        description: Update system records

  delivery:
    required: true
    method: email
    details:
      # Reference an email template created in the Email Templates tab
      subject: "Request Status Update"
      templateId: request-notification  # Must exist in Email Templates tab!
      # Variables in the template will be auto-filled with request data
      # e.g., {{studentName}}, {{requestId}}, {{status}}, etc.

  feedback:
    required: true
    autoCloseOnExpiry: "7 days"`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Service Builder
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Create new service definitions using YAML format
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Builder" />
          <Tab label="YAML Structure Guide" />
          <Tab label="Envelope Guide" />
          <Tab label="Examples" />
          <Tab label="Email Templates" />
        </Tabs>

        {/* Builder Tab */}
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={3} sx={{ p: 3 }}>
            {/* Load Existing Service */}
            {!loadingServices && services.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Load Existing Service
                </Typography>
                <Stack spacing={2} sx={{ mb: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="service-select-label">Service</InputLabel>
                    <Select
                      labelId="service-select-label"
                      value={selectedServiceId}
                      onChange={(e) => handleLoadService(e.target.value)}
                      label="Service"
                    >
                      <MenuItem value="">-- Create New Service --</MenuItem>
                      {services.map((service) => (
                        <MenuItem key={service.id} value={service.id}>
                          {service.name} ({service.type})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {isEditingExisting && (
                    <Button variant="outlined" onClick={handleCreateNew} size="small">
                      Create New Service
                    </Button>
                  )}
                </Stack>
              </Box>
            )}

            {loadingServices && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Service Name */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Service Name *
              </Typography>
              <TextField
                fullWidth
                placeholder="e.g., Request New ID"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                disabled={saving}
                size="small"
              />
              <Typography variant="caption" color="textSecondary">
                Human-readable name for the service
              </Typography>
            </Box>

            {/* YAML Editor */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                YAML Definition *
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={20}
                value={yamlContent}
                onChange={handleYamlChange}
                placeholder="Paste or edit your YAML service definition..."
                disabled={saving}
                sx={{
                  fontFamily: 'Courier New, Courier, monospace',
                  fontSize: '0.85rem',
                  backgroundColor: '#f5f5f5',
                  '& .MuiInputBase-input': {
                    textAlign: 'left',
                    whiteSpace: 'pre',
                  },
                }}
              />
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => loadTemplate(basicTemplate)}
                >
                  Load Basic Template
                </Button>
              </Box>
            </Box>

            {/* Validation Results */}
            {yamlContent && (
              <Box>
                {isValid ? (
                  <Alert icon={<CheckIcon />} severity="success">
                    ✓ YAML is valid and ready to save
                  </Alert>
                ) : (
                  <Alert icon={<ErrorIcon />} severity="error">
                    <Stack spacing={1}>
                      <Typography variant="subtitle2">Validation Errors:</Typography>
                      <Stack component="ul" spacing={0.5}>
                        {validationErrors.map((error, idx) => (
                          <Typography component="li" key={idx} variant="body2">
                            {error}
                          </Typography>
                        ))}
                      </Stack>
                    </Stack>
                  </Alert>
                )}
              </Box>
            )}

            {/* Parsed YAML Preview */}
            {parsedYaml && isValid && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Parsed Service Configuration
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    backgroundColor: '#fafafa',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    maxHeight: 300,
                    overflow: 'auto',
                    textAlign: 'left',
                  }}
                >
                  <pre style={{ margin: 0, textAlign: 'left' }}>{JSON.stringify(parsedYaml, null, 2)}</pre>
                </Paper>
              </Box>
            )}

            {/* Save Button */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSaveService}
                disabled={!isValid || !serviceName.trim() || saving}
                size="large"
              >
                {saving ? 'Saving...' : isEditingExisting ? 'Update Service' : 'Create Service'}
              </Button>
            </Box>
          </Stack>
        </TabPanel>

        {/* YAML Structure Guide */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              YAML Service Definition Structure
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#f5f5f5', textAlign: 'left' }}>
              <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem', textAlign: 'left', margin: 0 }}>
{`id: SERV-X-04152026                       # Unique service identifier with date
name: Service Name                          # Human-readable service name
description: What this service does         # Brief description
type: unique-service-type                   # Service type identifier
initiator: admin_portal|student_portal|etc  # System initiating requests

envelopes:                                   # Required: All 6 envelopes
  request:                                   # Incoming request configuration
    required: true
    parameters:                              # Custom parameters for your service
      fieldName: ""                          # Key-value pairs (not array!)
      anotherField: ""
      thirdField: ""
  
  approval:                                  # Approval workflow
    required: true|false
    approvers:
      - id: identifier
        role: role-name
        status: pending
    approvalRules:
      type: all_must_approve|any_one
  
  payment:                                   # Payment processing
    required: true|false
    charges:
      - item: "Charge description"
        amount: 500.00
        currency: PHP
    paymentMethod: credit_card
  
  processing:                                # Business logic tasks
    required: true|false
    tasks:
      - name: task-name
        description: What this task does
      - name: another-task
        description: Another task
  
  delivery:                                  # Result delivery
    required: true|false
    method: email|sms|webhook
    details:
      subject: "Email subject line"
      templateId: template-identifier
  
  feedback:                                  # User feedback collection
    required: true|false
    autoCloseOnExpiry: "7 days"`}
              </Typography>
            </Paper>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Key Fields Explained:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="id"
                    secondary="Unique identifier (e.g., 'SERV-1-04152026')"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="name"
                    secondary="Human-readable service name (e.g., 'Course Enrollment')"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="type"
                    secondary="Unique code for this service (e.g., 'courseEnrollment')"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="initiator"
                    secondary="The system/portal that initiates requests (e.g., 'admin_portal')"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="parameters"
                    secondary="Custom fields needed as key-value pairs: {studentId: '', courseCode: '', ...}"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="approvers"
                    secondary="Who needs to approve this service request with their roles"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="charges"
                    secondary="Any payments required (item, amount, currency)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="tasks"
                    secondary="Processing steps to execute in sequence"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="templateId (Delivery Envelope)"
                    secondary="Reference an email template here. Must exist in Email Templates tab. Use format: 'template-identifier'. The template's {{variables}} will be auto-filled from request parameters."
                  />
                </ListItem>
              </List>
            </Box>

            <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#e8f5e9' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                📧 Using Email Templates in Delivery Envelope
              </Typography>
              <Stack spacing={1}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Step 1: Create an Email Template
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    Go to the "Email Templates" tab and create a new template. Use `{'{{variableName}}'}`{''} syntax in the HTML body for dynamic content (e.g., `{'{{studentName}}'}`{''}, `{'{{requestId}}'}`{''}, `{'{{status}}'}`{''}).
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Step 2: Reference in Delivery Envelope
                  </Typography>
                  <Typography component="div" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', backgroundColor: '#f5f5f5', p: 1, borderRadius: 0.5, my: 0.5 }}>
                    {`delivery:\n  required: true\n  method: email\n  details:\n    subject: "Request Status"\n    templateId: enrollment_confirmation`}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Step 3: Ensure Request Parameters Match Template Variables
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    If your template has `{'{{studentName}}'}`{''}, add a "studentName" parameter in the request envelope. Variables are auto-matched and populated when the email is sent.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    💡 Pro Tip:
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block' }}>
                    You can update email templates anytime without redeploying your service. Just go to Email Templates tab, edit the template, and save. Next email will use the updated template.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </TabPanel>

        {/* Envelope Guide */}
        <TabPanel value={tabValue} index={2}>
          <Stack spacing={3} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Understanding Each Envelope
            </Typography>

            {[
              {
                name: '📋 Request Envelope',
                description: 'Captures incoming request data and validates it',
                key: 'request',
                uses: [
                  'Define what parameters your service needs',
                  'Configure initial validation rules',
                  'Specify the source system',
                ],
              },
              {
                name: '✓ Approval Envelope',
                description: 'Routes requests for human approval',
                key: 'approval',
                uses: [
                  'Define approvers (roles and users)',
                  'Set approval rules (all must approve or any can approve)',
                  'Specify approval conditions',
                ],
              },
              {
                name: '💰 Payment Envelope',
                description: 'Handles financial transactions',
                key: 'payment',
                uses: [
                  'List charges/fees required',
                  'Specify payment methods',
                  'Set payment conditions',
                ],
              },
              {
                name: '⚙️ Processing Envelope',
                description: 'Executes business logic tasks',
                key: 'processing',
                uses: [
                  'List tasks to execute in order',
                  'Define task dependencies',
                  'Configure success/failure handlers',
                ],
              },
              {
                name: '📬 Delivery Envelope',
                description: 'Delivers results to users via email with templated messages',
                key: 'delivery',
                uses: [
                  'Select delivery method (email is primary)',
                  'Reference an email template using templateId (created in Email Templates tab)',
                  'Email template variables are auto-filled from request parameters',
                  'Template variables like {{studentName}}, {{courseCode}}, {{status}} get populated automatically',
                  'Update templates anytime without redeploying services',
                ],
              },
              {
                name: '⭐ Feedback Envelope',
                description: 'Collects user feedback on service',
                key: 'feedback',
                uses: [
                  'Enable/disable feedback collection',
                  'Define feedback prompts',
                  'Configure feedback notifications',
                ],
              },
            ].map((envelope) => (
              <Paper key={envelope.key} variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  {envelope.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {envelope.description}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                  Common Uses:
                </Typography>
                <List dense>
                  {envelope.uses.map((use, idx) => (
                    <ListItem key={idx} disableGutters>
                      <ListItemText primary={use} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            ))}
          </Stack>
        </TabPanel>

        {/* Examples Tab */}
        <TabPanel value={tabValue} index={3}>
          <Stack spacing={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Example Service Definitions with Email Templates
            </Typography>

            <Box sx={{ backgroundColor: '#fff3e0', p: 2, borderRadius: 1, mb: 2 }}>
              <Typography variant="caption">
                ℹ️ <strong>Each example references an email template created in the Email Templates tab.</strong> The templateId must exist or validation will fail. Templates use {`{{variableName}}`} syntax for dynamic content.
              </Typography>
            </Box>

            {/* Example 1: Course Enrollment */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Example 1: Course Enrollment Service
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'textSecondary', mb: 1 }}>
                Uses: enrollment_confirmation template with variables: {`{{studentName}}`}, {`{{courseCode}}`}, {`{{semester}}`}, {`{{registrarName}}`}
              </Typography>
              <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.75rem', maxHeight: 300, overflow: 'auto', textAlign: 'left', margin: 0, backgroundColor: '#f5f5f5', p: 1, borderRadius: 0.5 }}>
{`id: SERV-1-04152026
name: Course Enrollment Service
type: courseEnrollment
initiator: admin_portal

envelopes:
  request:
    required: true
    parameters:
      studentId: ""
      courseCode: ""
      semester: ""
  approval:
    required: true
    approvers:
      - id: registrar
        role: Registrar
  payment:
    required: true
    charges:
      - item: "Tuition Fee"
        amount: 5000.00
        currency: PHP
  processing:
    required: true
    tasks:
      - name: validate_prerequisites
      - name: register_student
  delivery:
    required: true
    method: email
    details:
      subject: "Enrollment Confirmation"
      templateId: enrollment_confirmation
  feedback:
    required: true`}
              </Typography>
            </Paper>

            {/* Example 2: Request Approval Notification */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Example 2: Document Request Service
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'textSecondary', mb: 1 }}>
                Uses: request_submitted template with variables: {`{{requestId}}`}, {`{{requestType}}`}, {`{{studentName}}`}, {`{{estimatedCompletion}}`}
              </Typography>
              <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.75rem', maxHeight: 300, overflow: 'auto', textAlign: 'left', margin: 0, backgroundColor: '#f5f5f5', p: 1, borderRadius: 0.5 }}>
{`id: SERV-2-04152026
name: Official Document Request
type: documentRequest
initiator: student_portal

envelopes:
  request:
    required: true
    parameters:
      documentType: ""
      purpose: ""
      copies: ""
  approval:
    required: false
  payment:
    required: false
  processing:
    required: true
    tasks:
      - name: verify_student_status
      - name: retrieve_document
  delivery:
    required: true
    method: email
    details:
      subject: "Document Request Received"
      templateId: request_submitted
  feedback:
    required: true`}
              </Typography>
            </Paper>

            {/* Example 3: Approval Required */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Example 3: Leave Request Service (with Approval)
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'textSecondary', mb: 1 }}>
                Uses: approval_notification template with variables: {`{{approverName}}`}, {`{{leaveType}}`}, {`{{startDate}}`}, {`{{endDate}}`}, {`{{totalDays}}`}
              </Typography>
              <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.75rem', maxHeight: 300, overflow: 'auto', textAlign: 'left', margin: 0, backgroundColor: '#f5f5f5', p: 1, borderRadius: 0.5 }}>
{`id: SERV-3-04152026
name: Employee Leave Request
type: leaveRequest
initiator: employee_portal

envelopes:
  request:
    required: true
    parameters:
      leaveType: ""
      startDate: ""
      endDate: ""
      reason: ""
  approval:
    required: true
    approvers:
      - id: manager
        role: Direct Manager
    approvalRules:
      type: all_must_approve
  payment:
    required: false
  processing:
    required: true
    tasks:
      - name: calculate_leave_balance
      - name: update_leave_record
  delivery:
    required: true
    method: email
    details:
      subject: "Leave Request Approved"
      templateId: approval_notification
  feedback:
    required: false`}
              </Typography>
            </Paper>

            <Box sx={{ backgroundColor: '#e3f2fd', p: 2, borderRadius: 1, mt: 2 }}>
              <Typography variant="caption">
                💡 <strong>How to Create Templates:</strong> Go to the "Email Templates" tab to create new templates. Define the HTML body with {`{{variableName}}`} placeholders—variables are auto-extracted and shown in the preview panel.
              </Typography>
            </Box>

            <Box sx={{ backgroundColor: '#f3e5f5', p: 2, borderRadius: 1 }}>
              <Typography variant="caption">
                ✅ <strong>Validation:</strong> When you save a service, the templateId in the delivery envelope is automatically validated against existing email templates. If the template doesn't exist, you'll get an error—click Email Templates tab to create it.
              </Typography>
            </Box>
          </Stack>
        </TabPanel>

        {/* Email Templates Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ p: 3 }}>
            <EmailTemplateManager />
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};
