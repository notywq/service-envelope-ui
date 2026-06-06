/**
 * Enhanced Service Request Page
 * Improved form with full support for all parameter types
 * Validates client-side and displays dynamic fields based on service definition
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
  Stack,
  Paper,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableRow,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  TextField,
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as SuccessIcon,
  LocalShipping as ShippingIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import YAML from 'js-yaml';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { useAuth } from '../hooks/useAuth';
import { DynamicFormField } from '../components/DynamicFormField';
import type { ServiceDefinition, ServiceDefinitionWithSchema, ParameterSchema } from '../types';

interface FormData {
  service: string;
  [key: string]: any;
}

interface FormErrors {
  [key: string]: string;
}

interface DeliveryInfo {
  deliveryMethods?: {
    email?: { enabled: boolean; fields?: Record<string, any>; recipient?: string; subject?: string };
    physical_mail?: { enabled: boolean; fields?: Record<string, any>; carrier?: string; estimatedDays?: number; costPercentage?: number };
    pickup?: { enabled: boolean; fields?: Record<string, any>; location?: string; hoursOfOperation?: string };
  };
}

export const EnhancedServiceRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: _user } = useAuth();
  const { addNotification } = useNotification();

  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({ service: '' });
  const [serviceParameters, setServiceParameters] = useState<Record<string, ParameterSchema>>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [activeStep, setActiveStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Delivery method state
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({});
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<'email' | 'physical_mail' | 'pickup' | ''>('');
  const [deliveryDetails, setDeliveryDetails] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.getServices();
        setServices(response.services || []);
      } catch (err: any) {
        console.error('Error loading services:', err);
        setError(err.response?.data?.error || 'Failed to load services');
        addNotification('Failed to load services', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, [addNotification]);

  // If a serviceId is provided via query param, pre-select that service once services load
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const serviceId = params.get('serviceId');
    if (serviceId && services.length > 0) {
      const matched = services.find((s) => s.serviceId === serviceId || s.id === serviceId);
      if (matched) {
        // use a small timeout to allow services parsing to finish
        setTimeout(() => handleServiceChange(matched), 0);
      }
    }
  }, [location.search, services]);

  const selectedService = services.find((s) => s.serviceId === formData.service);

  const handleServiceChange = (service: ServiceDefinition) => {
    // Update formData with the service ID
    setFormData(prev => {
      const updated = { ...prev, service: service.serviceId };
      return updated;
    });
    
    setFormErrors({});
    setActiveStep(0);
    setSelectedDeliveryMethod('');
    setDeliveryDetails({});
    
    // Parse service definition to extract parameters and delivery info
    if (service) {
      try {
        let serviceSchema: ServiceDefinitionWithSchema | null = null;

        // Try to parse YAML if available
        if (service.yaml) {
          const parsed = YAML.load(service.yaml) as any;
          serviceSchema = parsed;
        } else if (service.envelopes?.request) {
          serviceSchema = { request: service.envelopes.request } as any;
        }

        // Parameters are typically at envelopes.request.parameters or request.parameters
        let parameters = (serviceSchema as any)?.envelopes?.request?.parameters;
        if (!parameters) {
          parameters = serviceSchema?.request?.parameters;
        }

        if (parameters) {
          setServiceParameters(parameters);
        } else {
          setServiceParameters({});
        }

        // Extract delivery information from envelopes.delivery
        let delivery = (serviceSchema as any)?.envelopes?.delivery || {};
        setDeliveryInfo(delivery);
      } catch (err) {
        console.error('Error parsing service definition:', err);
        setServiceParameters({});
        setDeliveryInfo({});
        addNotification('Error parsing service definition', 'warning');
      }
    } else {
      setServiceParameters({});
      setDeliveryInfo({});
    }
  };

  const validateField = (key: string, value: any, schema: ParameterSchema): string => {
    if (schema.required && (value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
      return `${key} is required`;
    }

    if (schema.type === 'String') {
      const strSchema = schema as any;
      if (strSchema.minLength && value && value.length < strSchema.minLength) {
        return `Minimum ${strSchema.minLength} characters required`;
      }
      if (strSchema.maxLength && value && value.length > strSchema.maxLength) {
        return `Maximum ${strSchema.maxLength} characters allowed`;
      }
      if (strSchema.pattern && value && !new RegExp(strSchema.pattern).test(value)) {
        return 'Invalid format';
      }
    }

    if (schema.type === 'Number') {
      const numSchema = schema as any;
      const numValue = parseFloat(value);
      if (numSchema.min !== undefined && numValue < numSchema.min) {
        return `Minimum value is ${numSchema.min}`;
      }
      if (numSchema.max !== undefined && numValue > numSchema.max) {
        return `Maximum value is ${numSchema.max}`;
      }
    }

    return '';
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let hasErrors = false;

    Object.entries(serviceParameters).forEach(([key, schema]) => {
      const value = formData[key];
      const error = validateField(key, value, schema);
      if (error) {
        errors[key] = error;
        hasErrors = true;
      }
    });

    setFormErrors(errors);
    return !hasErrors;
  };

  const handleParameterChange = (key: string, value: any) => {
    setFormData({ ...formData, [key]: value });
    // Clear error for this field on change
    if (formErrors[key]) {
      setFormErrors({ ...formErrors, [key]: '' });
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && (!formData.service || !selectedService)) {
      addNotification('Please select a service', 'warning');
      return;
    }
    if (activeStep === 1 && !validateForm()) {
      addNotification('Please fix the errors before proceeding', 'warning');
      return;
    }
    if (activeStep === 2 && (Object.keys(deliveryInfo.deliveryMethods || {}).length > 0) && !selectedDeliveryMethod) {
      addNotification('Please select a delivery method', 'warning');
      return;
    }
    if (activeStep === 3 && !agreedToTerms) {
      addNotification('Please agree to the terms to continue', 'warning');
      return;
    }
    
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.service) {
      addNotification('Please select a service', 'warning');
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (!agreedToTerms) {
      addNotification('Please agree to the terms and conditions', 'warning');
      return;
    }

    try {
      setSubmitLoading(true);
      const parameters: Record<string, any> = { ...formData };
      delete parameters.service;

      // Step 1: Submit request with parameters (NO delivery method)
      console.log('📋 Step 1: Submitting request with parameters...');
      const resultAny: any = await api.submitServiceRequest(formData.service, parameters, 'Service Envelope Web UI');
      console.log('✅ Request submitted:', resultAny);
      const requestId: string | undefined =
        resultAny?.requestId || resultAny?.requestId === 0 ? resultAny.requestId : resultAny?.id || resultAny?.request?.id;
      setSubmittedRequestId(requestId || '');
      
      // Step 2: Submit delivery details (if available)
      if (requestId && selectedDeliveryMethod && (Object.keys(deliveryInfo.deliveryMethods || {}).length || 0) > 0) {
        try {
          const methodConfig: any = (deliveryInfo.deliveryMethods as any)?.[selectedDeliveryMethod] || {};

          let methodSpecificDetails: Record<string, any> = {};
          if (selectedDeliveryMethod === 'email') {
            methodSpecificDetails = {
              recipient: deliveryDetails.recipient || formData.email || methodConfig.recipient,
              subject: deliveryDetails.subject || methodConfig.subject,
              templateId: methodConfig.emailTemplateId,
            };
          } else if (selectedDeliveryMethod === 'physical_mail') {
            methodSpecificDetails = {
              address: deliveryDetails.address || deliveryDetails.mailingAddress,
              carrier: deliveryDetails.carrier || methodConfig.carrier,
              requiresSignature: methodConfig.requiresSignature,
              estimatedDays: methodConfig.estimatedDays,
            };
          } else if (selectedDeliveryMethod === 'pickup') {
            methodSpecificDetails = {
              location: deliveryDetails.location || methodConfig.location,
              hoursOfOperation: deliveryDetails.hoursOfOperation || methodConfig.hoursOfOperation,
              pickupDeadlineAt: deliveryDetails.pickupDeadlineAt,
            };
          }

          // Include any additional dynamic fields captured from UI.
          methodSpecificDetails = {
            ...methodSpecificDetails,
            ...deliveryDetails,
          };

          // Remove undefined/empty values before sending.
          Object.keys(methodSpecificDetails).forEach((key) => {
            const value = methodSpecificDetails[key];
            if (value === undefined || value === null || value === '') {
              delete methodSpecificDetails[key];
            }
          });

          const deliveryPayload = {
            [selectedDeliveryMethod]: methodSpecificDetails,
          };

          console.log('📦 Step 2: Submitting delivery details...');
          console.log('Delivery payload:', {
            requestId,
            deliveryMethod: selectedDeliveryMethod,
            deliveryDetails: deliveryPayload,
          });
          await api.submitDeliveryDetails(
            requestId,
            selectedDeliveryMethod as 'email' | 'physical_mail' | 'pickup',
            deliveryPayload
          );
          
          console.log('✅ Delivery details submitted successfully');
          addNotification('Request and delivery details submitted successfully!', 'success');
        } catch (err: any) {
          console.error('❌ Error submitting delivery details:', {
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data,
            message: err.message,
          });
          // Don't fail the whole submission, just warn
          const errorMessage = err.response?.data?.error || err.message || 'Unknown error';
          addNotification(`Request submitted, but delivery details failed: ${errorMessage}`, 'warning');
        }
      }
      
      setSubmitted(true);
      if (!selectedDeliveryMethod || !deliveryInfo.deliveryMethods || Object.keys(deliveryInfo.deliveryMethods).length === 0) {
        addNotification('Service request submitted successfully!', 'success');
      }
    } catch (err: any) {
      console.error('Error submitting request:', err);
      const resp = err.response?.data;
      if (resp) {
        const messages: string[] = [];
        if (resp.error) messages.push(resp.error);
        if (Array.isArray(resp.validationErrors) && resp.validationErrors.length) {
          messages.push(...resp.validationErrors);
        }
        if (Array.isArray(resp.validationDetails) && resp.validationDetails.length) {
          messages.push(
            ...resp.validationDetails.map((d: any) => d.message || `${d.field || 'field'}: ${d.rule || ''}`)
          );
        }

        const messageToShow = messages.length ? messages.join(' — ') : (resp.error || 'Failed to submit request');
        setError(messageToShow);
        addNotification(messageToShow, 'error');
      } else {
        addNotification('Failed to submit request', 'error');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (submitted) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 4 }}>
        <Card sx={{ textAlign: 'center', py: 4 }}>
          <CardContent>
            <SuccessIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Request Submitted Successfully
            </Typography>
            <Typography color="textSecondary" gutterBottom>
              Your service request has been received.
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mt: 2 }}>
              Request ID: <code>{submittedRequestId}</code>
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 2 }}>
              A confirmation email has been sent to you. You can track your request using the ID above.
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate(`/requests/${submittedRequestId}`)}
              >
                View Request
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ textTransform: 'none' }}
        >
          Back to Dashboard
        </Button>
      </Box>

      {/* Title */}
      <Box>
        <Typography variant="h4" gutterBottom>
          Submit Service Request
        </Typography>
        <Typography color="textSecondary">
          Fill out the form below to submit a new service request
        </Typography>
        {error && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ py: 2 }}>
        <Step>
          <StepLabel>Select Service</StepLabel>
        </Step>
        <Step>
          <StepLabel>Enter Details</StepLabel>
        </Step>
        <Step>
          <StepLabel>Choose Delivery Method</StepLabel>
        </Step>
        <Step>
          <StepLabel>Review & Submit</StepLabel>
        </Step>
      </Stepper>

      <Paper sx={{ p: 3 }}>
        {/* Step 1: Select Service */}
        {activeStep === 0 && (
          <Stack spacing={3}>
            <Typography variant="h6">Choose a Service</Typography>
            <Select
              value={formData.service || ''}
              onChange={(e) => {
                const selected = services.find((s) => s.serviceId === e.target.value);
                if (selected) {
                  handleServiceChange(selected);
                }
              }}
              displayEmpty
              fullWidth
            >
              <MenuItem value="">
                <em>Select a service...</em>
              </MenuItem>
              {services.map((service) => (
                <MenuItem key={service.serviceId} value={service.serviceId}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {service.name}
                    </Typography>
                    {service.description && (
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                        {service.description}
                      </Typography>
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>

            {selectedService && (
              <Card sx={{ backgroundColor: '#f5f5f5' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Service Details
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Name:</strong> {selectedService.name}
                  </Typography>
                  {selectedService.description && (
                    <Typography variant="body2">
                      <strong>Description:</strong> {selectedService.description}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Stack>
        )}

        {/* Step 2: Enter Details */}
        {activeStep === 1 && selectedService && (
          <Stack spacing={3}>
            <Typography variant="h6">Enter Request Details</Typography>

            {Object.keys(serviceParameters).length === 0 ? (
              <Alert severity="info">No additional details needed for this service.</Alert>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                {Object.entries(serviceParameters).map(([fieldName, schema]) => (
                  <Box key={fieldName}>
                    <DynamicFormField
                      fieldName={fieldName}
                      schema={schema}
                      value={formData[fieldName]}
                      onChange={(value) => handleParameterChange(fieldName, value)}
                      error={formErrors[fieldName]}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Stack>
        )}

        {/* Step 3: Review & Submit */}
        {activeStep === 3 && (
          <Stack spacing={3}>
            <Typography variant="h6">Review Your Request</Typography>

            <Card sx={{ backgroundColor: '#f5f5f5' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Service
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {selectedService?.name}
                </Typography>
              </CardContent>
            </Card>

            {Object.keys(serviceParameters).length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Request Details
                  </Typography>
                  <Table size="small" sx={{ mt: 2 }}>
                    <TableBody>
                      {Object.entries(serviceParameters).map(([fieldName]) => (
                        <TableRow key={fieldName}>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1')}
                          </TableCell>
                          <TableCell>{String(formData[fieldName] ?? '—')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {selectedDeliveryMethod && (Object.keys(deliveryInfo.deliveryMethods || {}).length || 0) > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Delivery Method
                  </Typography>
                  <Table size="small" sx={{ mt: 2 }}>
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 500 }}>Method</TableCell>
                        <TableCell>
                          {selectedDeliveryMethod === 'email' && 'Email'}
                          {selectedDeliveryMethod === 'physical_mail' && 'Physical Mail'}
                          {selectedDeliveryMethod === 'pickup' && 'Pickup'}
                        </TableCell>
                      </TableRow>
                      {Object.entries(deliveryDetails).length > 0 && (
                        <TableRow>
                          <TableCell sx={{ fontWeight: 500 }}>Details</TableCell>
                          <TableCell>
                            {Object.entries(deliveryDetails)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(' | ')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Alert severity="info">
              Please review your information carefully. Once submitted, you can modify your request through your
              dashboard.
            </Alert>

            <FormControlLabel
              control={
                <Checkbox
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
              }
              label="I agree to the terms and conditions and confirm that the information provided is accurate."
            />
          </Stack>
        )}

        {/* Step 3: Choose Delivery Method */}
        {activeStep === 2 && (
          <Stack spacing={3}>
            <Typography variant="h6">Choose Delivery Method</Typography>

            {!deliveryInfo.deliveryMethods || Object.keys(deliveryInfo.deliveryMethods).length === 0 ? (
              <Alert severity="info">
                This service doesn't require delivery. Click Next to proceed to review.
              </Alert>
            ) : (
              <>
                <Alert severity="info">
                  Select how you would like to receive your documents. You can choose between email, physical mail, or pickup.
                </Alert>

                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                    Delivery Method
                  </FormLabel>
                  <RadioGroup
                    value={selectedDeliveryMethod}
                    onChange={(e) => {
                      setSelectedDeliveryMethod(e.target.value as 'email' | 'physical_mail' | 'pickup');
                      setDeliveryDetails({});
                    }}
                  >
                    {/* Email Option */}
                    {deliveryInfo.deliveryMethods?.email?.enabled && (
                      <FormControlLabel
                        value="email"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EmailIcon sx={{ fontSize: 20 }} />
                            <Typography>Email</Typography>
                          </Box>
                        }
                      />
                    )}

                    {/* Physical Mail Option */}
                    {deliveryInfo.deliveryMethods?.physical_mail?.enabled && (
                      <FormControlLabel
                        value="physical_mail"
                        control={<Radio />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ShippingIcon sx={{ fontSize: 20 }} />
                            <Typography>Physical Mail</Typography>
                          </Box>
                        }
                      />
                    )}

                    {/* Pickup Option */}
                    {deliveryInfo.deliveryMethods?.pickup?.enabled && (
                      <FormControlLabel
                        value="pickup"
                        control={<Radio />}
                        label="Pickup"
                      />
                    )}
                  </RadioGroup>
                </FormControl>

                {/* Email Details */}
                {selectedDeliveryMethod === 'email' && (
                  <Card sx={{ backgroundColor: '#f9f9f9' }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Email Details
                      </Typography>
                      <Stack spacing={2}>
                        <Box sx={{ p: 1.5, backgroundColor: '#fff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                          <Typography variant="caption" sx={{ color: '#666' }}>Recipient Email</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{formData.email || 'No email provided'}</Typography>
                        </Box>
                        {Object.entries(deliveryInfo.deliveryMethods?.email?.fields || {}).map(([field, config]: [string, any]) => (
                          <TextField
                            key={field}
                            fullWidth
                            label={config.label || field.charAt(0).toUpperCase() + field.slice(1)}
                            type={config.type === 'Number' ? 'number' : 'text'}
                            value={deliveryDetails[field] || ''}
                            onChange={(e) => setDeliveryDetails({ ...deliveryDetails, [field]: e.target.value })}
                            placeholder={config.placeholder || config.description || ''}
                            required={config.required}
                          />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                {/* Physical Mail Details */}
                {selectedDeliveryMethod === 'physical_mail' && (
                  <Card sx={{ backgroundColor: '#f9f9f9' }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Mailing Address & Shipping Info
                      </Typography>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                          <Box sx={{ p: 1.5, backgroundColor: '#fff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                            <Typography variant="caption" sx={{ color: '#666' }}>Carrier</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{deliveryInfo.deliveryMethods?.physical_mail?.carrier || 'Standard'}</Typography>
                          </Box>
                          <Box sx={{ p: 1.5, backgroundColor: '#fff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                            <Typography variant="caption" sx={{ color: '#666' }}>Est. Delivery Days</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{deliveryInfo.deliveryMethods?.physical_mail?.estimatedDays || '5-7'} days</Typography>
                          </Box>
                        </Box>
                        {Object.entries(deliveryInfo.deliveryMethods?.physical_mail?.fields || {}).map(([field, config]: [string, any]) => (
                          <TextField
                            key={field}
                            fullWidth
                            label={config.label || field.charAt(0).toUpperCase() + field.slice(1)}
                            type={config.type === 'Number' ? 'number' : 'text'}
                            multiline={field === 'mailingAddress' || field === 'address'}
                            rows={field === 'mailingAddress' || field === 'address' ? 3 : 1}
                            value={deliveryDetails[field] || ''}
                            onChange={(e) => setDeliveryDetails({ ...deliveryDetails, [field]: e.target.value })}
                        placeholder={config.placeholder || config.description || ''}
                        required={config.required}
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* Pickup Details */}
            {selectedDeliveryMethod === 'pickup' && (
              <Card sx={{ backgroundColor: '#f9f9f9' }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Pickup Information
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ p: 1.5, backgroundColor: '#fff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                      <Typography variant="caption" sx={{ color: '#666' }}>Location</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{deliveryInfo.deliveryMethods?.pickup?.location || 'TBD'}</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, backgroundColor: '#fff', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                      <Typography variant="caption" sx={{ color: '#666' }}>Hours of Operation</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{deliveryInfo.deliveryMethods?.pickup?.hoursOfOperation || 'Standard hours'}</Typography>
                    </Box>
                    {Object.entries(deliveryInfo.deliveryMethods?.pickup?.fields || {}).map(([field, config]: [string, any]) => (
                      <TextField
                        key={field}
                        fullWidth
                        label={config.label || field.charAt(0).toUpperCase() + field.slice(1)}
                        type={config.type === 'date' ? 'date' : 'text'}
                        value={deliveryDetails[field] || ''}
                        onChange={(e) => setDeliveryDetails({ ...deliveryDetails, [field]: e.target.value })}
                        placeholder={config.placeholder || config.description || ''}
                        required={config.required}
                        slotProps={{
                          inputLabel: { shrink: true },
                        }}
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
              </>
            )}
          </Stack>
        )}
      </Paper>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0 || submitLoading}
        >
          Back
        </Button>

        <Stack direction="row" spacing={2}>
          {activeStep < 3 && (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={submitLoading}
            >
              Next
            </Button>
          )}

          {activeStep === 3 && (
            <Button
              variant="contained"
              color="success"
              startIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={submitLoading || !agreedToTerms}
            >
              {submitLoading ? <CircularProgress size={24} /> : 'Submit Request'}
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  );
};
