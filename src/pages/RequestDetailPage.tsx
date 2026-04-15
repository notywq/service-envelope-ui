/**
 * Request Detail Page
 * Shows full request details and envelope history
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import type { ServiceRequest } from '../types';

/**
 * Renders envelope content based on envelope type
 */
const EnvelopeContentRenderer: React.FC<{ envelope: any; envelopeType: string }> = ({
  envelope,
  envelopeType,
}) => {
  console.log(`📦 Rendering ${envelopeType} envelope:`, envelope);
  
  const renderRequestEnvelope = () => {
    const params = envelope?.parameters;
    console.log(`  Request Parameters:`, params);
    
    if (!params || Object.keys(params).length === 0) {
      return (
        <Box>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            No parameters submitted
          </Typography>
        </Box>
      );
    }

    return (
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Submitted Parameters ({Object.keys(params).length})
          </Typography>
          <Table size="small" sx={{ bgcolor: '#fafafa' }}>
            <TableBody>
              {Object.entries(params).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, width: '25%' }}>
                    {key}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Stack>
    );
  };

  const renderApprovalEnvelope = () => {
    const approvers = envelope?.approvers;
    if (!approvers || approvers.length === 0) {
      return (
        <Typography variant="body2" color="textSecondary">
          No approvers configured
        </Typography>
      );
    }

    return (
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Approval Rules
          </Typography>
          <Typography variant="body2">
            Type: <strong>{envelope.approvalRules?.type || 'N/A'}</strong>
          </Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Approvers
          </Typography>
          <Table size="small" sx={{ bgcolor: '#fafafa' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvers.map((approver: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{approver.id}</TableCell>
                  <TableCell>{approver.role}</TableCell>
                  <TableCell>
                    <Chip
                      label={approver.status || 'pending'}
                      size="small"
                      color={
                        approver.status === 'approved'
                          ? 'success'
                          : approver.status === 'denied'
                          ? 'error'
                          : 'default'
                      }
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Stack>
    );
  };

  const renderPaymentEnvelope = () => {
    const charges = envelope?.charges;
    if (!charges || charges.length === 0) {
      return (
        <Typography variant="body2" color="textSecondary">
          No charges configured
        </Typography>
      );
    }

    return (
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Payment Method
          </Typography>
          <Typography variant="body2">{envelope.paymentMethod || 'Not specified'}</Typography>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Charges
          </Typography>
          <Table size="small" sx={{ bgcolor: '#fafafa' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Amount
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Currency</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {charges.map((charge: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{charge.item}</TableCell>
                  <TableCell align="right">{charge.amount}</TableCell>
                  <TableCell>{charge.currency}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: '#f0f0f0' }}>
                <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {charges.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)}
                </TableCell>
                <TableCell>{charges[0]?.currency || ''}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      </Stack>
    );
  };

  const renderProcessingEnvelope = () => {
    const tasks = envelope?.tasks;
    if (!tasks || tasks.length === 0) {
      return (
        <Typography variant="body2" color="textSecondary">
          No tasks configured
        </Typography>
      );
    }

    return (
      <Stack spacing={2}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Tasks ({tasks.length})
        </Typography>
        <Stack spacing={1}>
          {tasks.map((task: any, idx: number) => (
            <Box
              key={idx}
              sx={{
                p: 1.5,
                bgcolor: '#fafafa',
                borderRadius: 1,
                borderLeft: '3px solid',
                borderLeftColor: task.status === 'completed' ? '#4caf50' : '#ccc',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {task.name}
                </Typography>
                {task.status && (
                  <Chip
                    label={task.status}
                    size="small"
                    color={task.status === 'completed' ? 'success' : 'default'}
                    variant="outlined"
                  />
                )}
              </Box>
              {task.description && (
                <Typography variant="caption" color="textSecondary">
                  {task.description}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      </Stack>
    );
  };

  const renderDeliveryEnvelope = () => {
    return (
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Delivery Configuration
          </Typography>
          <Stack spacing={1}>
            {envelope.method && (
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Method
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {envelope.method}
                </Typography>
              </Box>
            )}
            {envelope.details?.templateId && (
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Email Template
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {envelope.details.templateId}
                </Typography>
              </Box>
            )}
            {envelope.details?.subject && (
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Subject
                </Typography>
                <Typography variant="body2">{envelope.details.subject}</Typography>
              </Box>
            )}
            {envelope.deliveryAttempts !== undefined && (
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Delivery Attempts
                </Typography>
                <Typography variant="body2">{envelope.deliveryAttempts}</Typography>
              </Box>
            )}
          </Stack>
        </Box>
      </Stack>
    );
  };

  const renderFeedbackEnvelope = () => {
    const feedback = envelope?.feedback;
    return (
      <Stack spacing={2}>
        {feedback && Object.keys(feedback).length > 0 ? (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Feedback Received
            </Typography>
            <Box component="pre" sx={{ overflow: 'auto', bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1, fontSize: '0.75rem' }}>
              {JSON.stringify(feedback, null, 2)}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="textSecondary">
            No feedback received yet
          </Typography>
        )}
      </Stack>
    );
  };

  // Render based on envelope type
  switch (envelopeType) {
    case 'request':
      return renderRequestEnvelope();
    case 'approval':
      return renderApprovalEnvelope();
    case 'payment':
      return renderPaymentEnvelope();
    case 'processing':
      return renderProcessingEnvelope();
    case 'delivery':
      return renderDeliveryEnvelope();
    case 'feedback':
      return renderFeedbackEnvelope();
    default:
      return (
        <Box component="pre" sx={{ overflow: 'auto', bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1, fontSize: '0.75rem' }}>
          {JSON.stringify(envelope, null, 2)}
        </Box>
      );
  }
};

export const RequestDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setError('Invalid request ID');
      setLoading(false);
      return;
    }

    const loadRequest = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.getRequest(requestId);
        setRequest(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load request');
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [requestId]);

  const handleRefresh = async () => {
    if (!requestId) return;
    try {
      const data = await api.getRequest(requestId);
      setRequest(data);
      addNotification('Request refreshed', 'success');
    } catch (err: any) {
      addNotification('Failed to refresh request', 'error');
    }
  };

  const handleResume = async () => {
    if (!requestId) return;
    try {
      setActionLoading(true);
      await api.resumeRequest(requestId);
      addNotification('Request resumed', 'success');
      handleRefresh();
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Failed to resume request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!requestId) return;
    try {
      setActionLoading(true);
      await api.cancelRequest(requestId);
      addNotification('Request cancelled', 'success');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Failed to cancel request', 'error');
    } finally {
      setActionLoading(false);
      setCancelDialogOpen(false);
    }
  };

  const StatusBadge: React.FC<{ status?: string }> = ({ status = 'unknown' }) => {
    const statusConfig: Record<string, { color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'; icon: React.ReactNode }> = {
      queued: { color: 'warning', icon: '📋' },
      processing: { color: 'info', icon: '⚙️' },
      pending_external: { color: 'secondary', icon: '⏳' },
      completed: { color: 'success', icon: '✓' },
      failed: { color: 'error', icon: '✕' },
      cancelled: { color: 'default', icon: '○' },
      unknown: { color: 'default', icon: '?' },
    };

    const config = statusConfig[status] || statusConfig['cancelled'];
    return (
      <Chip
        label={(status || 'unknown').replace(/_/g, ' ').toUpperCase()}
        color={config.color}
        variant="outlined"
        size="small"
      />
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !request) {
    return <Alert severity="error">{error || 'Request not found'}</Alert>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Request Details
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'textSecondary' }}>
            {request.id}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={actionLoading}
          >
            Refresh
          </Button>
          {request.status === 'pending_external' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleResume}
              disabled={actionLoading}
            >
              Resume
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setCancelDialogOpen(true)}
            disabled={actionLoading || request.status === 'completed'}
          >
            Cancel
          </Button>
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Request Overview */}
        <Box>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Overview
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Type
                </Typography>
                <Typography variant="body2">{request.type}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Initiator
                </Typography>
                <Typography variant="body2">{request.initiator}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Overall Status
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <StatusBadge status={request.status} />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(request.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Last Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(request.lastUpdated).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Box>

        {/* Envelope Summary */}
        <Box>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Envelope Status
            </Typography>
            <Stack spacing={1.5}>
              {Object.entries(request.envelopes).map(([key, envelope]) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {key}
                  </Typography>
                  <Chip
                    label={typeof envelope === 'string' ? envelope.toUpperCase() : envelope?.status?.toUpperCase() || 'Unknown'}
                    size="small"
                    color={typeof envelope === 'string' ? envelope === 'completed' ? 'success' : 'default' : envelope?.status === 'completed' ? 'success' : 'default'}
                    variant="outlined"
                  />
                </Box>
              ))}
            </Stack>
          </Card>
        </Box>
      </Box>

      {/* Envelope Details */}
      <Card sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Envelope Details
        </Typography>
        <Stack spacing={1}>
          {Object.entries(request.envelopes).map(([key, envelope]) => (
            <Accordion key={key}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                  {key} Envelope
                </Typography>
                <Chip
                  label={envelope.status}
                  size="small"
                  sx={{ ml: 'auto' }}
                  color={envelope.status === 'completed' ? 'success' : 'default'}
                  variant="outlined"
                />
              </AccordionSummary>
              <AccordionDetails>
                <EnvelopeContentRenderer envelope={envelope} envelopeType={key} />
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      </Card>

      {/* History Timeline */}
      <Card sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          History
        </Typography>
        {request.history.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No history entries yet
          </Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Envelope</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {request.history.map((entry, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>
                    {entry.envelope}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    <Chip label={entry.status} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>{entry.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogTitle>Cancel Request?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this request? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Keep Request</Button>
          <Button onClick={handleCancel} color="error" variant="contained" disabled={actionLoading}>
            {actionLoading ? 'Cancelling...' : 'Cancel Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
