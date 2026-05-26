/**
 * Delivery Tracking Page
 * Displays delivery status and options
 * Accessed via: /delivery/:requestId/tracking
 * Shows tracking information and delivery method selection for pending deliveries
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Stack,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  StoreMallDirectory as PickupIcon,
  Email as EmailIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import type { DeliveryTrackingInfo } from '../types';

interface DeliveryMethodSelection {
  type: 'email' | 'physical_mail' | 'pickup';
  details: Record<string, any>;
}

export const DeliveryTrackingPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [trackingData, setTrackingData] = useState<DeliveryTrackingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showMethodDialog, setShowMethodDialog] = useState(false);
  const [selectedMethod, _setSelectedMethod] = useState<DeliveryMethodSelection | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadDeliveryTracking = async () => {
      if (!requestId) {
        setError('No request ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await api.getDeliveryTracking(requestId);
        setTrackingData(response);
      } catch (err: any) {
        console.error('Error loading delivery tracking:', err);
        setError(err.response?.data?.error || 'Failed to load delivery information.');
      } finally {
        setLoading(false);
      }
    };

    loadDeliveryTracking();
  }, [requestId]);

  const handleSubmitMethod = async () => {
    if (!selectedMethod || !requestId) return;

    // Validate required fields based on method
    if (selectedMethod.type === 'email' && !formData.email) {
      addNotification('Email address is required', 'warning');
      return;
    }

    if (selectedMethod.type === 'physical_mail' && !formData.address) {
      addNotification('Mailing address is required', 'warning');
      return;
    }

    if (selectedMethod.type === 'pickup' && !formData.preferredDate) {
      addNotification('Preferred pickup date is required', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await api.selectDeliveryMethod(requestId, {
        type: selectedMethod.type,
        details: formData,
      });

      addNotification('Delivery method has been selected successfully', 'success');
      setShowMethodDialog(false);

      // Reload delivery tracking info
      const updated = await api.getDeliveryTracking(requestId);
      setTrackingData(updated);
    } catch (err: any) {
      addNotification(
        err.response?.data?.error || 'Failed to select delivery method. Please try again.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'in_transit':
        return 'info';
      case 'ready_for_pickup':
        return 'warning';
      case 'pending_selection':
        return 'default';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'email':
        return <EmailIcon />;
      case 'physical_mail':
        return <ShippingIcon />;
      case 'pickup':
        return <PickupIcon />;
      default:
        return <InfoIcon />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 4 }}>
        <Alert severity="error" icon={<ErrorIcon />}>
          {error}
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={() => navigate('/')}>
            Return Home
          </Button>
        </Box>
      </Box>
    );
  }

  if (!trackingData) {
    return <Typography>No delivery information available</Typography>;
  }

  const isPendingSelection = trackingData.status === 'pending_selection';
  const isDelivered = trackingData.status === 'delivered';

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Delivery Tracking
        </Typography>
        <Typography color="textSecondary">Request ID: {trackingData.requestId}</Typography>
      </Box>

      {/* Status Alert */}
      {isPendingSelection && (
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          Your service is ready! Please select a delivery method below to proceed.
        </Alert>
      )}

      {isDelivered && (
        <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 3 }}>
          Your delivery has been completed successfully.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        {/* Current Status Card */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 2, pb: 1, borderBottom: '1px solid #e0e0e0' }}>
                Current Status
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                {getStatusIcon(trackingData.method.type)}
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {trackingData.method.type === 'email'
                      ? 'Email Delivery'
                      : trackingData.method.type === 'physical_mail'
                      ? 'Physical Mail'
                      : 'Ready for Pickup'}
                  </Typography>
                  <Chip
                    label={trackingData.status.replace(/_/g, ' ').toUpperCase()}
                    color={getStatusColor(trackingData.status) as any}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Box>

              {/* Delivery Details */}
              <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Delivery Method Details
                </Typography>
                <Table size="small">
                  <TableBody>
                    {Object.entries(trackingData.method.details).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell sx={{ width: '40%', fontWeight: 500 }}>
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </TableCell>
                        <TableCell>{String(value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>

              {/* Tracking Timeline */}
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                Tracking History
              </Typography>
              <Stepper orientation="vertical">
                {trackingData.trackingHistory.map((entry, index) => (
                  <Step key={index} active={true} completed={index !== trackingData.trackingHistory.length - 1}>
                    <StepLabel>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {entry.status}
                      </Typography>
                      {entry.location && (
                        <Typography variant="caption" color="textSecondary">
                          {entry.location}
                        </Typography>
                      )}
                    </StepLabel>
                    <StepContent>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </Typography>
                      {entry.notes && (
                        <Typography variant="body2" color="textSecondary">
                          {entry.notes}
                        </Typography>
                      )}
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>
        </Box>

        {/* Info Card */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 2, pb: 1, borderBottom: '1px solid #e0e0e0' }}>
                Delivery Information
              </Typography>

              <Stack spacing={2}>
                {trackingData.estimatedDelivery && (
                  <Box>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                      Estimated Delivery
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {new Date(trackingData.estimatedDelivery).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}

                {trackingData.currentLocation && (
                  <Box>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                      Current Location
                    </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {trackingData.currentLocation}
                    </Typography>
                  </Box>
                )}

                <Box>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    Last Update
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {new Date(trackingData.lastUpdate).toLocaleString()}
                  </Typography>
                </Box>

                {isPendingSelection && (
                  <>
                    <Box sx={{ borderTop: '1px solid #e0e0e0', pt: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => navigate(`/requests/${trackingData.requestId}`)}
                      >
                        View Full Request
                      </Button>
                    </Box>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Method Selection Dialog */}
      <Dialog open={showMethodDialog} onClose={() => setShowMethodDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select Delivery Method</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3}>
            {selectedMethod?.type === 'email' && (
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="recipient@example.com"
              />
            )}

            {selectedMethod?.type === 'physical_mail' && (
              <>
                <TextField
                  fullWidth
                  label="Mailing Address"
                  multiline
                  rows={4}
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street Address..."
                />
                <FormControl fullWidth>
                  <FormLabel>Carrier Preference</FormLabel>
                  <RadioGroup
                    value={formData.carrier || ''}
                    onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                  >
                    <FormControlLabel value="DHL" control={<Radio />} label="DHL" />
                    <FormControlLabel value="FedEx" control={<Radio />} label="FedEx" />
                    <FormControlLabel value="LBC" control={<Radio />} label="LBC" />
                    <FormControlLabel value="JNT" control={<Radio />} label="JNT" />
                  </RadioGroup>
                </FormControl>
              </>
            )}

            {selectedMethod?.type === 'pickup' && (
              <>
                <TextField
                  fullWidth
                  type="date"
                  label="Preferred Pickup Date"
                  value={formData.preferredDate || ''}
                  onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                />
                <Alert severity="info">
                  Your documents will be ready for pickup within 2-3 business days. Please allow 30 days from
                  notification before pickup becomes unavailable.
                </Alert>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMethodDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitMethod}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
