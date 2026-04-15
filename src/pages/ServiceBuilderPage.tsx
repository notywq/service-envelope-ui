/**
 * Service Builder Page
 * Create and submit new service requests
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
  Stack,
  Divider,
  Paper,
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import YAML from 'js-yaml';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { useAuth } from '../hooks/useAuth';
import type { ServiceDefinition } from '../types';

interface FormData {
  service: string;
  [key: string]: any;
}

export const ServiceBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({ service: '' });
  const [serviceParameters, setServiceParameters] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.getServices();
        console.log('🔍 Services loaded from API:', response);
        console.log('📋 Services count:', response.services.length);
        response.services.forEach((service: any) => {
          console.log(`  - ${service.id}: yaml present?`, !!service.yaml);
          if (service.yaml) {
            console.log(`    YAML preview:`, service.yaml.substring(0, 200));
          }
        });
        setServices(response.services);
      } catch (err: any) {
        console.error('❌ Error loading services:', err);
        setError(err.response?.data?.error || 'Failed to load services');
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  const selectedService = services.find((s) => s.id === formData.service);

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    console.log('📍 Service selected:', serviceId);
    console.log('   Service object:', service);
    setFormData({ service: serviceId });
    
    // Parse YAML and extract parameters from request envelope
    if (service && service.yaml) {
      try {
        console.log('📖 Parsing YAML for service:', serviceId);
        console.log('   YAML content length:', service.yaml.length);
        const parsed = YAML.load(service.yaml) as any;
        console.log('   ✅ YAML parsed:', parsed);
        const params = parsed.envelopes?.request?.parameters || {};
        console.log('   📦 Extracted parameters:', params);
        console.log('   Parameter keys:', Object.keys(params));
        setServiceParameters(params);
      } catch (err) {
        console.error('❌ Error parsing YAML:', err);
        setServiceParameters({});
      }
    } else {
      console.warn('⚠️  Service or YAML not found');
      console.log('   Service exists?', !!service);
      console.log('   Service.yaml exists?', service ? !!service.yaml : 'N/A');
      setServiceParameters({});
    }
  };

  const handleParameterChange = (key: string, value: any) => {
    setFormData({ ...formData, [key]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.service) {
      addNotification('Please select a service', 'warning');
      return;
    }

    try {
      setSubmitLoading(true);
      const parameters: Record<string, any> = { ...formData };
      delete parameters.service;

      const result = await api.submitServiceRequest(formData.service, parameters);
      addNotification('Service request submitted successfully!', 'success');
      setTimeout(() => navigate(`/requests/${result.id}`), 1500);
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Failed to submit request', 'error');
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
          Back
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          New Service Request
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Service Selection */}
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Select Service
            </Typography>
            <Select
              fullWidth
              value={formData.service}
              onChange={(e) => handleServiceChange(e.target.value)}
              displayEmpty
              disabled={submitLoading}
            >
              <MenuItem value="">-- Choose a service --</MenuItem>
              {services.map((service) => (
                <MenuItem key={service.id} value={service.id}>
                  {service.name}
                </MenuItem>
              ))}
            </Select>
            {selectedService && (
              <Paper elevation={0} sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {selectedService.description}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Type: <strong>{selectedService.type}</strong>
                </Typography>
              </Paper>
            )}
          </Paper>
        </Box>

        {/* Requester Info */}
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Requester Info
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Email
                </Typography>
                <Typography variant="body2">{user?.email}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Name
                </Typography>
                <Typography variant="body2">{user?.name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Role
                </Typography>
                <Typography variant="body2">{user?.role}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* Parameters Form */}
      {selectedService && (
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
              Service Parameters
            </Typography>
            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                {/* Dynamically generated fields from YAML */}
                {Object.entries(serviceParameters).length > 0 ? (
                  Object.entries(serviceParameters).map(([paramKey]) => (
                    <TextField
                      key={paramKey}
                      fullWidth
                      label={paramKey.charAt(0).toUpperCase() + paramKey.slice(1).replace(/([A-Z])/g, ' $1')}
                      placeholder={`Enter ${paramKey}...`}
                      value={formData[paramKey] || ''}
                      onChange={(e) => handleParameterChange(paramKey, e.target.value)}
                      disabled={submitLoading}
                      required
                    />
                  ))
                ) : (
                  <Alert severity="info">
                    This service has no additional parameters defined.
                  </Alert>
                )}

                  {/* Generic remarks field */}
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Remarks / Additional Information"
                    placeholder="Add any additional details about this request..."
                    value={formData.remarks || ''}
                    onChange={(e) => handleParameterChange('remarks', e.target.value)}
                    disabled={submitLoading}
                  />

                  <Divider />

                  {/* Submit Buttons */}
                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/dashboard')}
                      disabled={submitLoading}
                      sx={{ flex: 1, textTransform: 'none' }}
                    >
                      Cancel
                    </Button>
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      startIcon={<SendIcon />}
                      disabled={submitLoading || !formData.service}
                      sx={{ textTransform: 'none', fontSize: '1rem', fontWeight: 600 }}
                    >
                      {submitLoading ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </Stack>
                </Stack>
              </form>
            </Paper>
          </Box>
        )}
    </Box>
  );
};
