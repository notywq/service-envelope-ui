/**
 * Enhanced Service Request Page
 * Improved form with full support for all parameter types
 * Validates client-side and displays dynamic fields based on service definition
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as SuccessIcon,
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

  const selectedService = services.find((s) => s.id === formData.service);

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    setFormData({ service: serviceId });
    setFormErrors({});
    setActiveStep(0);
    
    // Parse service definition to extract parameters
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

        if (serviceSchema?.request?.parameters) {
          setServiceParameters(serviceSchema.request.parameters);
        } else {
          setServiceParameters({});
        }
      } catch (err) {
        console.error('Error parsing service definition:', err);
        setServiceParameters({});
        addNotification('Error parsing service definition', 'warning');
      }
    } else {
      setServiceParameters({});
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
    if (activeStep === 0 && !formData.service) {
      addNotification('Please select a service', 'warning');
      return;
    }
    if (activeStep === 1 && !validateForm()) {
      addNotification('Please fix the errors before proceeding', 'warning');
      return;
    }
    if (activeStep === 2 && !agreedToTerms) {
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

      const result = await api.submitServiceRequest(formData.service, parameters);
      setSubmittedRequestId(result.id);
      setSubmitted(true);
      addNotification('Service request submitted successfully!', 'success');
    } catch (err: any) {
      console.error('Error submitting request:', err);
      addNotification(
        err.response?.data?.error || 'Failed to submit request',
        'error'
      );
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
          <StepLabel>Review & Submit</StepLabel>
        </Step>
      </Stepper>

      <Paper sx={{ p: 3 }}>
        {/* Step 1: Select Service */}
        {activeStep === 0 && (
          <Stack spacing={3}>
            <Typography variant="h6">Choose a Service</Typography>
            <Select
              value={formData.service}
              onChange={(e) => handleServiceChange(e.target.value)}
              displayEmpty
              fullWidth
            >
              <MenuItem value="">
                <em>Select a service...</em>
              </MenuItem>
              {services.map((service) => (
                <MenuItem key={service.id} value={service.id}>
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
        {activeStep === 2 && (
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
          {activeStep < 2 && (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={submitLoading}
            >
              Next
            </Button>
          )}

          {activeStep === 2 && (
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
