/**
 * Approval Page
 * Handles approval token processing and decision flow
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Typography,
  Stack,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassTop as HourglassIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import type { ApprovalTokenResponse } from '../types';

export const ApprovalPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [approval, setApproval] = useState<ApprovalTokenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [denyReason, setDenyReason] = useState('');


  useEffect(() => {
    if (!token) {
      setError('Invalid approval link');
      setLoading(false);
      return;
    }

    const loadApproval = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.getApprovalToken(token);
        setApproval(data);

        if (data.used) {
          setError('This approval link has already been used');
        } else if (data.expired) {
          setError('This approval link has expired');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load approval request');
      } finally {
        setLoading(false);
      }
    };

    loadApproval();
  }, [token]);

  const handleApprove = async () => {
    if (!token) return;

    try {
      setSubmitLoading(true);
      await api.approveRequest(token, comment);
      addNotification('Request approved successfully!', 'success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Failed to approve request', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!token || !denyReason.trim()) {
      addNotification('Please provide a reason for denial', 'warning');
      return;
    }

    try {
      setSubmitLoading(true);
      await api.denyRequest(token, denyReason);
      addNotification('Request denied successfully', 'success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Failed to deny request', 'error');
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
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Service Request Approval
      </Typography>

      {error && <Alert severity={approval?.used ? 'info' : approval?.expired ? 'warning' : 'error'}>{error}</Alert>}

      {approval && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {/* Request Info */}
          <Box>
            <Card sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Request Details
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Request ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {approval.requestId}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Approver ID
                  </Typography>
                  <Typography variant="body2">
                    {approval.approverId}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Token Created
                  </Typography>
                  <Typography variant="body2">
                    {new Date(approval.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Expires At
                  </Typography>
                  <Typography variant="body2">
                    {new Date(approval.expiresAt).toLocaleString()}
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {approval.used && <Chip label="Already Used" color="default" variant="outlined" />}
                  {approval.expired && <Chip label="Expired" color="error" variant="outlined" />}
                  {!approval.used && !approval.expired && <Chip label="Valid" color="success" variant="outlined" />}
                </Box>
              </Stack>
            </Card>
          </Box>

          {/* Approval Form */}
          <Box>
            <Card sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Your Decision
              </Typography>

              {!approval.used && !approval.expired ? (
                <Stack spacing={2.5}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body2" color="textSecondary">
                      Please review the request and make your decision below.
                    </Typography>
                  </Paper>

                  {/* Approve Section */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      <CheckCircleIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'middle', color: 'success.main' }} />
                      Approve Request
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Optional: Add a comment..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      disabled={submitLoading || approval.used || approval.expired}
                      size="small"
                      sx={{ mb: 2 }}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={handleApprove}
                      disabled={submitLoading || approval.used || approval.expired}
                      sx={{ textTransform: 'none', fontSize: '1rem', fontWeight: 600 }}
                    >
                      {submitLoading ? 'Approving...' : 'Approve'}
                    </Button>
                  </Box>

                  <Divider />

                  {/* Deny Section */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      <CancelIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'middle', color: 'error.main' }} />
                      Deny Request
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Required: Explain your reason for denial..."
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      disabled={submitLoading || approval.used || approval.expired}
                      size="small"
                      sx={{ mb: 2 }}
                      error={false}
                      helperText={''}
                    />
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={handleDeny}
                      disabled={submitLoading || approval.used || approval.expired}
                      sx={{ textTransform: 'none', fontSize: '1rem', fontWeight: 600 }}
                    >
                      {submitLoading ? 'Denying...' : 'Deny'}
                    </Button>
                  </Box>
                </Stack>
              ) : (
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#fffde7', border: '1px solid #ffeb3b' }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <HourglassIcon sx={{ color: 'warning.main' }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {approval.used ? 'Already processed' : 'Approval expired'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {approval.used
                          ? 'This approval request has already been processed.'
                          : 'This approval link has expired. Please request a new one.'}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              )}
            </Card>
          </Box>
        </Box>
      )}
    </Box>
  );
};
