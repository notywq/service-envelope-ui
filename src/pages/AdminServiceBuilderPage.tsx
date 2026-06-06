/**
 * Admin Service Builder Page
 * Allows admins to create new service definitions using YAML
 * Now with JSON Schema validation integrated
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
  Verified as VerifiedIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import YAML from 'js-yaml';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { useAuth } from '../hooks/useAuth';
import { AdminLearningGuide } from '../components/AdminLearningGuide';
import { EnhancedEmailTemplateManager } from '../components/EnhancedEmailTemplateManager';
import { schemaValidator } from '../utils/schemaValidator';

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
  const EXPECTED_SCHEMA_VERSION = '1.0.3';
  const { addNotification } = useNotification();
  const { user } = useAuth();

  const [tabValue, setTabValue] = useState(0);
  const [serviceName, setServiceName] = useState('');
  const [yamlContent, setYamlContent] = useState('');
  const [schemaValidationErrors, setSchemaValidationErrors] = useState<any[]>([]);
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
  
  // Schema-related state
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaVersion, setSchemaVersion] = useState<string>('unknown');
  const [schemaError, setSchemaError] = useState<string>('');
  const [schemaReloading, setSchemaReloading] = useState(false);

  useEffect(() => {
    const loadSchemaAndServices = async () => {
      try {
        // Load latest JSON Schema
        setSchemaLoading(true);
        setSchemaError('');
        
        try {
          const schemaData = await api.getLatestSchemaVersion();
          schemaValidator.setSchema(schemaData.schema, schemaData.version);
          const version = schemaData.version || 'unknown';
          setSchemaVersion(version);

          if (version !== EXPECTED_SCHEMA_VERSION) {
            addNotification(
              `Schema mismatch: expected ${EXPECTED_SCHEMA_VERSION}, loaded ${version}`,
              'warning'
            );
          }
          
          // Verify schema was set in validator
          const validatorVersion = schemaValidator.getSchemaVersion();
          console.log('✅ Latest schema loaded:', {
            version: version,
            validatorVersion: validatorVersion,
            match: version === validatorVersion,
            timestamp: schemaData.timestamp,
          });
          addNotification(`Schema v${version} loaded`, 'success');
        } catch (schemaErr: any) {
          console.error('⚠️ Error loading schema:', {
            message: schemaErr.message,
            status: schemaErr.response?.status,
          });
          setSchemaError('Could not load JSON Schema from server');
          setSchemaVersion('local-only');
          addNotification('Schema not available - validation is disabled until schema loads', 'warning');
        }

        // Load services
        setLoadingServices(true);
        const response = await api.getServices();
        setServices(response.services || []);
      } catch (err) {
        addNotification('Failed to load services', 'error');
      } finally {
        setLoadingServices(false);
        setSchemaLoading(false);
      }
    };
    
    loadSchemaAndServices();
  }, [addNotification]);

  const formatErrorPath = (path: string): string => {
    // Convert "/envelopes/request/parameters/firstName" to "Request Parameters > First Name"
    if (!path || path === '/') return 'Root';
    
    const parts = path.split('/').filter(Boolean);
    return parts
      .map((part, idx) => {
        // Capitalize and add spaces
        const formatted = part
          .replace(/([A-Z])/g, ' $1') // Add space before capitals
          .replace(/_/g, ' ') // Replace underscores with spaces
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        // Add separator for visual hierarchy
        return idx > 0 ? formatted : formatted;
      })
      .join(' → ');
  };

  const organizeErrorsBySection = (errors: any[]): Map<string, any[]> => {
    const organized = new Map<string, any[]>();
    
    errors.forEach(err => {
      const pathParts = err.path.split('/').filter(Boolean);
      const section = pathParts[0] || 'General';
      
      if (!organized.has(section)) {
        organized.set(section, []);
      }
      organized.get(section)!.push(err);
    });
    
    return organized;
  };

  const validateAndParse = (yaml: string) => {
    try {
      const parsed = YAML.load(yaml) as any;
      setParsedYaml(parsed);

      let isSchemaValid = false;
      let schemaErrors: any[] = [];
      
      if (schemaValidator.getSchema()) {
        // Validate against JSON Schema (source of truth)
        const schemaValidationResult = schemaValidator.validate(parsed);
        isSchemaValid = schemaValidationResult.isValid;
        schemaErrors = schemaValidationResult.errors;
        
        console.log('📋 Schema Validation Result:', {
          isValid: isSchemaValid,
          errorCount: schemaErrors.length,
          schemaVersion: schemaValidationResult.schemaVersion,
        });
      } else {
        // Never allow saving if canonical schema is unavailable.
        console.warn('⚠️ Schema not available, cannot validate service definition');
        schemaErrors = [
          {
            path: '/',
            message: 'Schema is not loaded from MongoDB. Reload schema and try again.',
            keyword: 'schema_unavailable',
          },
        ];
      }

      setSchemaValidationErrors(schemaErrors);
      setIsValid(isSchemaValid);
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid YAML syntax';
      setSchemaValidationErrors([{
        path: '/',
        message: errorMsg,
        keyword: 'parse_error',
      }]);
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
      setSchemaValidationErrors([]);
      setIsValid(false);
      setParsedYaml(null);
    }
  };

  const getServiceIdFromService = (service: any) => {
    try {
      if (service.serviceId) return service.serviceId;
      if (service.id && typeof service.id === 'string' && service.id.startsWith('SERV-')) return service.id;
      if (service.definition?.id) return service.definition.id;
      if (service.yaml) {
        const parsed = YAML.load(service.yaml) as any;
        return parsed?.id || parsed?.serviceId || 'N/A';
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const getServiceYamlFromService = (service: any): string => {
    if (typeof service?.yaml === 'string' && service.yaml.trim()) {
      return service.yaml;
    }

    if (service?.definition && typeof service.definition === 'object') {
      try {
        return YAML.dump(service.definition, { noRefs: true, lineWidth: -1 });
      } catch {
        return '';
      }
    }

    return '';
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

    if (!user?.email) {
      addNotification('User not authenticated. Please log in again.', 'error');
      return;
    }

    setSaving(true);
    try {
      const normalizedName = serviceName.trim();
      let normalizedParsed = parsedYaml;
      let normalizedYaml = yamlContent;

      // Keep YAML definition.name aligned with the UI name field.
      if (normalizedParsed.name !== normalizedName) {
        normalizedParsed = {
          ...normalizedParsed,
          name: normalizedName,
        };
        normalizedYaml = YAML.dump(normalizedParsed, { noRefs: true, lineWidth: -1 });
        setParsedYaml(normalizedParsed);
        setYamlContent(normalizedYaml);
      }

      const serviceIdentifier = normalizedParsed.id || normalizedParsed.serviceId;
      if (!serviceIdentifier) {
        addNotification('YAML must include an id (or legacy serviceId) before saving', 'error');
        return;
      }

      const serviceData = {
        name: normalizedName,
        yaml: normalizedYaml,
        type: normalizedParsed.type,
        id: serviceIdentifier,
        serviceId: serviceIdentifier,
        initiator: user.email,
        schemaVersion: schemaValidator.getSchemaVersion() || undefined,
        validatedAt: new Date().toISOString(),
      };

      if (isEditingExisting && selectedServiceId) {
        await api.updateService(selectedServiceId, serviceData);
        addNotification(`Service "${serviceName}" updated successfully!`, 'success');
        console.log('✅ Service updated with schema version:', schemaValidator.getSchemaVersion());
      } else {
        await api.createService(serviceData);
        addNotification(`Service "${serviceName}" created successfully!`, 'success');
        console.log('✅ Service created with schema version:', schemaValidator.getSchemaVersion());
      }
      
      // Reload services list
      const response = await api.getServices();
      setServices(response.services || []);
      
      setServiceName('');
      setYamlContent('');
      setParsedYaml(null);
      setSchemaValidationErrors([]);
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
      const yamlToLoad = getServiceYamlFromService(service);
      if (!yamlToLoad) {
        addNotification('Could not load YAML/definition for this service', 'error');
        return;
      }

      setSelectedServiceId(serviceId);
      setYamlContent(yamlToLoad);
      validateAndParse(yamlToLoad);
      try {
        const parsed = YAML.load(yamlToLoad) as any;
        setServiceName(service.name || parsed?.name || '');
      } catch {
        setServiceName(service.name || '');
      }
      setIsEditingExisting(true);
      setTabValue(0);
    }
  };

  const handleCreateNew = () => {
    setServiceName('');
    setYamlContent('');
    setParsedYaml(null);
    setSchemaValidationErrors([]);
    setSelectedServiceId('');
    setIsEditingExisting(false);
  };

  const handleReloadSchema = async () => {
    try {
      setSchemaReloading(true);
      setSchemaError('');
      
      console.log('🔄 Calling /api/admin/schema/reload...');
      await api.reloadSchema();
      console.log('✅ Reload successful, fetching latest schema...');
      
      // Fetch the latest schema after reload
      const schemaData = await api.getLatestSchemaVersion();
      schemaValidator.setSchema(schemaData.schema, schemaData.version);
      const version = schemaData.version || 'unknown';
      setSchemaVersion(version);
      
      // Verify reload worked
      const validatorVersion = schemaValidator.getSchemaVersion();
      console.log('✅ Schema reloaded and updated:', {
        newVersion: version,
        validatorVersion: validatorVersion,
        match: version === validatorVersion,
        timestamp: schemaData.timestamp,
      });
      
      addNotification(`Schema v${version} reloaded successfully`, 'success');
    } catch (err: any) {
      console.error('❌ Error reloading schema:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setSchemaError('Failed to reload schema');
      addNotification('Failed to reload schema from MongoDB', 'error');
    } finally {
      setSchemaReloading(false);
    }
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

  const basicTemplate = `id: SERV-001
type: service-name
name: My Service
description: Brief service description

envelopes:
  request:
    required: true
    parameters:
      firstName:
        type: String
        required: true
        minLength: 2
        maxLength: 100
  
  approval:
    required: true
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
    required: true
    tasks:
      - name: verify_request
        type: api_call
        method: POST
        url: https://api.example.com/verify
        timeout: 30000
        retries: 1
        successCodes: [200, 201]
  
  delivery:
    required: true
    deliveryMethods:
      email:
        enabled: true
        subject: "Service Update - {{requestId}}"
        recipient: "{{email}}"
  
  feedback:
    required: true
    expiryDays: 30`;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Service Builder
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Create new service definitions using YAML format
            </Typography>
          </Box>
          
          {/* Schema Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {schemaLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="caption">Loading Schema...</Typography>
              </Box>
            ) : schemaError ? (
              <Tooltip title={schemaError}>
                <Chip
                  icon={<WarningIcon />}
                  label="Schema: Local Only"
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              </Tooltip>
            ) : (
              <Tooltip title={`Using JSON Schema v${schemaVersion}`}>
                <Chip
                  icon={<VerifiedIcon />}
                  label={`Schema v${schemaVersion}`}
                  size="small"
                  color="success"
                  variant="filled"
                  sx={{ color: 'white' }}
                />
              </Tooltip>
            )}
            
            {/* Reload Schema Button */}
            <Tooltip title="Reload schema from MongoDB">
              <IconButton
                size="small"
                onClick={handleReloadSchema}
                disabled={schemaReloading}
                sx={{
                  ml: 1,
                  color: '#1976d2',
                  '&:hover': {
                    backgroundColor: '#f0f0f0',
                  },
                }}
              >
                <RefreshIcon
                  fontSize="small"
                  sx={{
                    animation: schemaReloading ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {isValid ? (
                  <Alert icon={<CheckIcon />} severity="success">
                    ✓ YAML is valid and ready to save
                  </Alert>
                ) : (
                  <>
                    {/* Schema Validation Errors */}
                    {schemaValidationErrors.length > 0 && (
                      <Alert icon={<ErrorIcon />} severity="error" sx={{ textAlign: 'left' }}>
                        <Stack spacing={2} sx={{ textAlign: 'left' }}>
                          <Typography variant="subtitle2" sx={{ textAlign: 'left', fontWeight: 600 }}>
                            Validation Errors ({schemaValidationErrors.length}):
                          </Typography>
                          
                          {Array.from(organizeErrorsBySection(schemaValidationErrors)).map(([section, sectionErrors]) => (
                            <Box key={section}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  color: 'error.dark',
                                  mb: 1,
                                  fontSize: '0.9rem',
                                }}
                              >
                                📍 {section.charAt(0).toUpperCase() + section.slice(1)}
                              </Typography>
                              <Stack component="ul" spacing={0.75} sx={{ textAlign: 'left', pl: 3, m: 0 }}>
                                {sectionErrors.map((error, idx) => (
                                  <Box
                                    component="li"
                                    key={idx}
                                    sx={{
                                      pb: 0.5,
                                      borderLeft: '2px solid #d32f2f',
                                      pl: 1.5,
                                    }}
                                  >
                                    <Typography variant="body2" sx={{ textAlign: 'left', fontFamily: 'monospace' }}>
                                      <strong>{formatErrorPath(error.path)}</strong>
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{ textAlign: 'left', color: '#666', display: 'block', mt: 0.25 }}
                                    >
                                      {error.message}
                                    </Typography>
                                  </Box>
                                ))}
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      </Alert>
                    )}
                  </>
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
                          {getServiceIdFromService(service)}
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
{`id: SERV-001
type: service-type
name: Service Name
description: Brief description

envelopes:
  request:
    required: true
    parameters:
      param1: { type: String, required: true }
      param2: { type: Number, required: false }
  
  approval:
    required: true|false
    approvalRules:
      type: all_must_approve | any_one | specific_approver | complex
      requiredApprovers: [emails]
    expiryHours: 48
  
  payment:
    required: true|false
    charges:
      - item: Item Name
        amount: 1000
        currency: PHP
  
  processing:
    required: true|false
    tasks:
      - name: task_name
        type: api_call
        method: GET
        url: https://...
        timeout: 30000
        retries: 1
        successCodes: [200]
  
  delivery:
    required: true|false
    deliveryMethods:
      email: { enabled: true, recipient: "{{email}}" }
      physical_mail: { enabled: false }
      pickup: { enabled: false }
  
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
                code: `id: SERV-001
type: transcript-of-records
name: Transcript of Records
description: Official academic transcript request

envelopes:
  request:
    required: true
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
    required: true
    approvalRules:
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
    required: true
    tasks:
      - name: verify_student
        type: api_call
        method: GET
        url: https://api.registrar.local/verify
        timeout: 30000
        retries: 1
        successCodes: [200]
      - name: pull_transcript
        type: api_call
        method: GET
        url: https://api.registrar.local/transcript
        timeout: 30000
        retries: 1
        successCodes: [200]
      - name: generate_pdf
        type: api_call
        method: POST
        url: https://api.generator.local/pdf
        timeout: 30000
        retries: 1
        successCodes: [200, 201]
  
  delivery:
    required: true
    deliveryMethods:
      email:
        enabled: true
        subject: "Your Transcript Request - {{requestId}}"
        recipient: "{{email}}"
  
  feedback:
    required: false`,
              },
              {
                title: '🏥 Clinic Visit Appointment',
                subtitle: 'Simple service with single approver and no payment',
                complexity: 'Simple',
                code: `id: SERV-002
type: clinic-appointment
name: Clinic Visit Appointment
description: Schedule appointment at campus clinic

envelopes:
  request:
    required: true
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
    required: true
    approvalRules:
      type: specific_approver
      specificApprover: clinic@mapua.edu.ph
    expiryHours: 24
  
  payment:
    required: false
  
  processing:
    required: true
    tasks:
      - name: verify_student_active
        type: api_call
        method: POST
        url: https://api.registrar.local/verify-active
        timeout: 30000
        retries: 1
        successCodes: [200]
      - name: check_clinic_availability
        type: api_call
        method: POST
        url: https://api.clinic.local/availability
        timeout: 30000
        retries: 1
        successCodes: [200]
  
  delivery:
    required: true
    deliveryMethods:
      email:
        enabled: true
        recipient: "{{email}}"
  
  feedback:
    required: true`,
              },
              {
                title: '🏨 On-Campus Housing Rental',
                subtitle: 'Multi-approver with itemized payment and multiple tasks',
                complexity: 'Advanced',
                code: `id: SERV-003
type: housing-rental
name: On-Campus Housing Rental
description: Apply for campus dormitory housing

envelopes:
  request:
    required: true
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
    required: true
    approvalRules:
      type: all_must_approve
      requiredApprovers:
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
    required: true
    tasks:
      - name: verify_eligibility
        type: api_call
        method: POST
        url: https://api.housing.local/verify-eligibility
        timeout: 30000
        retries: 1
        successCodes: [200]
      - name: check_availability
        type: api_call
        method: GET
        url: https://api.housing.local/availability
        timeout: 30000
        retries: 1
        successCodes: [200]
      - name: generate_contract
        type: api_call
        method: POST
        url: https://api.housing.local/generate-contract
        timeout: 30000
        retries: 1
        successCodes: [200, 201]
      - name: record_occupancy
        type: api_call
        method: POST
        url: https://api.housing.local/occupancy
        timeout: 30000
        retries: 1
        successCodes: [200, 201]
  
  delivery:
    required: true
    deliveryMethods:
      email:
        enabled: true
        recipient: "{{email}}"
  
  feedback:
    required: true`,
              },
              {
                title: '📋 Course Withdrawal Request',
                subtitle: 'Uses dropdown for course selection and any_one approval',
                complexity: 'Intermediate',
                code: `id: SERV-004
type: course-withdrawal
name: Course Withdrawal Request
description: Request withdrawal from an enrolled course

envelopes:
  request:
    required: true
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
    required: true
    approvalRules:
      type: any_one
      requiredApprovers:
        - advisor1@mapua.edu.ph
        - advisor2@mapua.edu.ph
        - advisor3@mapua.edu.ph
      threshold: 1
    expiryHours: 48
  
  payment:
    required: false
  
  processing:
    required: true
    tasks:
      - name: verify_enrollment
        type: api_call
        method: GET
        url: https://api.registrar.local/enrollment
        timeout: 30000
        retries: 1
        successCodes: [200]
      - name: update_transcript
        type: api_call
        method: POST
        url: https://api.registrar.local/update-transcript
        timeout: 30000
        retries: 1
        successCodes: [200, 201]
  
  delivery:
    required: true
    deliveryMethods:
      email:
        enabled: true
        recipient: "{{email}}"
  
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
                <Box>3. Modify id, type, names, parameters for your service</Box>
                <Box>4. Update approvers, charges, and processing tasks as needed</Box>
                <Box>5. Create email templates in the <strong>Email Templates</strong> tab matching the templateId references</Box>
                <Box>6. Click <strong>Validate & Save</strong> in the Builder</Box>
              </Stack>
            </Alert>

            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                ⚠️ Important: id Format
              </Typography>
              <Typography variant="body2">
                Use <code>id</code> for the service identifier (legacy <code>serviceId</code> is still accepted).
                Preferred format remains <code>SERV-###</code> (e.g., SERV-001, SERV-100).
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
                      {getServiceIdFromService(serviceToDelete)}
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
