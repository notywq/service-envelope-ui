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

interface DeliveryStatus {
  requestId: string;
  deliveryType: 'EMAIL' | 'PHYSICAL';
  status: string;
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

const trackingMilestones = [
  { label: 'Processing', description: 'Document is being prepared' },
  { label: 'In Transit', description: 'Package is on the way' },
  { label: 'Out for Delivery', description: 'Final delivery in progress' },
  { label: 'Delivered', description: 'Document successfully delivered' },
];

export const DeliveryTrackingPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const { addNotification } = useNotification();

  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadDeliveryData = async () => {
    if (!requestId) {
      setError('No request ID provided');
      setLoading(false);
      return;
    }

    try {
      if (!refreshing) setLoading(true);
      setError('');

      const [statusData, historyData] = await Promise.all([
        api.getDeliveryStatus(requestId).catch(() => null),
        api.getDeliveryHistory(requestId).catch(() => []),
      ]);

      if (statusData) {
        setDeliveryStatus(statusData);
      }
      if (historyData) {
        setHistory(Array.isArray(historyData) ? historyData : historyData.history || []);
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
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 4, px: 2 }}>
        <Alert severity="error" icon={<ErrorIcon />}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!deliveryStatus) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 4, px: 2 }}>
        <Alert severity="info">No delivery information available</Alert>
      </Box>
    );
  }

  const isEmailDelivery = deliveryStatus.deliveryType === 'EMAIL';
  const isDelivered = deliveryStatus.status === 'delivered' || deliveryStatus.status === 'Delivered';

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', py: 4, px: 2 }}>
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
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{ height: 'fit-content' }}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

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
                    <Typography variant="h6">Delivered</Typography>
                  </>
                ) : (
                  <>
                    <ScheduleIcon sx={{ fontSize: 24 }} />
                    <Typography variant="h6">Pending</Typography>
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
              Your documents are being prepared and will be sent to your email address shortly. Please check your inbox
              and spam folder.
            </Alert>
          )}

          {isDelivered && (
            <Alert icon={<CheckCircleIcon />} severity="success">
              Your documents have been successfully delivered to your email. Thank you for using our service!
            </Alert>
          )}
        </Stack>
      )}

      {/* PHYSICAL DELIVERY UI */}
      {!isEmailDelivery && (
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
                      deliveryStatus.currentMilestone,
                      deliveryStatus.totalMilestones || 4
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
                    const isCompleted = (deliveryStatus.currentMilestone || 0) > index;
                    const isCurrent = (deliveryStatus.currentMilestone || 0) === index;

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
              Your package is on its way. Track the progress above for real-time updates.
            </Alert>
          )}
        </Stack>
      )}

      {/* Delivery History */}
      {history.length > 0 && (
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Delivery History
            </Typography>

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
                            📍 {entry.location}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
