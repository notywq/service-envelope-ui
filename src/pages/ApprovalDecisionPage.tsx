/**
 * Approval Decision Page
 * Token-based access page (no authentication required)
 * Accessed via token from email: /approvals/:approvalToken
 * Allows approvers to review and approve/deny service requests
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
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import type { ApprovalRequest, ApprovalSubmitRequest } from '../types';

export const ApprovalDecisionPage: React.FC = () => {
  const { approvalToken } = useParams<{ approvalToken: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [approvalData, setApprovalData] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [decided, setDecided] = useState(false);
  const [decision, setDecision] = useState<'approve' | 'deny' | null>(null);
  const [justification, setJustification] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [acknowledgeReadiness, setAcknowledgeReadiness] = useState(false);

  useEffect(() => {
    const loadApproval = async () => {
      if (!approvalToken) {
        setError('No approval token provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await api.getApprovalByToken(approvalToken);
        
        // Check if already approved/denied or expired
        if (response.status !== 'pending') {
          setError(`This approval request has already been ${response.status}.`);
          setApprovalData(response);
          return;
        }

        setApprovalData(response);
      } catch (err: any) {
        console.error('Error loading approval:', err);
        setError(err.response?.data?.error || 'Failed to load approval request. The link may have expired.');
      } finally {
        setLoading(false);
      }
    };

    loadApproval();
  }, [approvalToken]);

  const handleApprove = () => {
    setDecision('approve');
    setShowConfirmDialog(true);
  };

  const handleDeny = () => {
    setDecision('deny');
    setShowConfirmDialog(true);
  };

  const handleConfirm = async () => {
    if (!decision || !approvalToken || !approvalData) return;

    if (decision === 'deny' && !justification.trim()) {
      addNotification('Please provide a reason for denial', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      setShowConfirmDialog(false);

      const submitRequest: ApprovalSubmitRequest = {
        requestId: approvalData.requestId,
        approvalToken,
        approved: decision === 'approve',
        justification: decision === 'approve' ? justification : undefined,
        denialReason: decision === 'deny' ? justification : undefined,
      };

      await api.submitApproval(submitRequest);
      setDecided(true);
      addNotification(
        `Request has been ${decision === 'approve' ? 'approved' : 'denied'} successfully.`,
        'success'
      );
      setTimeout(() => navigate('/'), 5000);
    } catch (err: any) {
      addNotification(
        err.response?.data?.error || 'Failed to submit approval decision. Please try again.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (decided) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <Card sx={{ textAlign: 'center', py: 4 }}>
          <CardContent>
            {decision === 'approve' ? (
              <>
                <CheckIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Request Approved
                </Typography>
                <Typography color="textSecondary">
                  Your approval has been recorded. The request will proceed to the next stage.
                </Typography>
              </>
            ) : (
              <>
                <CancelIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Request Denied
                </Typography>
                <Typography color="textSecondary">
                  Your decision has been recorded. The requestor will be notified of the denial.
                </Typography>
              </>
            )}
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              You will be redirected shortly...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (error && !approvalData) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
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

  if (!approvalData) {
    return <Typography>No approval data available</Typography>;
  }

  const expiresDate = new Date(approvalData.expiresAt);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysUntilExpiry < 0;

  return (
    <Box sx={{ width: '100%', py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Service Request Approval
        </Typography>
        <Typography color="textSecondary">Review the request details and provide your approval decision</Typography>
      </Box>

      {/* Status Alerts */}
      {isExpired && (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 2 }}>
          This approval request has expired and can no longer be acted upon.
        </Alert>
      )}

      {daysUntilExpiry <= 1 && daysUntilExpiry > 0 && (
        <Alert severity="warning" icon={<InfoIcon />} sx={{ mb: 2 }}>
          This approval request expires in {daysUntilExpiry} day. Please review and decide soon.
        </Alert>
      )}

      {approvalData.status !== 'pending' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This approval has already been {approvalData.status}.
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        {/* Request Details Card */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 2, pb: 1, borderBottom: '1px solid #e0e0e0' }}>
                Request Details
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    Request ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {approvalData.requestId}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    Service Type
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {approvalData.requestDetails.type}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    Requestor Name
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {approvalData.requestDetails.initiatorName}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    Requestor Email
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {approvalData.requestDetails.initiatorEmail}
                  </Typography>
                </Box>
                <Box sx={{ gridColumn: { xs: '1 / 2', sm: '1 / -1' } }}>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    Submitted On
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {new Date(approvalData.requestDetails.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              </Box>

              {/* Request Parameters */}
              <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>
                Request Parameters
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell>Parameter</TableCell>
                      <TableCell>Value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(approvalData.requestDetails.parameters).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell>{key}</TableCell>
                        <TableCell>{String(value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Approval Rule Info */}
              <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                  Approval Rule: <strong>{approvalData.approvalRule.type}</strong>
                </Typography>
                {approvalData.approvalRule.otherApprovers && approvalData.approvalRule.otherApprovers.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                      Other Approvers Status:
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      {approvalData.approvalRule.otherApprovers.map((approver) => (
                        <Chip
                          key={approver.id}
                          label={approver.status}
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
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Decision Card */}
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 2, pb: 1, borderBottom: '1px solid #e0e0e0' }}>
                Your Decision
              </Typography>

              <Stack spacing={2}>
                {/* Expiry Info */}
                <Box sx={{ p: 1.5, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    Expires At
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {expiresDate.toLocaleString()}
                  </Typography>
                </Box>

                {/* Justification Field */}
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Comments / Justification"
                  placeholder={
                    decision === 'deny'
                      ? 'Please provide a reason for the denial...'
                      : 'Add any comments or notes (optional)...'
                  }
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  disabled={isExpired || submitting}
                  helperText={
                    decision === 'deny'
                      ? 'Required: Please explain why you are denying this request'
                      : 'Optional: Share your thoughts with the requestor'
                  }
                  error={decision === 'deny' && !justification.trim()}
                />

                <Divider />

                {/* Action Buttons */}
                <Stack spacing={1.5}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    startIcon={<CheckIcon />}
                    onClick={handleApprove}
                    disabled={isExpired || submitting}
                    size="large"
                  >
                    Approve Request
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={handleDeny}
                    disabled={isExpired || submitting}
                    size="large"
                  >
                    Deny Request
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {decision === 'approve' ? 'Confirm Approval' : 'Confirm Denial'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography gutterBottom>
            {decision === 'approve'
              ? 'Are you sure you want to approve this service request?'
              : 'Are you sure you want to deny this service request?'}
          </Typography>

          {decision === 'deny' && (
            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              The requestor will be notified of the denial and provided with the reason you specify.
            </Alert>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={acknowledgeReadiness}
                onChange={(e) => setAcknowledgeReadiness(e.target.checked)}
              />
            }
            label={
              decision === 'approve'
                ? 'I confirm that this request meets all approval criteria'
                : 'I understand that this request will be denied'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color={decision === 'approve' ? 'success' : 'error'}
            disabled={!acknowledgeReadiness || submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
