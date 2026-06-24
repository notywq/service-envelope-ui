/**
 * Delivery Tracking Page (Redesigned)
 * Displays stylized delivery status and tracking information
 * Accessed via: /delivery/:requestId/tracking
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Stack,
  Alert,
  Paper,
  LinearProgress,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  FormControl,
  RadioGroup,
  Radio,
  FormControlLabel,
  TextField,
} from '@mui/material';
import {
  Email as EmailIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import { buildDeliverySimulationPayload, getDeliverySimulationPresets, normalizeDeliveryMethod } from '../utils/deliverySimulationPresets';

interface DeliveryStatus {
  requestId: string;
  deliveryType: 'EMAIL' | 'PHYSICAL' | 'PICKUP';
  status: string;
  code_number?: number;
  code_name?: string;
  currentMilestone?: number;
  totalMilestones?: number;
  estimatedDeliveryDate?: string;
  currentLocation?: string;
  recipient?: string;
  notes?: string;
  lastUpdate?: string;
}

interface HistoryEntry {
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}

type DeliveryStateMeta = {
  key: string;
  label: string;
  milestone: number;
  totalMilestones: number;
  isTerminal: boolean;
};

const deliveryStateMaps = {
  email: {
    byNumber: {
      0: { key: 'email_pending', label: 'Pending', milestone: 0, totalMilestones: 2, isTerminal: false },
      1: { key: 'email_sent', label: 'Sent', milestone: 1, totalMilestones: 2, isTerminal: true },
    } as Record<number, DeliveryStateMeta>,
    byName: {
      email_pending: { key: 'email_pending', label: 'Pending', milestone: 0, totalMilestones: 2, isTerminal: false },
      email_sent: { key: 'email_sent', label: 'Sent', milestone: 1, totalMilestones: 2, isTerminal: true },
    } as Record<string, DeliveryStateMeta>,
  },
  physical_mail: {
    byNumber: {
      0: { key: 'preparing', label: 'Preparing', milestone: 0, totalMilestones: 4, isTerminal: false },
      1: { key: 'ready_to_deliver', label: 'Ready to Deliver', milestone: 1, totalMilestones: 4, isTerminal: false },
      2: { key: 'out_for_delivery', label: 'Out for Delivery', milestone: 2, totalMilestones: 4, isTerminal: false },
      3: { key: 'delivered', label: 'Delivered', milestone: 3, totalMilestones: 4, isTerminal: true },
    } as Record<number, DeliveryStateMeta>,
    byName: {
      preparing: { key: 'preparing', label: 'Preparing', milestone: 0, totalMilestones: 4, isTerminal: false },
      ready_to_deliver: { key: 'ready_to_deliver', label: 'Ready to Deliver', milestone: 1, totalMilestones: 4, isTerminal: false },
      out_for_delivery: { key: 'out_for_delivery', label: 'Out for Delivery', milestone: 2, totalMilestones: 4, isTerminal: false },
      delivered: { key: 'delivered', label: 'Delivered', milestone: 3, totalMilestones: 4, isTerminal: true },
    } as Record<string, DeliveryStateMeta>,
  },
  pickup: {
    byNumber: {
      0: { key: 'preparing', label: 'Preparing', milestone: 0, totalMilestones: 3, isTerminal: false },
      1: { key: 'ready_for_pickup', label: 'Ready for Pickup', milestone: 1, totalMilestones: 3, isTerminal: false },
      2: { key: 'picked_up', label: 'Picked Up', milestone: 2, totalMilestones: 3, isTerminal: true },
    } as Record<number, DeliveryStateMeta>,
    byName: {
      preparing: { key: 'preparing', label: 'Preparing', milestone: 0, totalMilestones: 3, isTerminal: false },
      ready_for_pickup: { key: 'ready_for_pickup', label: 'Ready for Pickup', milestone: 1, totalMilestones: 3, isTerminal: false },
      picked_up: { key: 'picked_up', label: 'Picked Up', milestone: 2, totalMilestones: 3, isTerminal: true },
    } as Record<string, DeliveryStateMeta>,
  },
};

const trackingMilestones = [
  { label: 'Processing', description: 'Document is being prepared' },
  { label: 'Ready to Deliver', description: 'Ready for shipment' },
  { label: 'On the Way', description: 'Package in transit' },
  { label: 'Delivered', description: 'Document successfully delivered' },
];

export const DeliveryTrackingPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const { addNotification } = useNotification();

  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [methodInfo, setMethodInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [simulatingDelivery, setSimulatingDelivery] = useState(false);
  const [error, setError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [methodDetails, setMethodDetails] = useState<Record<string, any>>({});

  const resolveMethodFromEndpoint = (methodData: any): 'email' | 'physical_mail' | 'pickup' | '' => {
    return normalizeDeliveryMethod(methodData?.deliveryMethod || methodData?.method || methodData?.type);
  };

  const mergeDeliveryStatus = (previous: DeliveryStatus | null, next: DeliveryStatus): DeliveryStatus => {
    return {
      ...(previous || {}),
      ...next,
      code_number: next.code_number ?? previous?.code_number,
      code_name: next.code_name ?? previous?.code_name,
    };
  };

  const resolveDeliveryState = (
    method: 'email' | 'physical_mail' | 'pickup' | '',
    status: DeliveryStatus
  ): DeliveryStateMeta | null => {
    if (!method) return null;
    const map = deliveryStateMaps[method];
    const codeName = (status.code_name || '').toString().toLowerCase();
    const byName = map.byName[codeName];
    if (byName) return byName;
    if (typeof status.code_number === 'number') {
      const byNumber = map.byNumber[status.code_number];
      if (byNumber) return byNumber;
    }
    return null;
  };

  const loadDeliveryData = async () => {
    if (!requestId) {
      setError('No request ID provided');
      setLoading(false);
      return;
    }

    try {
      if (!refreshing) setLoading(true);
      setError('');

      // Fetch delivery method separately (email / physical_mail / pickup)
      const [methodData, statusData, historyData] = await Promise.all([
        api.getDeliveryMethod(requestId).catch(() => null),
        api.getDeliveryStatus(requestId).catch(() => null),
        api.getDeliveryHistory(requestId).catch(() => []),
      ]);

      console.log('≡ƒôª Raw API Response - Status:', statusData);
      console.log('≡ƒôª Raw API Response - History:', historyData);

      // Save method info for selection UI
      setMethodInfo(methodData || null);

      // Ensure deliveryType is known: prefer method endpoint, else fallback to status payload
      if (statusData) {
        // Handle both direct currentMilestone and potentially nested/named status fields
        const processedStatus = {
          ...statusData,
          currentMilestone:
            statusData.code_number ??
            statusData.currentMilestone ??
            statusData.milestone ??
            statusData.step ??
            (typeof statusData.status === 'number' ? statusData.status : 0),
        };
        // Attach deliveryType from method endpoint when available
        const endpointMethod = resolveMethodFromEndpoint(methodData);
        if (endpointMethod) {
          const method = endpointMethod.toString();
          processedStatus.deliveryType =
            method.toLowerCase() === 'email' ? 'EMAIL' : method.toLowerCase() === 'pickup' ? 'PICKUP' : 'PHYSICAL';
        } else if (processedStatus.deliveryType) {
          // normalize
          processedStatus.deliveryType = processedStatus.deliveryType === 'EMAIL' ? 'EMAIL' : processedStatus.deliveryType === 'PICKUP' ? 'PICKUP' : 'PHYSICAL';
        }

        console.log('≡ƒôª Processed Status:', processedStatus);
        setDeliveryStatus((prev) => mergeDeliveryStatus(prev, processedStatus as DeliveryStatus));
      }
      if (historyData) {
        const historyArray = Array.isArray(historyData) ? historyData : historyData.history || [];
        console.log('≡ƒôª Setting history array:', historyArray);
        setHistory(historyArray);
      }

      if (!statusData) {
        setError('Failed to load delivery status');
      }
    } catch (err: any) {
      console.error('Error loading delivery data:', err);
      setError(err.response?.data?.error || 'Failed to load delivery information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDeliveryData();
  }, [requestId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDeliveryData();
    addNotification('Delivery information refreshed', 'success');
  };

  const handleSelectMethod = async (method: string, details: Record<string, any>) => {
    if (!requestId) return;
    try {
      setLoading(true);
      await api.postDeliveryMethod(requestId, { method, details });
      await loadDeliveryData();
      addNotification('Delivery method selected', 'success');
    } catch (err: any) {
      console.error('Failed to select delivery method:', err);
      addNotification(err.response?.data?.error || 'Failed to set delivery method', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercent = (current: number | undefined, total: number | undefined) => {
    if (current === undefined || total === undefined) return 0;
    return Math.min(100, (current / (total - 1)) * 100);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress />
          <Typography color="textSecondary">Loading delivery information...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error && !deliveryStatus) {
    return (
      <Box sx={{ width: '100%', py: 4, px: 2 }}>
        <Alert severity="error" icon={<ErrorIcon />}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!deliveryStatus) {
    return (
      <Box sx={{ width: '100%', py: 4, px: 2 }}>
        <Alert severity="info">No delivery information available</Alert>
      </Box>
    );
  }

  const deliveryMethod = resolveMethodFromEndpoint(methodInfo);
  const isEmailDelivery = deliveryMethod === 'email';
  const isPickup = deliveryMethod === 'pickup';
  const isPhysical = deliveryMethod === 'physical_mail';
  const resolvedState = resolveDeliveryState(deliveryMethod, deliveryStatus);
  const isDelivered = !!resolvedState?.isTerminal || deliveryStatus.status === 'delivered' || deliveryStatus.status === 'Delivered';
  const stateLabel = resolvedState?.label || (isDelivered ? 'Delivered' : 'Pending');
  const displayMilestone = resolvedState?.milestone ?? deliveryStatus.currentMilestone;
  const displayTotalMilestones = resolvedState?.totalMilestones ?? deliveryStatus.totalMilestones;
  const simulationPresets = getDeliverySimulationPresets(deliveryMethod);

  const handleSimulatePreset = async (preset: (typeof simulationPresets)[number]) => {
    if (!requestId || !deliveryMethod) return;

    try {
      setSimulatingDelivery(true);
      const payload = buildDeliverySimulationPayload(deliveryMethod, preset);

      setDeliveryStatus((prev) =>
        prev
          ? {
              ...prev,
              code_number: payload.code_number,
              code_name: payload.code_name,
              currentMilestone: payload.code_number,
              status: payload.code_name || String(payload.code_number),
            }
          : prev
      );

      await api.updateDeliveryStatus(requestId, {
        code_number: payload.code_number,
        code_name: payload.code_name,
        notes: payload.notes,
        location: payload.location,
        trackingId: payload.trackingId,
      });

      await loadDeliveryData();
      addNotification(`${preset.label} applied for ${deliveryMethod.replace(/_/g, ' ')}`, 'success');
    } catch (err: any) {
      console.error('Error simulating delivery:', err);
      addNotification(err.response?.data?.error || 'Failed to update delivery status', 'error');
    } finally {
      setSimulatingDelivery(false);
    }
  };

  return (
    <Box sx={{ width: '100%', py: 4, px: 2 }}>
      {/* Header with Refresh */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Delivery Tracking
          </Typography>
          <Typography color="textSecondary" variant="body2">
            Request ID: <code>{requestId}</code>
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ height: 'fit-content' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ height: 'fit-content' }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Stack>
      </Box>
      {/* Method selection when none chosen yet */}
      {methodInfo && !deliveryMethod && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Select Delivery Method</Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Choose how you would like to receive your documents.
            </Typography>

            <FormControl component="fieldset">
              <RadioGroup value={selectedMethod} onChange={(e) => setSelectedMethod(e.target.value)}>
                {methodInfo.availableMethods?.email?.enabled && (
                  <FormControlLabel value="email" control={<Radio />} label="Email" />
                )}
                {methodInfo.availableMethods?.physical_mail?.enabled && (
                  <FormControlLabel value="physical_mail" control={<Radio />} label="Physical Mail" />
                )}
                {methodInfo.availableMethods?.pickup?.enabled && (
                  <FormControlLabel value="pickup" control={<Radio />} label="Pickup" />
                )}
              </RadioGroup>
            </FormControl>

            {selectedMethod === 'email' && (
              <Box sx={{ mt: 2 }}>
                <TextField fullWidth label="Recipient Email" value={methodDetails.recipient || methodInfo?.details?.recipient || ''} onChange={(e) => setMethodDetails({ ...methodDetails, recipient: e.target.value })} sx={{ mb: 2 }} />
                <TextField fullWidth label="Subject" value={methodDetails.subject || methodInfo?.details?.subject || ''} onChange={(e) => setMethodDetails({ ...methodDetails, subject: e.target.value })} />
              </Box>
            )}

            {selectedMethod === 'physical_mail' && (
              <Box sx={{ mt: 2 }}>
                <TextField fullWidth multiline minRows={3} label="Mailing Address" value={methodDetails.mailingAddress || ''} onChange={(e) => setMethodDetails({ ...methodDetails, mailingAddress: e.target.value })} />
              </Box>
            )}

            {selectedMethod === 'pickup' && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">Pickup will be available at the configured location. No additional info required.</Alert>
              </Box>
            )}

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button variant="outlined" onClick={() => { setSelectedMethod(''); setMethodDetails({}); }}>Cancel</Button>
              <Button variant="contained" disabled={!selectedMethod} onClick={() => handleSelectMethod(selectedMethod, methodDetails)}>
                Confirm Method
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* EMAIL DELIVERY UI */}
      {isEmailDelivery && (
        <Stack spacing={3}>
          {/* Email Delivery Card */}
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <EmailIcon sx={{ fontSize: 80, mb: 2, opacity: 0.9 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Email Delivery
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, opacity: 0.95 }}>
                Your documents will be securely sent to your email
              </Typography>

              {/* Status Badge */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                {isDelivered ? (
                  <>
                    <CheckCircleIcon sx={{ fontSize: 24 }} />
                    <Typography variant="h6">{stateLabel}</Typography>
                  </>
                ) : (
                  <>
                    <ScheduleIcon sx={{ fontSize: 24 }} />
                    <Typography variant="h6">{stateLabel}</Typography>
                  </>
                )}
              </Box>

              {/* Delivery Details */}
              <Paper
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: 2,
                  p: 2,
                  mt: 3,
                }}
              >
                <Stack spacing={1.5}>
                  {deliveryStatus.recipient && (
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Recipient Email
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {deliveryStatus.recipient}
                      </Typography>
                    </Box>
                  )}

                  {deliveryStatus.estimatedDeliveryDate && (
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Estimated Delivery Date
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {new Date(deliveryStatus.estimatedDeliveryDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Typography>
                    </Box>
                  )}

                  {deliveryStatus.lastUpdate && (
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Last Update
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {new Date(deliveryStatus.lastUpdate).toLocaleString()}
                      </Typography>
                    </Box>
                  )}

                  {deliveryStatus.notes && (
                    <Box>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Notes
                      </Typography>
                      <Typography variant="body2">{deliveryStatus.notes}</Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </CardContent>
          </Card>

          {/* Info Alert */}
          {!isDelivered && (
            <Alert icon={<InfoIcon />} severity="info">
              {isEmailDelivery
                ? 'Your email is still queued or in transit. Please check your inbox and spam folder.'
                : 'Your documents are being prepared and will be sent shortly. Please check back for updates.'}
            </Alert>
          )}

          {isDelivered && (
            <Alert icon={<CheckCircleIcon />} severity="success">
              {isEmailDelivery
                ? 'Your email has been successfully sent. Thank you for using our service!'
                : 'Your documents have been successfully delivered to your email. Thank you for using our service!'}
            </Alert>
          )}

          <Card sx={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Email Actions
              </Typography>
              {simulationPresets.length > 0 ? (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {simulationPresets.map((preset) => (
                    <Button
                      key={preset.buttonKey}
                      variant="outlined"
                      onClick={() => handleSimulatePreset(preset)}
                      disabled={simulatingDelivery}
                      sx={{ minWidth: 140 }}
                    >
                      {simulatingDelivery ? 'Simulating...' : preset.label}
                    </Button>
                  ))}
                </Stack>
              ) : (
                <Alert severity="info">No delivery method selected yet, so simulation buttons are hidden.</Alert>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
      {/* PICKUP UI */}
      {isPickup && (
        <Stack spacing={3}>
          <Card sx={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Pickup Information
              </Typography>
              <Stack spacing={1}>
                {deliveryStatus.recipient && (
                  <Box>
                    <Typography variant="caption" color="textSecondary">Contact</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{deliveryStatus.recipient}</Typography>
                  </Box>
                )}
                {/* pickup-specific details may be in deliveryStatus.details */}
                {(deliveryStatus as any).details?.location && (
                  <Box>
                    <Typography variant="caption" color="textSecondary">Pickup Location</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{(deliveryStatus as any).details.location}</Typography>
                  </Box>
                )}
                {(deliveryStatus as any).details?.hoursOfOperation && (
                  <Box>
                    <Typography variant="caption" color="textSecondary">Hours</Typography>
                    <Typography variant="body2">{(deliveryStatus as any).details.hoursOfOperation}</Typography>
                  </Box>
                )}
                {(deliveryStatus as any).details?.requiresIDVerification && (
                  <Alert severity="info">ID verification required at pickup.</Alert>
                )}
              </Stack>
            </CardContent>
          </Card>

          {!isDelivered && (
            <Alert icon={<InfoIcon />} severity="info">
              {resolvedState?.key === 'ready_for_pickup'
                ? 'Your package is ready for pickup. Please follow the pickup instructions above.'
                : 'Your package is being prepared for pickup. Please check back soon.'}
            </Alert>
          )}

          <Card sx={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Pickup Actions
              </Typography>
              {simulationPresets.length > 0 ? (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {simulationPresets.map((preset) => (
                    <Button
                      key={preset.buttonKey}
                      variant="outlined"
                      onClick={() => handleSimulatePreset(preset)}
                      disabled={simulatingDelivery}
                      sx={{ minWidth: 140 }}
                    >
                      {simulatingDelivery ? 'Simulating...' : preset.label}
                    </Button>
                  ))}
                </Stack>
              ) : (
                <Alert severity="info">No delivery method selected yet, so simulation buttons are hidden.</Alert>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* PHYSICAL DELIVERY UI */}
      {isPhysical && (
        <Stack spacing={3}>
          {/* Tracking Progress Card */}
          <Card sx={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShippingIcon /> Package Tracking
              </Typography>

              {/* Progress Bar with Milestones */}
              <Box sx={{ mb: 4 }}>
                <Box sx={{ mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressPercent(
                      displayMilestone,
                      displayTotalMilestones || 4
                    )}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>

                {/* Milestone Dots and Labels */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 2,
                  }}
                >
                  {trackingMilestones.map((milestone, index) => {
                    const isCompleted = (displayMilestone || 0) > index;
                    const isCurrent = (displayMilestone || 0) === index;

                    return (
                      <Box key={index} sx={{ textAlign: 'center' }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            mx: 'auto',
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isCompleted || isCurrent ? '#667eea' : '#e0e0e0',
                            color: isCompleted || isCurrent ? 'white' : 'textSecondary',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            boxShadow: isCurrent ? '0 0 0 4px rgba(102, 126, 234, 0.2)' : 'none',
                            transition: 'all 0.3s ease',
                          }}
                        >
                          {isCompleted ? <CheckCircleIcon /> : index + 1}
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: isCurrent ? 700 : 500,
                            display: 'block',
                            mb: 0.5,
                            color: isCurrent ? '#667eea' : 'textPrimary',
                          }}
                        >
                          {milestone.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'textSecondary', fontSize: '0.7rem' }}>
                          {milestone.description}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              {/* Delivery Details */}
              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Delivery Details
              </Typography>

              <Stack spacing={2}>
                {deliveryStatus.estimatedDeliveryDate && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      Estimated Delivery Date
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {new Date(deliveryStatus.estimatedDeliveryDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Typography>
                  </Box>
                )}

                {deliveryStatus.currentLocation && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationIcon sx={{ fontSize: 18, color: '#667eea' }} />
                      <Typography variant="body2" color="textSecondary">
                        Current Location
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {deliveryStatus.currentLocation}
                    </Typography>
                  </Box>
                )}

                {deliveryStatus.lastUpdate && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      Last Update
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {new Date(deliveryStatus.lastUpdate).toLocaleString()}
                    </Typography>
                  </Box>
                )}

                {deliveryStatus.notes && (
                  <Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                      Notes
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      {deliveryStatus.notes}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Status Alert */}
          {isDelivered && (
            <Alert icon={<CheckCircleIcon />} severity="success">
              Your package has been successfully delivered! Thank you for using our service.
            </Alert>
          )}

          {!isDelivered && (
            <Alert icon={<InfoIcon />} severity="info">
              {resolvedState?.key === 'preparing' && 'Your package is being prepared for dispatch.'}
              {resolvedState?.key === 'ready_to_deliver' && 'Your package is ready and will be dispatched shortly.'}
              {resolvedState?.key === 'out_for_delivery' && 'Your package is on its way. Track the progress above for real-time updates.'}
              {!resolvedState?.key && 'Your package is on its way. Track the progress above for real-time updates.'}
            </Alert>
          )}

          <Card sx={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Tracking Actions
              </Typography>
              {simulationPresets.length > 0 ? (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {simulationPresets.map((preset) => (
                    <Button
                      key={preset.buttonKey}
                      variant="outlined"
                      onClick={() => handleSimulatePreset(preset)}
                      disabled={simulatingDelivery}
                      sx={{ minWidth: 140 }}
                    >
                      {simulatingDelivery ? 'Simulating...' : preset.label}
                    </Button>
                  ))}
                </Stack>
              ) : (
                <Alert severity="info">No delivery method selected yet, so simulation buttons are hidden.</Alert>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Delivery History */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Delivery History
          </Typography>

          {history.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
              No delivery history available yet. Track events will appear here as your delivery progresses.
            </Typography>
          ) : (
            <Table size="small">
              <TableBody>
                {history.map((entry, index) => (
                  <TableRow key={index} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ width: '35%' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ width: '20%' }}>
                      <Chip label={entry.status} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">{entry.description}</Typography>
                        {entry.location && (
                          <Typography variant="caption" color="textSecondary">
                            ≡ƒôì {entry.location}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
