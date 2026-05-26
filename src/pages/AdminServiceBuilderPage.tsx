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
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  Lightbulb as LightbulbIcon,
  ContentCopy as ContentCopyIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import YAML from 'js-yaml';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { AdminLearningGuide } from '../components/AdminLearningGuide';
import { EnhancedEmailTemplateManager } from '../components/EnhancedEmailTemplateManager';
import { validateServiceDefinition } from '../utils/validateServiceDefinition';

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
    
    loadServices();
  }, []);

  const validateAndParse = (yaml: string) => {
    try {
      const parsed = YAML.load(yaml) as any;
      setParsedYaml(parsed);

      // Use the comprehensive validator from SERVICE_DEFINITION_RULES.yaml
      const result = validateServiceDefinition(parsed);

      // Convert validation result to string array for display
      const errorMessages = result.errors.map(
        (err) => `[${err.section}] ${err.field}: ${err.message}`
      );

      setValidationErrors(errorMessages);
      setIsValid(result.isValid);
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
      const serviceData = {
        name: serviceName,
        yaml: yamlContent,
        type: parsedYaml.type,
        serviceId: parsedYaml.serviceId,
      };

      if (isEditingExisting && selectedServiceId) {
        await api.updateService(selectedServiceId, serviceData);
        addNotification(`Service "${serviceName}" updated successfully!`, 'success');
      } else {
        await api.createService(serviceData);
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
      setTabValue(0);
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

  const basicTemplate = `serviceId: SERV-001
type: service-name
name: My Service
description: Brief service description

envelopes:
  request:
    parameters:
      firstName:
        type: String
        required: true
        minLength: 2
        maxLength: 100
  
  approval:
    approvalRules:
      type: specific_approver
      specificApprover: approver@example.com
    emailTemplateStartEnvelope: SERV-001-approval-start
    emailTemplateEndEnvelope: SERV-001-approval-end
  
  payment:
    required: true
    charges:
      - item: Processing Fee
        amount: 1000
        currency: PHP
  
  processing:
    tasks:
      - name: verify_request
        type: api_call
        method: POST
        url: https://api.example.com/verify
  
  delivery:
    method: email
    email:
      templateId: SERV-001-delivery-start
  
  feedback:
    required: true
    expiryDays: 30`;

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
          <Tab label="Learning Guide" />
          <Tab label="YAML Structure Guide" />
          <Tab label="Examples" />
          <Tab label="Email Templates (Enhanced)" />
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
                    <Button variant="contained" color="primary" onClick={handleCreateNew} size="small" sx={{ color: 'white' }}>
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
                  backgroundColor: '#1e1e1e',
                  color: '#ffffff',
                  '& .MuiInputBase-input': {
                    fontFamily: 'Courier New, Courier, monospace',
                    textAlign: 'left',
                    whiteSpace: 'pre',
                    color: '#ffffff',
                    backgroundColor: '#1e1e1e',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#444',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#666',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#1976d2',
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
                  <Alert icon={<ErrorIcon />} severity="error" sx={{ textAlign: 'left' }}>
                    <Stack spacing={1} sx={{ textAlign: 'left' }}>
                      <Typography variant="subtitle2" sx={{ textAlign: 'left' }}>Validation Errors:</Typography>
                      <Stack component="ul" spacing={0.5} sx={{ textAlign: 'left', pl: 2 }}>
                        {validationErrors.map((error, idx) => (
                          <Typography component="li" key={idx} variant="body2" sx={{ textAlign: 'left' }}>
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
                    fontFamily: 'Courier New, Courier, monospace',
                    fontSize: '0.85rem',
                    maxHeight: 300,
                    overflow: 'auto',
                    textAlign: 'left',
                  }}
                >
                  <pre style={{ margin: 0, textAlign: 'left', fontFamily: 'Courier New, Courier, monospace' }}>{JSON.stringify(parsedYaml, null, 2)}</pre>
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
                        <TableCell sx={{ fontFamily: 'Courier New, Courier, monospace', fontSize: '0.85rem', color: '#333', fontWeight: 500 }}>
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

        {/* Learning Guide - SERVICE_DEFINITION_RULES Reference */}
        <TabPanel value={tabValue} index={2}>
          <AdminLearningGuide />
        </TabPanel>

        {/* YAML Structure Guide - Quick Reference */}
        <TabPanel value={tabValue} index={3}>
          <Stack spacing={3} sx={{ p: 3 }}>
            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                📚 Complete Learning Guide Available
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                For detailed explanations of all parameter types, envelopes, and best practices, see the <strong>Learning Guide</strong> tab.
              </Typography>
              <Typography variant="body2" color="textSecondary">
                This tab shows the basic structure. Use Learning Guide for in-depth rules and patterns.
              </Typography>
            </Alert>

            {/* Core Structure */}
            <Card sx={{ bgcolor: '#f8f9fa', border: '2px solid #e0e0e0' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ color: '#4caf50' }} />
                  Service Definition Template
                </Typography>
                <Typography component="pre" sx={{ 
                  fontFamily: 'Courier New, Courier, monospace', 
                  fontSize: '0.9rem', 
                  overflow: 'auto',
                  bgcolor: '#1e1e1e',
                  color: '#d4d4d4',
                  p: 2,
                  borderRadius: 1,
                  lineHeight: 1.6,
                  textAlign: 'left',
                }}>
{`serviceId: SERV-001
type: service-type
name: Service Name
description: Brief description

envelopes:
  request:
    parameters:
      param1: { type: String, required: true }
      param2: { type: Number, required: false }
  
  approval:
    type: all_must_approve | any_one | specific_approver | complex
    approvers: [emails]
    expiryHours: 48
  
  payment:
    required: true|false
    charges:
      - item: Item Name
        amount: 1000
        currency: PHP
  
  processing:
    tasks:
      - name: task_name
        type: api_call
        method: GET
        url: https://...
  
  delivery:
    method: email | physical_mail | pickup
    email: { templateId: template-name }
  
  feedback:
    required: true|false`}
                </Typography>
              </CardContent>
            </Card>

            {/* The 6 Envelopes Quick Summary */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                📦 The 6 Envelopes (Quick Summary)
              </Typography>
              <Stack spacing={1}>
                {[
                  { icon: '📋', name: 'Request', desc: 'What data to collect from requester' },
                  { icon: '✅', name: 'Approval', desc: 'Who approves and what rules apply' },
                  { icon: '💰', name: 'Payment', desc: 'Itemized charges (if any)' },
                  { icon: '⚙️', name: 'Processing', desc: 'Background tasks (verify, generate, etc)' },
                  { icon: '📬', name: 'Delivery', desc: 'How they get the result' },
                  { icon: '⭐', name: 'Feedback', desc: 'Optional survey after completion' },
                ].map((e, i) => (
                  <Card key={i} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography sx={{ fontSize: '1.5rem' }}>{e.icon}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>{e.name}</Typography>
                      <Typography variant="body2" color="textSecondary">{e.desc}</Typography>
                    </Box>
                  </Card>
                ))}
              </Stack>
            </Box>

            <Alert severity="success" icon={<LightbulbIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                💡 Start with the Examples tab to see complete, working services you can copy and modify!
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
                subtitle: 'Multi-approver payment service with processing and email delivery',
                complexity: 'Advanced',
                code: `serviceId: SERV-001
type: transcript-of-records
name: Transcript of Records
description: Official academic transcript request

envelopes:
  request:
    parameters:
      studentId:
        type: String
        required: true
        minLength: 5
        maxLength: 20
      numberOfCopies:
        type: Number
        required: true
        min: 1
        max: 10
        step: 1
      purpose:
        type: Dropdown
        required: true
        options:
          - Scholarship
          - Employment
          - Transfer
          - Visa
  
  approval:
    type: complex
    requiredApprovers:
      - records@mapua.edu.ph
    atLeastOneOf:
      - dean@mapua.edu.ph
      - registrar@mapua.edu.ph
    expiryHours: 48
  
  payment:
    required: true
    charges:
      - item: Processing Fee
        amount: 300
        currency: PHP
      - item: Printing per copy
        amount: 50
        currency: PHP
  
  processing:
    tasks:
      - name: verify_student
        type: api_call
        method: GET
        url: https://api.registrar.local/verify
      - name: pull_transcript
        type: api_call
        method: GET
        url: https://api.registrar.local/transcript
      - name: generate_pdf
        type: api_call
        method: POST
        url: https://api.generator.local/pdf
  
  delivery:
    method: email
    email:
      templateId: tor-request-confirmation
      subject: "Your Transcript Request - {{requestId}}"
  
  feedback:
    required: false`,
              },
              {
                title: '🏥 Clinic Visit Appointment',
                subtitle: 'Simple service with single approver and no payment',
                complexity: 'Simple',
                code: `serviceId: SERV-002
type: clinic-appointment
name: Clinic Visit Appointment
description: Schedule appointment at campus clinic

envelopes:
  request:
    parameters:
      studentId:
        type: String
        required: true
      fullName:
        type: String
        required: true
        minLength: 3
        maxLength: 100
      visitDate:
        type: Date
        required: true
      reason:
        type: String
        required: false
        maxLength: 500
      isUrgent:
        type: Boolean
        required: false
        default: false
  
  approval:
    type: specific_approver
    specificApprover: clinic@mapua.edu.ph
    expiryHours: 24
  
  payment:
    required: false
  
  processing:
    tasks:
      - name: verify_student_active
        type: api_call
        method: POST
        url: https://api.registrar.local/verify-active
      - name: check_clinic_availability
        type: api_call
        method: POST
        url: https://api.clinic.local/availability
  
  delivery:
    method: email
    email:
      templateId: clinic-appointment-confirmation
  
  feedback:
    required: true`,
              },
              {
                title: '🏨 On-Campus Housing Rental',
                subtitle: 'Multi-approver with itemized payment and multiple tasks',
                complexity: 'Advanced',
                code: `serviceId: SERV-003
type: housing-rental
name: On-Campus Housing Rental
description: Apply for campus dormitory housing

envelopes:
  request:
    parameters:
      studentId:
        type: String
        required: true
      academicYear:
        type: String
        required: true
      roomType:
        type: Radio
        required: true
        options:
          - Single
          - Double
          - Triple
      startDate:
        type: Date
        required: true
      endDate:
        type: Date
        required: true
      specialRequests:
        type: String
        required: false
        maxLength: 1000
  
  approval:
    type: all_must_approve
    approvers:
      - housing@mapua.edu.ph
      - finance@mapua.edu.ph
    expiryHours: 72
  
  payment:
    required: true
    charges:
      - item: Monthly Rental
        amount: 5000
        currency: PHP
      - item: Security Deposit
        amount: 3000
        currency: PHP
      - item: Utilities
        amount: 1000
        currency: PHP
  
  processing:
    tasks:
      - name: verify_eligibility
        type: api_call
        method: POST
        url: https://api.housing.local/verify-eligibility
      - name: check_availability
        type: api_call
        method: GET
        url: https://api.housing.local/availability
      - name: generate_contract
        type: api_call
        method: POST
        url: https://api.housing.local/generate-contract
      - name: record_occupancy
        type: api_call
        method: POST
        url: https://api.housing.local/occupancy
  
  delivery:
    method: email
    email:
      templateId: housing-contract
  
  feedback:
    required: true`,
              },
              {
                title: '📋 Course Withdrawal Request',
                subtitle: 'Uses dropdown for course selection and any_one approval',
                complexity: 'Intermediate',
                code: `serviceId: SERV-004
type: course-withdrawal
name: Course Withdrawal Request
description: Request withdrawal from an enrolled course

envelopes:
  request:
    parameters:
      studentId:
        type: String
        required: true
      courseName:
        type: Dropdown
        required: true
        options:
          - CS101 - Intro to Programming
          - CS202 - Data Structures
          - CS301 - Database Systems
          - CS401 - Web Development
      withdrawalDate:
        type: Date
        required: true
      academicImpact:
        type: String
        required: false
        maxLength: 500
      acknowledgeLateWithdrawal:
        type: Boolean
        required: true
  
  approval:
    type: any_one
    approvers:
      - advisor1@mapua.edu.ph
      - advisor2@mapua.edu.ph
      - advisor3@mapua.edu.ph
    expiryHours: 48
  
  payment:
    required: false
  
  processing:
    tasks:
      - name: verify_enrollment
        type: api_call
        method: GET
        url: https://api.registrar.local/enrollment
      - name: update_transcript
        type: api_call
        method: POST
        url: https://api.registrar.local/update-transcript
  
  delivery:
    method: email
    email:
      templateId: withdrawal-confirmation
  
  feedback:
    required: false`,
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
                    <Chip 
                      label={example.complexity} 
                      size="small" 
                      color={example.complexity === 'Simple' ? 'success' : example.complexity === 'Intermediate' ? 'warning' : 'error'}
                    />
                  </Box>

                  <Box sx={{ position: 'relative' }}>
                    <Typography component="pre" sx={{
                      fontFamily: 'Courier New, Courier, monospace',
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
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                📋 How to Use Examples:
              </Typography>
              <Stack spacing={0.5} sx={{ fontSize: '0.9rem' }}>
                <Box>1. Copy the YAML above (click copy button in top-right corner)</Box>
                <Box>2. Paste into the <strong>Builder</strong> tab as your starting point</Box>
                <Box>3. Modify serviceId, type, names, parameters for your service</Box>
                <Box>4. Update approvers, charges, and processing tasks as needed</Box>
                <Box>5. Create email templates in the <strong>Email Templates</strong> tab matching the templateId references</Box>
                <Box>6. Click <strong>Validate & Save</strong> in the Builder</Box>
              </Stack>
            </Alert>

            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                ⚠️ Important: serviceId Format
              </Typography>
              <Typography variant="body2">
                Service IDs must follow the format: <code>SERV-###</code> (e.g., SERV-001, SERV-100).
                This is automatically validated by the system.
              </Typography>
            </Alert>
          </Stack>
        </TabPanel>

        {/* Email Templates Tab - Enhanced WYSIWYG Editor */}
        <TabPanel value={tabValue} index={5}>
          <Box sx={{ p: 3 }}>
            <EnhancedEmailTemplateManager />
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
                    <Typography variant="body2" sx={{ fontFamily: 'Courier New, Courier, monospace', fontSize: '0.85rem' }}>
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
