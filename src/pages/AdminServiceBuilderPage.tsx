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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  MenuBook as MenuBookIcon,
  Lightbulb as LightbulbIcon,
  ContentCopy as ContentCopyIcon,
  CheckCircle as CheckCircleIcon,
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

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
      
      // Reload services list
      const response = await api.getServices();
      setServices(response.services || []);
      
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

  const handleDeleteClick = (service: any) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;

    try {
      setDeleting(true);
      await api.deleteService(serviceToDelete.id);
      addNotification(`Service "${serviceToDelete.name}" deleted successfully!`, 'success');
      
      // Reload services
      const response = await api.getServices();
      setServices(response.services || []);
      
      // Reset form if we were editing the deleted service
      if (selectedServiceId === serviceToDelete.id) {
        handleCreateNew();
      }
      
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    } catch (err: any) {
      addNotification(
        err.response?.data?.error || 'Failed to delete service',
        'error'
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setServiceToDelete(null);
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
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto" sx={{ '& .MuiTab-root': { fontSize: '0.7rem !important', minWidth: '65px !important', padding: '4px 10px !important' } }}>
          <Tab label="Builder" />
          <Tab label="Manage Services" />
          <Tab label="YAML Structure Guide" />
          <Tab label="Envelope Guide" />
          <Tab label="Examples" />
          <Tab label="Quick Reference" />
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

        {/* Manage Services Tab */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3} sx={{ p: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Manage Services
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2, color: '#555' }}>
                View, edit, or delete existing services
              </Typography>
            </Box>

            {loadingServices ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : services.length === 0 ? (
              <Alert severity="info">
                No services found. Create a new service in the Builder tab.
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Service Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Service ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{service.name}</TableCell>
                        <TableCell>
                          <Chip label={service.type} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#333', fontWeight: 500 }}>
                          {service.id}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleLoadService(service.id)}
                              title="Edit service"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(service)}
                              title="Delete service"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </TabPanel>

        {/* YAML Structure Guide - Interactive Ruleset */}
        <TabPanel value={tabValue} index={2}>
          <Stack spacing={3} sx={{ p: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CodeIcon sx={{ color: '#1976d2' }} />
                YAML Ruleset & Tools
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'left' }}>
                The ruleset is simple: define what you need in each envelope. Here are your tools:
              </Typography>
            </Box>

            {/* Core Structure */}
            <Card sx={{ bgcolor: '#f8f9fa', border: '2px solid #e0e0e0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ color: '#4caf50' }} />
                  Basic Service Structure
                </Typography>
                <Typography component="pre" sx={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.9rem', 
                  overflow: 'auto',
                  bgcolor: '#1e1e1e',
                  color: '#d4d4d4',
                  p: 2,
                  borderRadius: 1,
                  lineHeight: 1.6,
                  textAlign: 'left',
                }}>
{`id: SERV-X-YYYYMMDD          # Unique ID with date
name: Service Name             # Human-readable name
description: What it does      # Brief description
type: serviceType              # Internal type (camelCase)
serviceCode: CODE              # Short code (TOR, RR, CVR)
initiator: student_portal      # Who starts requests

envelopes:
  request:      { ... parameters ... }
  approval:     { ... approvers & rules ... }
  payment:      { ... charges ... }
  processing:   { ... tasks ... }
  delivery:     { ... email or pickup ... }
  feedback:     { ... survey questions ... }`}
                </Typography>
              </CardContent>
            </Card>

            {/* The 6 Tools */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: 'left' }}>
                🎮 Your 6 Tools
              </Typography>
              <Stack spacing={2}>
                {[
                  {
                    title: '1️⃣ Request Parameters - "What Do You Want To Ask?"',
                    color: '#bbdefb',
                    content: `Add ANY number of parameters (1, 5, 20, 100+) in key-value pairs:
                    
studentId: String
email: String
firstName: String
numberOfCopies: Number (1-5)
purpose: String (Scholarship, Employment, etc)
deliveryMode: String (Pickup, Mail, Email)`,
                  },
                  {
                    title: '2️⃣ Approval Rules - "Who Decides?"',
                    color: '#c8e6c9',
                    content: `Choose your approval strategy:

• specific_approver: One person signs off
• any_one: First person to approve wins
• all_must_approve: Everyone must sign
• complex: Head + at least one team member`,
                  },
                  {
                    title: '3️⃣ Payment Rules - "What\'s The Cost?"',
                    color: '#ffe0b2',
                    content: `Free or paid:

• required: false → Free service
• required: true → Itemized charges:
    - item: Processing Fee
      amount: 200
      currency: PHP`,
                  },
                  {
                    title: '4️⃣ Processing Tasks - "What Happens Behind The Scenes?"',
                    color: '#f8bbd0',
                    content: `Chain tasks in sequence:

• custom_function: verify_student, generate_document
• api_call: Call external registrar, document system
• webhook: Trigger external workflows`,
                  },
                  {
                    title: '5️⃣ Delivery Methods - "How Do They Get It?"',
                    color: '#d1c4e9',
                    content: `Multiple ways to deliver:

• Email: Send with attachments
• Pickup: At a location (office, counter)
• Mail: Ship to address
• Dynamic: Let user choose ({{deliveryMode}})`,
                  },
                  {
                    title: '6️⃣ Feedback Surveys - "How Did We Do?"',
                    color: '#c0caf9',
                    content: `Collect feedback:

surveyQuestions:
  - Was the service completed satisfactorily?
  - How would you rate the quality?
  - What could we improve?`,
                  },
                ].map((tool, idx) => (
                  <Accordion key={idx} defaultExpanded={idx === 0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: tool.color }}>
                      <Typography sx={{ fontWeight: 600, textAlign: 'left' }}>{tool.title}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: '#333', textAlign: 'left' }}>
                        {tool.content}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Stack>
            </Box>

            {/* Using Parameters & Templates */}
            <Alert severity="info" icon={<LightbulbIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, textAlign: 'left' }}>
                💡 Pro Tips: Using Parameters & Templates
              </Typography>
              <Stack spacing={1} sx={{ fontSize: '0.9rem', textAlign: 'left' }}>
                <Box>• <strong>Parameters are portable:</strong> Define in request envelope, use everywhere with {"{{parameterName}}"} syntax</Box>
                <Box>• <strong>Email templates:</strong> Create in "Email Templates" tab, reference by ID in delivery envelope</Box>
                <Box>• <strong>Template variables:</strong> Use {"{{studentName}}, {{requestId}}, {{status}}"} — auto-populated from request parameters</Box>
                <Box>• <strong>Update anytime:</strong> Edit templates without redeploying services. Next email uses new version</Box>
              </Stack>
            </Alert>
          </Stack>
        </TabPanel>

        {/* Envelope Guide - Visual Cards */}
        <TabPanel value={tabValue} index={3}>
          <Stack spacing={3} sx={{ p: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MenuBookIcon sx={{ color: '#1976d2' }} />
                Understanding The 6 Envelopes
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Every service has 6 envelopes. Define rules for each one. Your service, your rules.
              </Typography>
            </Box>

            {[
              {
                icon: '📋',
                name: 'Request Envelope',
                color: '#e3f2fd',
                borderColor: '#1976d2',
                description: 'What information do you need from the requester?',
                details: [
                  'Define custom parameters (studentId, email, purpose, etc)',
                  'Set required vs optional fields',
                  'Parameters can be used throughout service with {{parameterName}}',
                  'Example: 3 fields (simple) to 20+ fields (complex)',
                ],
              },
              {
                icon: '✅',
                name: 'Approval Envelope',
                color: '#e8f5e9',
                borderColor: '#4caf50',
                description: 'Who approves requests and under what rules?',
                details: [
                  'specific_approver: One person decides',
                  'any_one: First person to approve wins',
                  'all_must_approve: Everyone must sign off',
                  'complex: Head + at least one team member (checks & balances)',
                ],
              },
              {
                icon: '💰',
                name: 'Payment Envelope',
                color: '#fff3e0',
                borderColor: '#f57c00',
                description: 'Is payment required? If yes, what are the costs?',
                details: [
                  'required: false → Free service',
                  'required: true → List itemized charges',
                  'Multiple charges: Processing + Printing + Delivery',
                  'Specify payment provider (maya, stripe, etc) and currency (PHP, USD)',
                ],
              },
              {
                icon: '⚙️',
                name: 'Processing Envelope',
                color: '#f3e5f5',
                borderColor: '#7b1fa2',
                description: 'What happens behind the scenes?',
                details: [
                  'custom_function: Built-in logic (verify_student, generate_document)',
                  'api_call: Call external systems (registrar API, document system)',
                  'webhook: Trigger workflows in other systems',
                  'Tasks execute in sequence with retries & timeouts',
                ],
              },
              {
                icon: '📬',
                name: 'Delivery Envelope',
                color: '#fce4ec',
                borderColor: '#c2185b',
                description: 'How do they get the result?',
                details: [
                  'Email: Primary method with templated content',
                  'Reference email template by ID (created in "Email Templates" tab)',
                  'Template variables like {{studentName}} auto-filled from request params',
                  'Pickup/Mail also supported; can use {{deliveryMode}} for dynamic choice',
                ],
              },
              {
                icon: '⭐',
                name: 'Feedback Envelope',
                color: '#e0f2f1',
                borderColor: '#00897b',
                description: 'Collect user feedback and satisfaction',
                details: [
                  'Optional survey after service completion',
                  'Ask satisfaction, quality, improvement questions',
                  'Feedback helps you improve services',
                  'Can be required or optional',
                ],
              },
            ].map((envelope, idx) => (
              <Card
                key={idx}
                sx={{
                  border: `2px solid ${envelope.borderColor}`,
                  bgcolor: envelope.color,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: '1.5rem' }}>{envelope.icon}</span>
                    {envelope.name}
                  </Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2, color: '#666' }}>
                    {envelope.description}
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Stack spacing={1}>
                    {envelope.details.map((detail, didx) => (
                      <Box key={didx} sx={{ display: 'flex', gap: 1 }}>
                        <Typography sx={{ color: '#4caf50', fontWeight: 600 }}>✓</Typography>
                        <Typography variant="body2">{detail}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            ))}

            <Alert severity="success" icon={<LightbulbIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Remember: Every service uses all 6 envelopes. You control what goes in each one!
              </Typography>
            </Alert>
          </Stack>
        </TabPanel>

        {/* Examples - Complete Working Services */}
        <TabPanel value={tabValue} index={4}>
          <Stack spacing={3} sx={{ p: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CodeIcon sx={{ color: '#1976d2' }} />
                Real-World Examples
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Copy, modify, and deploy. Each example is production-ready.
              </Typography>
            </Box>

            {[
              {
                title: '📜 Transcript of Records (TOR)',
                subtitle: 'Student requests official transcript, 2 people approve, pays PHP 700, gets document',
                complexity: 'Advanced',
                code: `id: SERV-3-05262026
name: Transcript of Records
type: transcriptOfRecords
initiator: student_portal

envelopes:
  request:
    parameters:
      studentId: String
      firstName: String
      numberOfCopies: Number (1-5)
      purpose: String
      deliveryMode: String
  
  approval:
    approvers:
      - id: barondimaranan@gmail.com
        role: Head Teller
      - id: baron@fowlstudios.com
        role: Sub Teller 1
    approvalRules:
      type: complex
      requiredApprovers:
        - barondimaranan@gmail.com
      atLeastOneOf:
        - baron@fowlstudios.com
        - barbargbf@gmail.com
    expiryHours: 48
  
  payment:
    required: true
    charges:
      - item: TOR Processing
        amount: 500
      - item: Printing & Delivery
        amount: 200
  
  processing:
    tasks:
      - verify_student
      - pull_transcript
      - generate_document
  
  delivery:
    method: "{{deliveryMode}}"
    email:
      templateId: tor_confirmation
  
  feedback:
    required: true`,
              },
              {
                title: '🏥 Clinic Visit Request',
                subtitle: 'Student books appointment, medical staff approves, no payment, reminder email',
                complexity: 'Simple',
                code: `id: SERV-6-05262026
name: Clinic Visit Request
type: clinicVisitRequest
initiator: student_portal

envelopes:
  request:
    parameters:
      studentId: String
      visitDate: Date
      reason: String
      notes: String (optional)
  
  approval:
    approvers:
      - id: clinic@mapua.edu.ph
        role: Clinic Manager
    approvalRules:
      type: specific_approver
    expiryHours: 24
  
  payment:
    required: false
  
  processing:
    tasks:
      - verify_student_status
      - confirm_appointment
  
  delivery:
    method: email
    email:
      templateId: appointment_confirmation
  
  feedback:
    required: true`,
              },
              {
                title: '🏨 Room Rental Service',
                subtitle: 'Student rents room, Head + Finance both approve, itemized payment, contract delivery',
                complexity: 'Complex',
                code: `id: SERV-4-05262026
name: Room Rental Service
type: roomRental
initiator: student_portal

envelopes:
  request:
    parameters:
      studentId: String
      roomType: String
      startDate: Date
      endDate: Date
      numberOfOccupants: Number
      specialRequirements: String
      emergencyPhone: String
  
  approval:
    approvers:
      - id: housing.head@mapua.edu.ph
        role: Housing Director
      - id: finance.head@mapua.edu.ph
        role: Finance Director
    approvalRules:
      type: all_must_approve
    expiryHours: 72
  
  payment:
    required: true
    charges:
      - item: Monthly Rental
        amount: 5000
      - item: Security Deposit
        amount: 2000
      - item: Damage Insurance
        amount: 500
  
  processing:
    tasks:
      - verify_student_eligibility
      - check_room_availability
      - generate_contract
      - create_occupancy_record
  
  delivery:
    method: email
    email:
      templateId: rental_contract
  
  feedback:
    required: true`,
              },
            ].map((example, idx) => (
              <Card key={idx} sx={{ border: '2px solid #e0e0e0' }}>
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {example.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {example.subtitle}
                    </Typography>
                    <Chip label={example.complexity} size="small" color={example.complexity === 'Simple' ? 'success' : 'warning'} />
                  </Box>

                  <Box sx={{ position: 'relative' }}>
                    <Typography component="pre" sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      overflow: 'auto',
                      maxHeight: 400,
                      bgcolor: '#1e1e1e',
                      color: '#d4d4d4',
                      p: 2,
                      borderRadius: 1,
                      lineHeight: 1.5,
                      textAlign: 'left',
                    }}>
                      {example.code}
                    </Typography>
                    <Tooltip title="Copy to clipboard">
                      <IconButton
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(example.code);
                          addNotification('Copied to clipboard!', 'success');
                        }}
                        sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.1)' }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            ))}

            <Alert severity="info" sx={{ textAlign: 'left' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, textAlign: 'left' }}>
                📋 How to Use Examples:
              </Typography>
              <Stack spacing={0.5} sx={{ fontSize: '0.9rem' }}>
                <Box sx={{ textAlign: 'left' }}>1. Copy the YAML above (click the copy button)</Box>
                <Box sx={{ textAlign: 'left' }}>2. Paste into the Builder tab as a starting point</Box>
                <Box sx={{ textAlign: 'left' }}>3. Modify parameters, approvers, charges for your service</Box>
                <Box sx={{ textAlign: 'left' }}>4. Create email templates for delivery envelope templateId references</Box>
                <Box sx={{ textAlign: 'left' }}>5. Validate & save your service</Box>
              </Stack>
            </Alert>
          </Stack>
        </TabPanel>

        {/* Quick Reference - Tables & Lookup */}
        <TabPanel value={tabValue} index={5}>
          <Stack spacing={3} sx={{ p: 3 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LightbulbIcon sx={{ color: '#ffc107' }} />
                Quick Reference Tables
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Fast lookup tables for building services.
              </Typography>
            </Box>

            {/* Approval Types Table */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Approval Types
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>When To Use</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Setup</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell><code>specific_approver</code></TableCell>
                        <TableCell>Single decision-maker</TableCell>
                        <TableCell>One email in specificApprover</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><code>any_one</code></TableCell>
                        <TableCell>Quick approval (first wins)</TableCell>
                        <TableCell>List multiple approvers</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><code>all_must_approve</code></TableCell>
                        <TableCell>Consensus (everyone signs)</TableCell>
                        <TableCell>List all approvers</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><code>complex</code></TableCell>
                        <TableCell>Head + team (checks & balance)</TableCell>
                        <TableCell>requiredApprovers + atLeastOneOf</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Processing Task Types */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Processing Task Types
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Purpose</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Examples</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell><code>custom_function</code></TableCell>
                        <TableCell>Built-in business logic</TableCell>
                        <TableCell>verify_student, generate_document, pull_transcript</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><code>api_call</code></TableCell>
                        <TableCell>Call external systems</TableCell>
                        <TableCell>Registrar API, document system, email service</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><code>webhook</code></TableCell>
                        <TableCell>Trigger workflows</TableCell>
                        <TableCell>Alert teams, log events, sync to other systems</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Common Parameter Types */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Common Parameter Types
                </Typography>
                <Stack spacing={2}>
                  {[
                    { type: 'String', example: 'studentId: ""' },
                    { type: 'Number', example: 'numberOfCopies: 0 (with 1-5 range)' },
                    { type: 'Date', example: 'startDate: ""' },
                    { type: 'Boolean', example: 'isUrgent: false' },
                    { type: 'Dropdown', example: 'purpose: "(Scholarship, Employment, Transfer)"' },
                  ].map((item, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 2 }}>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 600, minWidth: 100 }}>
                        {item.type}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {item.example}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Symbols Reference */}
            <Alert severity="info" icon={<LightbulbIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, textAlign: 'left' }}>
                📌 Symbols Used Throughout:
              </Typography>
              <Stack spacing={0.5} sx={{ fontSize: '0.9rem', textAlign: 'left' }}>
                <Box>{"{{parameterName}}"} → Parameter reference (replaced with actual value)</Box>
                <Box># → Comment (ignored by parser)</Box>
                <Box>| → OR operator (choose one: specific_approver|any_one|all_must_approve)</Box>
              </Stack>
            </Alert>
          </Stack>
        </TabPanel>

        {/* Email Templates Tab */}
        <TabPanel value={tabValue} index={6}>
          <Box sx={{ p: 3 }}>
            <EmailTemplateManager />
          </Box>
        </TabPanel>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, color: '#000' }}>
          <DeleteIcon color="error" />
          Delete Service
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography>
              Are you sure you want to delete this service? This action cannot be undone.
            </Typography>
            {serviceToDelete && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Service Name
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {serviceToDelete.name}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Service ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {serviceToDelete.id}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Type
                    </Typography>
                    <Typography variant="body2">
                      <Chip label={serviceToDelete.type} size="small" />
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete Service'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
