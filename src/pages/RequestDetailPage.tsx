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
import { buildDeliverySimulationPayload, getDeliverySimulationPresets, normalizeDeliveryMethod } from '../utils/deliverySimulationPresets';
import type { ServiceRequest } from '../types';

/**
 * Renders envelope content based on envelope type
 */
const EnvelopeContentRenderer: React.FC<{
  envelope: any;
  envelopeType: string;
  resolvedDeliveryMethod?: string;
  resolvedDeliveryStateLabel?: string;
  resolvedDeliveryCodeName?: string;
  resolvedDeliveryCodeNumber?: number;
}> = ({
  envelope,
  envelopeType,
  resolvedDeliveryMethod,
  resolvedDeliveryStateLabel,
  resolvedDeliveryCodeName,
  resolvedDeliveryCodeNumber,
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
    // Try to get approval rules from the envelope data
    const approvalRules = envelope?.approvalRules;
    const approvers = envelope?.approvers;
    const requiresApproval = envelope?.requiresApproval;
    const status = envelope?.status;
    const specificApprover = approvalRules?.specificApprover || approvalRules?.specificApproverId;

    // If approval is not required at service level, show that
    if (requiresApproval === false) {
      return (
        <Box>
          <Typography variant="body2" color="textSecondary">
            Approval is not required for this service
          </Typography>
        </Box>
      );
    }

    // If approval is required but waived for this request, show both the rules AND the waived status
    const isWaived = status === 'waived';

    return (
      <Stack spacing={2}>
        {/* Waived Status Alert */}
        {isWaived && (
          <Alert severity="info">
            Approval was waived for this request (auto-approved or skipped by business rules)
          </Alert>
        )}

        {/* Approval Rules */}
        {approvalRules && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Approval Rules
            </Typography>
            <Table size="small" sx={{ bgcolor: '#fafafa' }}>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, width: '25%' }}>
                    Rule Type
                  </TableCell>
                  <TableCell>
                    <Chip label={approvalRules.type?.replace(/_/g, ' ').toUpperCase()} size="small" />
                  </TableCell>
                </TableRow>
                {approvalRules.requiredApprovers && approvalRules.requiredApprovers.length > 0 && (
                  <TableRow>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      Required Approvers
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', display: 'flex' }}>
                        {approvalRules.requiredApprovers.map((approver: string) => (
                          <Chip key={approver} label={approver} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
                {approvalRules.atLeastOneOf && approvalRules.atLeastOneOf.length > 0 && (
                  <TableRow>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      At Least One Of
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', display: 'flex' }}>
                        {approvalRules.atLeastOneOf.map((approver: string) => (
                          <Chip key={approver} label={approver} size="small" variant="outlined" color="warning" />
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
                {specificApprover && (
                  <TableRow>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      Approver
                    </TableCell>
                    <TableCell>
                      <Chip label={specificApprover} size="small" variant="outlined" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Approvers Status */}
        {approvers && approvers.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Approver Status
            </Typography>
            <Table size="small" sx={{ bgcolor: '#fafafa' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Approval Token</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Approved At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {approvers.map((approver: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{approver.email || approver.id || '-'}</TableCell>
                    <TableCell>{approver.role || '-'}</TableCell>
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
                    <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {approver.approvalToken || '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      {approver.approvedAt ? new Date(approver.approvedAt).toLocaleString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Show message if no approvers yet */}
        {(!approvers || approvers.length === 0) && approvalRules && !isWaived && (
          <Typography variant="body2" color="textSecondary">
            Awaiting approvals from {approvalRules.requiredApprovers?.length || 0} required approver(s)
          </Typography>
        )}
      </Stack>
    );
  };

  const renderPaymentEnvelope = () => {
    const charges = envelope?.charges;
    const paymentProvider = envelope?.paymentProvider || envelope?.paymentMethod;
    const paymentStatus = envelope?.paymentStatus || envelope?.status;

    // Show if payment is not required
    if (!envelope?.required) {
      return (
        <Typography variant="body2" color="textSecondary">
          Payment is not required for this service
        </Typography>
      );
    }

    if (!charges || charges.length === 0) {
      return (
        <Typography variant="body2" color="textSecondary">
          No charges configured
        </Typography>
      );
    }

    // Calculate total
    const total = charges.reduce((sum: number, charge: any) => {
      const chargeAmount = (charge.amount || 0) * (charge.quantity || 1);
      return sum + chargeAmount;
    }, 0);

    const currency = charges[0]?.currency || 'PHP';
    const pending = paymentStatus === 'pending' || paymentStatus === 'pending_external';

    return (
      <Stack spacing={2} sx={{ width: '100%', alignItems: 'flex-start', textAlign: 'left' }}>
        {/* Payment Provider */}
        {paymentProvider && (
          <Box sx={{ width: '100%' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Payment Method
            </Typography>
            <Chip label={paymentProvider} size="small" variant="outlined" sx={{ textTransform: 'uppercase' }} />
          </Box>
        )}

        {/* Payment Status */}
        <Box sx={{ width: '100%' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Payment Status
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={paymentStatus?.replace(/_/g, ' ').toUpperCase()}
              color={
                paymentStatus === 'completed' || paymentStatus === 'paid'
                  ? 'success'
                  : pending
                  ? 'warning'
                  : 'default'
              }
              variant="outlined"
              size="small"
            />
            <Chip label={`${charges.length} charge line(s)`} size="small" variant="outlined" />
            <Chip label={`Total ${total.toLocaleString()} ${currency}`} size="small" color="primary" variant="filled" />
          </Stack>
        </Box>

        {/* Charges */}
        <Box sx={{ width: '100%' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Charges ({charges.length})
          </Typography>
          <Table size="small" sx={{ bgcolor: '#fafafa' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Quantity
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Amount
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {charges.map((charge: any, idx: number) => (
                <TableRow key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>{charge.item}</TableCell>
                  <TableCell align="right">{charge.quantity || 1}</TableCell>
                  <TableCell align="right">
                    {((charge.amount || 0) * (charge.quantity || 1)).toLocaleString()} {currency}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                <TableCell colSpan={2} sx={{ fontWeight: 600 }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {total.toLocaleString()} {currency}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1, bgcolor: '#f8f9fa', border: '1px solid #e0e0e0' }}>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
              Payment Summary
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {paymentProvider ? `${paymentProvider} · ` : ''}
              {pending ? 'Waiting for payment completion' : 'Payment details loaded from request envelope'}
            </Typography>
          </Box>
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

              <Table size="small" sx={{ mt: 1, bgcolor: '#fff' }}>
                <TableBody>
                  {task.method && (
                    <TableRow>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, width: '25%' }}>Method</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{task.method}</TableCell>
                    </TableRow>
                  )}
                  {task.url && (
                    <TableRow>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>URL</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{task.url}</TableCell>
                    </TableRow>
                  )}
                  {task.timeout !== undefined && (
                    <TableRow>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>Timeout</TableCell>
                      <TableCell>{task.timeout} ms</TableCell>
                    </TableRow>
                  )}
                  {task.retries !== undefined && (
                    <TableRow>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>Retries</TableCell>
                      <TableCell>{task.retries}</TableCell>
                    </TableRow>
                  )}
                  {task.successCodes && task.successCodes.length > 0 && (
                    <TableRow>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>Success Codes</TableCell>
                      <TableCell>{task.successCodes.join(', ')}</TableCell>
                    </TableRow>
                  )}
                  {task.payload && (
                    <TableRow>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>Payload</TableCell>
                      <TableCell>
                        <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.75rem' }}>
                          {JSON.stringify(task.payload, null, 2)}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          ))}
        </Stack>
      </Stack>
    );
  };

  const renderDeliveryEnvelope = () => {
    const deliveryMethods = envelope?.deliveryMethods || envelope?.availableMethods || {};
    const selectedMethod = resolvedDeliveryMethod || envelope?.method || envelope?.currentMethod;
    const formatLabel = (key: string) =>
      key
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, (ch) => ch.toUpperCase());

    const renderPrimitive = (value: any) => {
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return String(value);
    };

    const renderObjectRows = (obj: Record<string, any>) => {
      const objectEntries = Object.entries(obj).filter(
        ([, value]) => value !== undefined && value !== null && value !== ''
      );

      if (objectEntries.length === 0) {
        return <Typography variant="body2" color="textSecondary">No additional details</Typography>;
      }

      return (
        <Table size="small" sx={{ bgcolor: '#fff' }}>
          <TableBody>
            {objectEntries.map(([key, value]) => (
              <TableRow key={key}>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, width: '35%' }}>
                  {formatLabel(key)}
                </TableCell>
                <TableCell sx={{ wordBreak: 'break-word' }}>
                  {typeof value === 'object' ? renderObjectRows(value) : renderPrimitive(value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    };

    const renderMethodDetails = (details: any) => {
      const detailEntries = Object.entries(details || {}).filter(([key, value]) => {
        if (key === 'enabled') return false;
        if (value === undefined || value === null || value === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      });

      if (detailEntries.length === 0) {
        return <Typography variant="body2" color="textSecondary">No method details configured</Typography>;
      }

      return (
        <Stack spacing={1} sx={{ width: '100%', alignItems: 'flex-start' }}>
          {detailEntries.map(([key, value]) => (
            <Box key={key} sx={{ width: '100%' }}>
              <Typography variant="caption" color="textSecondary">
                {formatLabel(key)}
              </Typography>

              {Array.isArray(value) ? (
                typeof value[0] === 'object' ? (
                  <Stack spacing={1} sx={{ mt: 0.5 }}>
                    {value.map((item, index) => (
                      <Box
                        key={`${key}-${index}`}
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          border: '1px solid #e0e0e0',
                          bgcolor: '#fff',
                          width: '100%',
                        }}
                      >
                        {renderObjectRows(item || {})}
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', display: 'flex', mt: 0.5 }}>
                    {value.map((item, index) => (
                      <Chip key={`${key}-${index}`} label={renderPrimitive(item)} size="small" variant="outlined" />
                    ))}
                  </Stack>
                )
              ) : value && typeof value === 'object' ? (
                <Box sx={{ mt: 0.5 }}>{renderObjectRows(value)}</Box>
              ) : (
                <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-word' }}>
                  {renderPrimitive(value)}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      );
    };

    // Show available delivery methods
    return (
      <Stack spacing={2} sx={{ width: '100%', alignItems: 'flex-start', textAlign: 'left' }}>
        {/* Selected Delivery Method */}
        {selectedMethod && (
          <Box sx={{ width: '100%' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Selected Delivery Method
            </Typography>
            <Chip label={selectedMethod?.replace(/_/g, ' ').toUpperCase()} size="small" color="primary" variant="outlined" />
          </Box>
        )}

        {/* Available Delivery Methods */}
        {Object.keys(deliveryMethods).length > 0 && (
          <Box sx={{ width: '100%' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Available Delivery Methods
            </Typography>
            <Stack spacing={1.5} sx={{ width: '100%', alignItems: 'flex-start' }}>
              {Object.entries(deliveryMethods).map(([method, details]: any) => (
                details?.enabled && (
                  <Box
                    key={method}
                    sx={{
                      width: '100%',
                      p: 1.5,
                      bgcolor: '#fafafa',
                      borderRadius: 1,
                      borderLeft: '3px solid',
                      borderLeftColor: selectedMethod === method ? '#1976d2' : '#ccc',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, textTransform: 'capitalize' }}>
                      {method.replace(/_/g, ' ')}
                    </Typography>
                    {renderMethodDetails(details)}
                  </Box>
                )
              ))}
            </Stack>
          </Box>
        )}

        {/* Delivery Status */}
        {envelope?.status && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Status
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                label={(resolvedDeliveryStateLabel || envelope.status || 'pending').replace(/_/g, ' ').toUpperCase()}
                color={
                  (resolvedDeliveryCodeName === 'email_sent' ||
                    resolvedDeliveryCodeName === 'delivered' ||
                    resolvedDeliveryCodeName === 'picked_up' ||
                    envelope.status === 'completed')
                    ? 'success'
                    : envelope.status === 'pending'
                    ? 'warning'
                    : 'default'
                }
                variant="outlined"
                size="small"
              />
              {resolvedDeliveryCodeName && (
                <Chip label={resolvedDeliveryCodeName} size="small" variant="outlined" />
              )}
              {typeof resolvedDeliveryCodeNumber === 'number' && (
                <Chip label={`Code ${resolvedDeliveryCodeNumber}`} size="small" variant="outlined" />
              )}
            </Stack>
          </Box>
        )}

        {envelope?.deliveryAttempts !== undefined && (
          <Box>
            <Typography variant="caption" color="textSecondary">
              Delivery Attempts
            </Typography>
            <Typography variant="body2">{envelope.deliveryAttempts}</Typography>
          </Box>
        )}
      </Stack>
    );
  };

  const renderFeedbackEnvelope = () => {
    const feedback = envelope?.feedback;
    const isRequired = envelope?.required;
    const expiryDays = envelope?.expiryDays;
    const reminderDaysBefore = envelope?.reminderDaysBefore;
    const feedbackStatus = envelope?.status;

    // Show if feedback is not required
    if (!isRequired) {
      return (
        <Typography variant="body2" color="textSecondary">
          Feedback is not required for this service
        </Typography>
      );
    }

    return (
      <Stack spacing={2} sx={{ width: '100%', alignItems: 'flex-start', textAlign: 'left' }}>
        {/* Feedback Configuration */}
        <Box sx={{ width: '100%' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Feedback Configuration
          </Typography>
          <Table size="small" sx={{ bgcolor: '#fafafa' }}>
            <TableBody>
              {expiryDays && (
                <TableRow>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, width: '25%' }}>
                    Expiry Days
                  </TableCell>
                  <TableCell>{expiryDays} days</TableCell>
                </TableRow>
              )}
              {reminderDaysBefore && (
                <TableRow>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    Reminder Before
                  </TableCell>
                  <TableCell>{reminderDaysBefore} days</TableCell>
                </TableRow>
              )}
              {envelope?.notificationRequired && (
                <TableRow>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    Notifications
                  </TableCell>
                  <TableCell>
                    <Chip label="Enabled" size="small" color="success" variant="outlined" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <Box sx={{ width: '100%', p: 1.5, borderRadius: 1, bgcolor: '#f8f9fa', border: '1px solid #e0e0e0' }}>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
            Feedback Window
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {expiryDays ? `${expiryDays} day expiry` : 'No expiry configured'}
            {reminderDaysBefore ? ` · Reminder ${reminderDaysBefore} day(s) before expiry` : ''}
          </Typography>
        </Box>

        <Box sx={{ width: '100%' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Status
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              label={feedbackStatus?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
              color={feedbackStatus === 'completed' ? 'success' : feedbackStatus === 'pending' ? 'warning' : 'default'}
              variant="outlined"
              size="small"
            />
            {envelope?.notificationRequired && <Chip label="Notifications Enabled" size="small" color="info" variant="outlined" />}
            {envelope?.emailTemplateId && <Chip label={envelope.emailTemplateId} size="small" variant="outlined" />}
          </Stack>
        </Box>

        {/* Feedback Received */}
        {feedback && Object.keys(feedback).length > 0 ? (
          <Box sx={{ width: '100%' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Feedback Received
            </Typography>
            {(() => {
              const ratings =
                feedback?.ratings && typeof feedback.ratings === 'object' && !Array.isArray(feedback.ratings)
                  ? feedback.ratings
                  : null;
              const comments =
                typeof feedback?.comments === 'string'
                  ? feedback.comments
                  : typeof feedback?.comment === 'string'
                  ? feedback.comment
                  : '';
              const metadataEntries = Object.entries(feedback).filter(
                ([key]) => key !== 'ratings' && key !== 'comments' && key !== 'comment'
              );
              const formatLabel = (key: string) =>
                key
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (ch) => ch.toUpperCase());

              return (
                <Stack spacing={2} sx={{ width: '100%' }}>
                  {ratings && Object.keys(ratings).length > 0 && (
                    <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: '#f8f9fa', border: '1px solid #e0e0e0' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.25 }}>
                        Ratings
                      </Typography>
                      <Stack spacing={1}>
                        {Object.entries(ratings).map(([metric, value]) => {
                          const score = typeof value === 'number' ? value : Number(value);
                          const chipColor = Number.isFinite(score)
                            ? score >= 4
                              ? 'success'
                              : score >= 3
                              ? 'warning'
                              : 'error'
                            : 'default';
                          return (
                            <Box
                              key={metric}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                p: 1,
                                borderRadius: 1,
                                bgcolor: '#fff',
                                border: '1px solid #eceff1',
                              }}
                            >
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {formatLabel(metric)}
                              </Typography>
                              <Chip
                                size="small"
                                color={chipColor as any}
                                variant="outlined"
                                label={Number.isFinite(score) ? `${score}` : String(value)}
                              />
                            </Box>
                          );
                        })}
                      </Stack>
                    </Box>
                  )}

                  {comments && (
                    <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: '#f8f9fa', border: '1px solid #e0e0e0' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Comments
                      </Typography>
                      <Typography variant="body2">{comments}</Typography>
                    </Box>
                  )}

                  {metadataEntries.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Additional Details
                      </Typography>
                      <Table size="small" sx={{ bgcolor: '#fafafa' }}>
                        <TableBody>
                          {metadataEntries.map(([key, value]) => (
                            <TableRow key={key}>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, width: '35%' }}>
                                {formatLabel(key)}
                              </TableCell>
                              <TableCell sx={{ wordBreak: 'break-word' }}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </Stack>
              );
            })()}
          </Box>
        ) : (
          <Box sx={{ width: '100%' }}>
            <Typography variant="body2" color="textSecondary">
              No feedback submitted yet.
            </Typography>
          </Box>
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
  const [simulatingDelivery, setSimulatingDelivery] = useState(false);
  const [deliveryMethodInfo, setDeliveryMethodInfo] = useState<any>(null);
  const [deliveryCurrent, setDeliveryCurrent] = useState<any>(null);

  const resolveDeliveryState = (method: string, current: any): { label: string; isTerminal: boolean } | null => {
    const normalized = normalizeDeliveryMethod(method);
    if (!normalized) return null;

    const codeName = (current?.code_name || '').toString().toLowerCase();
    const codeNumber = typeof current?.code_number === 'number' ? current.code_number : undefined;

    if (normalized === 'email') {
      if (codeName === 'email_sent' || codeNumber === 1) return { label: 'sent', isTerminal: true };
      if (codeName === 'email_pending' || codeNumber === 0) return { label: 'pending', isTerminal: false };
    }

    if (normalized === 'physical_mail') {
      if (codeName === 'delivered' || codeNumber === 3) return { label: 'delivered', isTerminal: true };
      if (codeName === 'out_for_delivery' || codeNumber === 2) return { label: 'out_for_delivery', isTerminal: false };
      if (codeName === 'ready_to_deliver' || codeNumber === 1) return { label: 'ready_to_deliver', isTerminal: false };
      if (codeName === 'preparing' || codeNumber === 0) return { label: 'preparing', isTerminal: false };
    }

    if (normalized === 'pickup') {
      if (codeName === 'picked_up' || codeNumber === 2) return { label: 'picked_up', isTerminal: true };
      if (codeName === 'ready_for_pickup' || codeNumber === 1) return { label: 'ready_for_pickup', isTerminal: false };
      if (codeName === 'preparing' || codeNumber === 0) return { label: 'preparing', isTerminal: false };
    }

    return null;
  };

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
        const [data, methodData, currentData] = await Promise.all([
          api.getRequest(requestId),
          api.getDeliveryMethod(requestId).catch(() => null),
          api.getDeliveryStatus(requestId).catch(() => null),
        ]);
        setRequest(data);
        setDeliveryMethodInfo(methodData);
        setDeliveryCurrent(currentData);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load request');
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [requestId]);

  useEffect(() => {
    if (!requestId) return;

    const resolvedMethod = normalizeDeliveryMethod(
      deliveryMethodInfo?.deliveryMethod ||
        deliveryMethodInfo?.method ||
        deliveryMethodInfo?.type
    );

    if (resolvedMethod) return;

    const timer = setTimeout(async () => {
      try {
        const freshMethod = await api.getDeliveryMethod(requestId);
        setDeliveryMethodInfo(freshMethod);
      } catch {
        // Keep existing state if delayed refetch fails.
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [requestId, deliveryMethodInfo]);

  const handleRefresh = async () => {
    if (!requestId) return;
    try {
      const [data, methodData, currentData] = await Promise.all([
        api.getRequest(requestId),
        api.getDeliveryMethod(requestId).catch(() => null),
        api.getDeliveryStatus(requestId).catch(() => null),
      ]);
      setRequest(data);
      setDeliveryMethodInfo(methodData);
      setDeliveryCurrent(currentData);
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

  const requestDeliveryMethod = normalizeDeliveryMethod(
    deliveryMethodInfo?.deliveryMethod ||
      deliveryMethodInfo?.method ||
      deliveryMethodInfo?.type
  );
  const approvalEnvelope = (request.envelopes as any)?.approval || {};
  const paymentEnvelope = (request.envelopes as any)?.payment || {};
  const processingEnvelope = (request.envelopes as any)?.processing || {};
  const deliveryEnvelope = (request.envelopes as any)?.delivery || {};

  const approvalEnvelopeStatus = approvalEnvelope?.status?.toString().toLowerCase();
  const paymentEnvelopeStatus = paymentEnvelope?.status?.toString().toLowerCase();
  const processingEnvelopeStatus = processingEnvelope?.status?.toString().toLowerCase();
  const requestStatus = request.status?.toString().toLowerCase();

  const isStatusReadyForNextStage = (status?: string): boolean =>
    ['completed', 'approved', 'paid', 'waived', 'skipped', 'not_required'].includes((status || '').toLowerCase());

  const approvalReady = approvalEnvelope?.required === false || isStatusReadyForNextStage(approvalEnvelopeStatus);
  const paymentReady = paymentEnvelope?.required === false || isStatusReadyForNextStage(paymentEnvelopeStatus);
  const processingReady = processingEnvelope?.required === false || isStatusReadyForNextStage(processingEnvelopeStatus);

  const deliveryPhaseStarted =
    !!deliveryEnvelope?.startedAt ||
    !!deliveryEnvelope?.deliveredAt ||
    !!deliveryCurrent?.code_name ||
    typeof deliveryCurrent?.code_number === 'number';

  const isDeliveryTurnActive =
    !['failed', 'cancelled'].includes(requestStatus || '') &&
    approvalReady &&
    paymentReady &&
    processingReady &&
    deliveryPhaseStarted;
  const resolvedDeliveryState = resolveDeliveryState(requestDeliveryMethod, deliveryCurrent);
  const simulationPresets = getDeliverySimulationPresets(requestDeliveryMethod);

  const handleSimulatePreset = async (preset: (typeof simulationPresets)[number]) => {
    if (!requestId || !requestDeliveryMethod) return;

    try {
      setSimulatingDelivery(true);
      const payload = buildDeliverySimulationPayload(requestDeliveryMethod, preset);

      setDeliveryCurrent((prev: any) => ({
        ...(prev || {}),
        code_number: payload.code_number,
        code_name: payload.code_name,
      }));

      await api.updateDeliveryStatus(requestId, {
        code_number: payload.code_number,
        code_name: payload.code_name,
        notes: payload.notes,
        location: payload.location,
        trackingId: payload.trackingId,
      });

      addNotification(`${preset.label} applied for ${requestDeliveryMethod.replace(/_/g, ' ')}`, 'success');
      handleRefresh();
    } catch (err: any) {
      console.error('Error simulating delivery:', err);
      addNotification(err.response?.data?.error || 'Failed to update delivery status', 'error');
    } finally {
      setSimulatingDelivery(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Request Details
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'textSecondary' }}>
            {request.id}
          </Typography>
        </Box>

        <Stack
          spacing={1.25}
          sx={{ width: { xs: '100%', md: 'auto' }, alignItems: { xs: 'stretch', md: 'flex-end' } }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              flexWrap: 'wrap',
              rowGap: 1,
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
            }}
          >
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={actionLoading}
              sx={{ minWidth: 132 }}
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
                sx={{ minWidth: 132 }}
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
              sx={{ minWidth: 132 }}
            >
              Cancel
            </Button>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              flexWrap: 'wrap',
              rowGap: 1,
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
            }}
          >
            {simulationPresets.length > 0 ? (
              simulationPresets.map((preset) => (
                <Button
                  key={preset.buttonKey}
                  variant="contained"
                  color="success"
                  onClick={() => handleSimulatePreset(preset)}
                  disabled={simulatingDelivery || !isDeliveryTurnActive || request.status === 'completed' || !!resolvedDeliveryState?.isTerminal}
                  sx={{
                    minWidth: 176,
                    opacity: !isDeliveryTurnActive || request.status === 'completed' || resolvedDeliveryState?.isTerminal ? 0.5 : 1,
                  }}
                >
                  {simulatingDelivery ? 'Simulating...' : preset.label}
                </Button>
              ))
            ) : (
              <Button
                variant="contained"
                color="success"
                disabled
                sx={{ minWidth: 176, opacity: request.status === 'completed' ? 0.5 : 1 }}
              >
                No Delivery Method
              </Button>
            )}
          </Stack>

          {!isDeliveryTurnActive && (
            <Alert severity="warning" variant="outlined" sx={{ py: 0.5, width: '100%', maxWidth: 420 }}>
              Delivery stage not active yet.
            </Alert>
          )}
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
                <EnvelopeContentRenderer
                  envelope={envelope}
                  envelopeType={key}
                  resolvedDeliveryMethod={key === 'delivery' ? requestDeliveryMethod : undefined}
                  resolvedDeliveryStateLabel={key === 'delivery' ? resolvedDeliveryState?.label : undefined}
                  resolvedDeliveryCodeName={key === 'delivery' ? deliveryCurrent?.code_name : undefined}
                  resolvedDeliveryCodeNumber={key === 'delivery' ? deliveryCurrent?.code_number : undefined}
                />
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
