/**
 * Payment Page
 * Handles payment processing via Maya payment gateway
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Button,
  Alert,
  CircularProgress,
  Typography,
  Stack,
  Paper,
  Divider,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import type { FullServiceRequest, PaymentCharge } from '../types';

interface PaymentState {
  loading: boolean;
  error: string;
  request: FullServiceRequest | null;
  charges: PaymentCharge[];
  totalAmount: number;
}

interface PaymentStatus {
  processing: boolean;
  completed: boolean;
  failed: boolean;
  message: string;
  transactionId?: string;
}

export const PaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const requestId = searchParams.get('requestId');
  const [paymentState, setPaymentState] = useState<PaymentState>({
    loading: true,
    error: '',
    request: null,
    charges: [],
    totalAmount: 0,
  });
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    processing: false,
    completed: false,
    failed: false,
    message: '',
  });
  const [paymentAttempt, setPaymentAttempt] = useState(1);

  // Load request details on mount
  useEffect(() => {
    if (!requestId) {
      setPaymentState((prev) => ({
        ...prev,
        loading: false,
        error: 'Invalid request ID. Please check your payment link.',
      }));
      return;
    }

    const loadRequest = async () => {
      try {
        setPaymentState((prev) => ({ ...prev, loading: true, error: '' }));
        const request = await api.getFullRequest(requestId);
        
        const charges = request.envelopes?.payment?.charges || [];
        const total = charges.reduce((sum, charge) => sum + charge.amount, 0);

        setPaymentState({
          loading: false,
          error: '',
          request,
          charges,
          totalAmount: total,
        });
      } catch (err: any) {
        setPaymentState((prev) => ({
          ...prev,
          loading: false,
          error: err.response?.data?.error || 'Failed to load payment details',
        }));
      }
    };

    loadRequest();
  }, [requestId]);

  // Initialize Maya payment widget
  const initiateMayaPayment = async () => {
    if (!requestId || !paymentState.request) return;

    setPaymentStatus({ ...paymentStatus, processing: true });

    try {
      // In a real implementation, you would initialize the Maya widget here
      // For now, we'll simulate a payment success scenario
      
      // Example: Simulate Maya payment success after 2 seconds
      setTimeout(async () => {
        try {
          const transactionId = `TXN-MAYA-${Date.now()}`;
          
          // Call payment completion endpoint
          const response = await api.completePayment(requestId, {
            transactionId,
            amount: paymentState.totalAmount,
            method: 'maya',
            reference: requestId,
            metadata: {
              paymentTimestamp: new Date().toISOString(),
              mayaCheckoutId: `CHK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
              browserInfo: `${navigator.userAgent.split(' ').slice(-2).join(' ')}`,
            },
          });

          setPaymentStatus({
            processing: false,
            completed: true,
            failed: false,
            message: response.message,
            transactionId: response.transactionId,
          });

          addNotification('Payment completed successfully!', 'success');
        } catch (err: any) {
          // Payment completion failed
          handlePaymentFailure(
            err.response?.data?.error || 'Failed to process payment',
            'PROCESSING_ERROR'
          );
        }
      }, 2000);
    } catch (err: any) {
      handlePaymentFailure(
        err.response?.data?.error || 'Failed to initiate payment',
        'INITIATION_ERROR'
      );
    }
  };

  const handlePaymentFailure = async (reason: string, errorCode: string) => {
    if (!requestId) return;

    try {
      const response = await api.failPayment(requestId, {
        reason,
        errorCode,
        metadata: {
          mayaErrorCode: errorCode,
          attemptNumber: paymentAttempt,
          failureTimestamp: new Date().toISOString(),
        },
      });

      setPaymentStatus({
        processing: false,
        completed: false,
        failed: true,
        message: response.message || reason,
      });

      addNotification(`Payment failed: ${reason}`, 'error');
    } catch {
      addNotification('Failed to record payment failure', 'error');
    }
  };

  const handleRetryPayment = () => {
    setPaymentAttempt((prev) => prev + 1);
    setPaymentStatus({
      processing: false,
      completed: false,
      failed: false,
      message: '',
    });
  };

  if (paymentState.loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <Stack sx={{ alignItems: 'center' }} spacing={2}>
          <CircularProgress />
          <Typography color="textSecondary">Loading payment details...</Typography>
        </Stack>
      </Box>
    );
  }

  // Completion Screen
  if (paymentStatus.completed) {
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
          <CheckCircleIcon
            sx={{
              fontSize: 80,
              color: 'success.main',
              mb: 2,
              animation: 'pulse 2s infinite',
            }}
          />
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'success.main' }}>
            Payment Successful
          </Typography>

          <Typography variant="body1" sx={{ color: 'textSecondary', mb: 3, lineHeight: 1.6 }}>
            Your payment has been processed successfully. Your service request is now in processing.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2} sx={{ mb: 3 }}>
            <Box>
              <Typography variant="caption" color="textSecondary">
                Transaction ID
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', mt: 0.5 }}>
                {paymentStatus.transactionId}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary">
                Request ID
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem', mt: 0.5 }}>
                {requestId}
              </Typography>
            </Box>
          </Stack>

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
              If this service has a payment-end template or generic fallback, the orchestrator will send the confirmation email.
            </Typography>
          </Paper>

          <Button
            fullWidth
            variant="contained"
            color="success"
            onClick={() => window.close()}
            sx={{ mb: 1 }}
          >
            Close this Window
          </Button>

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
        </Card>
      </Box>
    );
  }

  // Failure Screen
  if (paymentStatus.failed) {
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
          <ErrorIcon
            sx={{
              fontSize: 80,
              color: 'error.main',
              mb: 2,
              animation: 'pulse 2s infinite',
            }}
          />
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'error.main' }}>
            Payment Failed
          </Typography>

          <Typography variant="body1" sx={{ color: 'textSecondary', mb: 3, lineHeight: 1.6 }}>
            {paymentStatus.message}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: '#ffebee',
              borderRadius: 2,
              mb: 3,
              border: '1px solid',
              borderColor: 'error.200',
            }}
          >
            <Typography variant="caption" color="error">
              Attempt #{paymentAttempt} - Your request remains in pending payment status. You can retry anytime.
            </Typography>
          </Paper>

          <Stack spacing={1}>
            <Button
              fullWidth
              variant="contained"
              color="error"
              onClick={handleRetryPayment}
            >
              Retry Payment
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate('/')}
            >
              Return to Dashboard
            </Button>
          </Stack>

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
        </Card>
      </Box>
    );
  }

  // Main Payment Screen
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Complete Payment
      </Typography>

      {paymentState.error && <Alert severity="error">{paymentState.error}</Alert>}

      {paymentState.request && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {/* Payment Summary */}
          <Box>
            <Card sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
                <ShoppingCartIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'middle' }} />
                Payment Summary
              </Typography>

              {/* Request Info */}
              <Stack spacing={2} sx={{ mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Request ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {requestId}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Service Type
                  </Typography>
                  <Typography variant="body2">{paymentState.request.type}</Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 3 }} />

              {/* Charges */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Charges
              </Typography>

              <Stack spacing={1.5} sx={{ mb: 3 }}>
                {paymentState.charges.map((charge, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1.5,
                      bgcolor: '#f9f9f9',
                      borderRadius: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {charge.item}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {charge.currency}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      ₱{charge.amount.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Total Amount */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  bgcolor: '#e3f2fd',
                  borderRadius: 1,
                  border: '2px solid #2196f3',
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Total Amount Due
                </Typography>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 700, color: 'primary.main' }}
                >
                  ₱{paymentState.totalAmount.toFixed(2)}
                </Typography>
              </Box>
            </Card>
          </Box>

          {/* Payment Method */}
          <Box>
            <Card sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
                <CreditCardIcon sx={{ fontSize: 20, mr: 1, verticalAlign: 'middle' }} />
                Payment Method
              </Typography>

              {/* Status Info */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3, borderRadius: 1 }}>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="Status" size="small" variant="outlined" />
                    <Typography variant="body2">
                      Awaiting Payment
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    Attempt #{paymentAttempt}
                  </Typography>
                </Stack>
              </Paper>

              {/* Processing Indicator */}
              {paymentStatus.processing && (
                <Box sx={{ mb: 3 }}>
                  <LinearProgress />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Processing payment...
                  </Typography>
                </Box>
              )}

              {/* Maya Widget Placeholder */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  bgcolor: '#f9f9f9',
                  border: '2px dashed #ddd',
                  borderRadius: 2,
                  textAlign: 'center',
                  mb: 3,
                }}
              >
                <CreditCardIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Maya Payment Widget
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Integration placeholder - Ready for Maya Checkout SDK
                </Typography>
              </Paper>

              {/* Payment Button */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={paymentStatus.processing}
                onClick={initiateMayaPayment}
                sx={{ mb: 2, textTransform: 'none', fontSize: '1rem', fontWeight: 600 }}
              >
                {paymentStatus.processing ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Processing Payment...
                  </>
                ) : (
                  `Pay ₱${paymentState.totalAmount.toFixed(2)}`
                )}
              </Button>

              {/* Security Info */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: '#f0f4ff', borderRadius: 1 }}>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                  🔒 Secure Payment
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Your payment information is secure and will be processed through Maya's encrypted connection.
                </Typography>
              </Paper>
            </Card>
          </Box>
        </Box>
      )}
    </Box>
  );
};
