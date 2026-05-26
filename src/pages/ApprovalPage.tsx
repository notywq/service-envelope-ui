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
  TaskAlt as TaskAltIcon,
  ThumbDown as ThumbDownIcon,
  CheckBox as CheckBoxIcon,
  PersonAdd as PersonAddIcon,
  VerifiedUser as VerifiedUserIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import type { ApprovalTokenResponse, RequestDetailResponse } from '../types';

export const ApprovalPage: React.FC = () => {
  // Helper to extract error message from axios or other errors
  const getErrorMessage = (err: unknown, defaultMessage: string): string => {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as Record<string, unknown> | undefined;
      return (data?.error as string) || err.message || defaultMessage;
    }
    if (err instanceof Error) {
      return err.message;
    }
    return defaultMessage;
  };

  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [approval, setApproval] = useState<ApprovalTokenResponse | null>(null);
  const [requestDetails, setRequestDetails] = useState<RequestDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const [completed, setCompleted] = useState(false);
  const [completionType, setCompletionType] = useState<'approved' | 'denied' | null>(null);
  const [completionMessage, setCompletionMessage] = useState('');

  // Helper function to safely format dates
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  // Helper function to get approval rule display info
  const getApprovalRuleInfo = (ruleType: string) => {
    const rules: Record<string, { icon: React.ReactNode; label: string; description: string; color: 'info' | 'success' | 'warning' | 'error' }> = {
      all_must_approve: {
        icon: <CheckBoxIcon />,
        label: 'All Must Approve',
        description: 'Every approver must approve the request',
        color: 'info',
      },
      any_one: {
        icon: <PersonAddIcon />,
        label: 'Any One Approves',
        description: 'First approver to approve completes the process',
        color: 'success',
      },
      specific_approver: {
        icon: <VerifiedUserIcon />,
        label: 'Specific Approver',
        description: 'Only designated approver can approve',
        color: 'warning',
      },
      complex: {
        icon: <CheckBoxIcon />,
        label: 'Complex Rule',
        description: 'All required approvers must approve AND at least one optional approver',
        color: 'error',
      },
    };
    return rules[ruleType] || rules.all_must_approve;
  };

  // Calculate approval progress
  const getApprovalProgress = () => {
    if (!requestDetails?.approvers) return { approved: 0, total: 0, percentage: 0 };
    const approved = requestDetails.approvers.filter(a => a.status === 'approved').length;
    const total = requestDetails.approvers.length;
    return { approved, total, percentage: total > 0 ? Math.round((approved / total) * 100) : 0 };
  };


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
        const [tokenData, requestData] = await Promise.all([
          api.getApprovalToken(token),
          api.getApprovalRequest(token),
        ]);
        setApproval(tokenData);
        setRequestDetails(requestData);

        if (tokenData.used) {
          setError('This approval link has already been used');
        } else if (tokenData.expired) {
          setError('This approval link has expired');
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Failed to load approval request'));
      } finally {
        setLoading(false);
      }
    };

    loadApproval();
  }, [token]);

  // Redirect after 10 seconds on completion
  useEffect(() => {
    if (completed) {
      const timer = setTimeout(() => {
        // Try to close window, fallback to redirect if in iframe or not opened by script
        if (window.opener) {
          window.close();
        } else {
          navigate('/');
        }
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [completed, navigate]);

  const handleApprove = async () => {
    if (!token) return;

    try {
      setSubmitLoading(true);
      const response = await api.approveRequest(token, comment);
      
      setCompleted(true);
      setCompletionType('approved');
      
      if (response.allApproved) {
        setCompletionMessage('Request approved! All approvers have approved. The pipeline is resuming.');
      } else {
        setCompletionMessage('Your approval has been recorded. The system is waiting for other approvers.');
      }
    } catch (err: unknown) {
      addNotification(getErrorMessage(err, 'Failed to approve request'), 'error');
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
      
      setCompleted(true);
      setCompletionType('denied');
      setCompletionMessage('The request has been denied. The requestor will be notified with your feedback.');
    } catch (err: unknown) {
      addNotification(getErrorMessage(err, 'Failed to deny request'), 'error');
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

  // Completion Screen - Full page thank you
  if (completed) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          p: 2,
        }}
      >
        <Card
          sx={{
            maxWidth: 500,
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          }}
        >
          {completionType === 'approved' ? (
            <>
              <TaskAltIcon
                sx={{
                  fontSize: 80,
                  color: 'success.main',
                  mb: 2,
                  animation: 'pulse 2s infinite',
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'success.main' }}>
                Request Approved
              </Typography>
            </>
          ) : (
            <>
              <ThumbDownIcon
                sx={{
                  fontSize: 80,
                  color: 'error.main',
                  mb: 2,
                  animation: 'pulse 2s infinite',
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'error.main' }}>
                Request Denied
              </Typography>
            </>
          )}

          <Typography variant="body1" sx={{ color: 'textSecondary', mb: 3, lineHeight: 1.6 }}>
            {completionMessage}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Request ID: <strong>{requestDetails?.requestId}</strong>
          </Typography>

          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: '#f5f5f5',
              borderRadius: 2,
              mb: 3,
            }}
          >
            <Typography variant="caption" color="textSecondary">
              {completionType === 'approved'
                ? 'Your approval has been recorded. You can safely close this page or wait to be redirected.'
                : 'Your denial has been recorded. The requestor will be notified.'}
            </Typography>
          </Paper>

          <Button
            fullWidth
            variant="contained"
            color={completionType === 'approved' ? 'success' : 'error'}
            onClick={() => window.close()}
            sx={{ mb: 1 }}
          >
            Close This Page
          </Button>

          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
            Redirecting in <strong>10 seconds</strong>...
          </Typography>
        </Card>

        <style>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
        `}</style>
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
          {/* Request Details */}
          <Box>
            <Card sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
                Request Information
              </Typography>
              
              {requestDetails ? (
                <Stack spacing={3}>
                  {/* Student/Requestor Info */}
                  {(requestDetails.parameters?.firstName || requestDetails.parameters?.lastName) && (
                    <Box>
                      <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                        Requestor
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                        {requestDetails.parameters?.firstName} {requestDetails.parameters?.lastName}
                      </Typography>
                      {(requestDetails.parameters?.studentId || requestDetails.parameters?.email) && (
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          {requestDetails.parameters?.studentId && (
                            <Typography variant="caption" color="textSecondary">
                              ID: {requestDetails.parameters.studentId}
                            </Typography>
                          )}
                          {requestDetails.parameters?.email && (
                            <Typography variant="caption" color="textSecondary">
                              {requestDetails.parameters.email}
                            </Typography>
                          )}
                        </Stack>
                      )}
                    </Box>
                  )}

                  <Divider />

                  {/* Request Type & ID */}
                  <Box>
                    <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                      Request Details
                    </Typography>
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                      <Box>
                        <Typography variant="caption" color="textSecondary">Request ID</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {requestDetails.requestId}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">Type</Typography>
                        <Typography variant="body2">{requestDetails.type}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="textSecondary">Status</Typography>
                        <Typography variant="body2">
                          <Chip 
                            label={requestDetails.status} 
                            size="small"
                            color={requestDetails.status === 'completed' ? 'success' : requestDetails.status === 'failed' || requestDetails.status === 'cancelled' ? 'error' : 'default'}
                            variant="outlined"
                          />
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Divider />

                  {/* Purpose */}
                  {requestDetails.parameters?.purpose && (
                    <Box>
                      <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                        Purpose
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.5 }}>
                        {requestDetails.parameters.purpose}
                      </Typography>
                    </Box>
                  )}

                  {/* Program */}
                  {requestDetails.parameters?.program && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                          Program
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {requestDetails.parameters.program}
                        </Typography>
                      </Box>
                    </>
                  )}

                  {/* Delivery Address */}
                  {requestDetails.parameters?.deliveryAddress && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                          Delivery Address
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.5 }}>
                          {requestDetails.parameters.deliveryAddress}
                        </Typography>
                      </Box>
                    </>
                  )}

                  {/* Number of Copies */}
                  {requestDetails.parameters?.numberOfCopies && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                          Number of Copies
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {requestDetails.parameters.numberOfCopies}
                        </Typography>
                      </Box>
                    </>
                  )}

                  <Divider />

                  {/* Expiration */}
                  <Box>
                    <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                      Approval Link
                    </Typography>
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      <Box>
                        <Typography variant="caption" color="textSecondary">Expires At</Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                          {formatDate(requestDetails.expiresAt)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  <Divider />

                  {/* Approval Envelope - Rules & Approvers */}
                  {requestDetails.approvalEnvelope && (
                    <Box>
                      <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px', mb: 2, display: 'block' }}>
                        Approval Process
                      </Typography>

                      {/* Rule Type Info */}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          bgcolor: 'primary.50',
                          border: '1px solid',
                          borderColor: 'primary.200',
                          borderRadius: 1,
                          mb: 2,
                        }}
                      >
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                          <Box sx={{ color: 'primary.main', mt: 0.5 }}>
                            {getApprovalRuleInfo(requestDetails.approvalEnvelope.approvalRules.type).icon}
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {getApprovalRuleInfo(requestDetails.approvalEnvelope.approvalRules.type).label}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.85rem' }}>
                              {getApprovalRuleInfo(requestDetails.approvalEnvelope.approvalRules.type).description}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>

                      {/* Approval Progress */}
                      {requestDetails.approvers && requestDetails.approvers.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" color="textSecondary">
                              Approvals Progress
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {getApprovalProgress().approved}/{getApprovalProgress().total}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              height: 6,
                              bgcolor: '#e0e0e0',
                              borderRadius: 1,
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                height: '100%',
                                bgcolor: 'success.main',
                                width: `${getApprovalProgress().percentage}%`,
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </Box>
                        </Box>
                      )}

                      {/* Approvers List */}
                      {requestDetails.approvers && requestDetails.approvers.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
                            Approvers
                          </Typography>
                          <Stack spacing={1}>
                            {requestDetails.approvers.map((approver, idx) => {
                              const isRequired =
                                requestDetails.approvalEnvelope?.approvalRules.requiredApprovers?.includes(
                                  approver.id
                                ) ?? false;
                              const isOptional =
                                requestDetails.approvalEnvelope?.approvalRules.atLeastOneOf?.includes(
                                  approver.id
                                ) ?? false;

                              return (
                                <Box
                                  key={idx}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    p: 1.5,
                                    bgcolor: '#f9f9f9',
                                    borderRadius: 1,
                                    border: '1px solid #e0e0e0',
                                  }}
                                >
                                  {/* Status Icon */}
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 32,
                                      height: 32,
                                      borderRadius: '50%',
                                      bgcolor:
                                        approver.status === 'approved'
                                          ? '#c8e6c9'
                                          : approver.status === 'denied'
                                            ? '#ffcdd2'
                                            : '#e3f2fd',
                                    }}
                                  >
                                    {approver.status === 'approved' ? (
                                      <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                                    ) : approver.status === 'denied' ? (
                                      <CancelIcon sx={{ color: 'error.main', fontSize: 20 }} />
                                    ) : (
                                      <HourglassIcon sx={{ color: 'info.main', fontSize: 20 }} />
                                    )}
                                  </Box>

                                  {/* Approver Info */}
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                                      {approver.id}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                                      <Chip
                                        label={
                                          approver.status === 'approved'
                                            ? 'Approved'
                                            : approver.status === 'denied'
                                              ? 'Denied'
                                              : 'Pending'
                                        }
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
                                      {isRequired && (
                                        <Chip
                                          label="Required"
                                          size="small"
                                          variant="outlined"
                                          icon={<VerifiedUserIcon />}
                                          sx={{
                                            borderColor: 'warning.main',
                                            color: 'warning.main',
                                            '& .MuiChip-icon': { color: 'warning.main !important' },
                                          }}
                                        />
                                      )}
                                      {isOptional && (
                                        <Chip
                                          label="Optional"
                                          size="small"
                                          variant="outlined"
                                          icon={<InfoIcon />}
                                          sx={{
                                            borderColor: 'info.main',
                                            color: 'info.main',
                                            '& .MuiChip-icon': { color: 'info.main !important' },
                                          }}
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                </Box>
                              );
                            })}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  )}
                </Stack>
              ) : (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Typography variant="body2" color="textSecondary">Loading request details...</Typography>
                </Stack>
              )}
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
