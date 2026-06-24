/**
 * Login Page
 * Email OTP authentication entry point with Material UI
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  TextField,
  Button,
  Alert,
  Typography,
  Container,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Lock as LockIcon, Email as EmailIcon, MarkEmailRead as OtpIcon } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestOtp, verifyOtp, cancelOtp } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const getOtpErrorMessage = (err: any, fallback: string) => {
    const status = err.response?.status;
    const retryAfterSeconds = err.response?.data?.retryAfterSeconds;
    if (status === 429 && retryAfterSeconds) {
      setResendIn(Number(retryAfterSeconds));
    }
    if (status === 429) return 'Too many attempts. Please wait before trying again.';
    if (status === 410) return 'That OTP has expired. Request a new code to continue.';
    if (status === 401) return 'Invalid, expired, or unavailable OTP. Check the code or request a new one.';
    return err.response?.data?.error || err.response?.data?.message || fallback;
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setInfo('');

    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await requestOtp(email.trim());
      setStep('otp');
      setCode('');
      setResendIn(response.retryAfterSeconds || 60);
      setInfo(response.message || 'If your account is allowed for OTP login, a code has been sent.');
    } catch (err: any) {
      setError(getOtpErrorMessage(err, 'Could not send OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!code.trim()) {
      setError('Enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email.trim(), code.trim());
      navigate('/dashboard');
    } catch (err: any) {
      setError(getOtpErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (email.trim()) {
        await cancelOtp(email.trim());
      }
    } catch {
      // Cancelling is a cleanup nicety; returning to email entry still makes sense.
    } finally {
      setStep('email');
      setCode('');
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Card elevation={8} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 60,
                height: 60,
                bgcolor: 'primary.main',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <LockIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              Service Envelope
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Dashboard
            </Typography>
          </Box>

          <Box
            component="form"
            onSubmit={step === 'email' ? handleSendOtp : handleVerifyOtp}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {error && <Alert severity="error">{error}</Alert>}
            {info && <Alert severity="info">{info}</Alert>}

            <TextField
              fullWidth
              type="email"
              label="Email Address"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || step === 'otp'}
              slotProps={{
                input: {
                  startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />,
                },
              }}
              variant="outlined"
              size="small"
            />

            {step === 'otp' && (
              <TextField
                fullWidth
                type="text"
                label="One-time code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                slotProps={{
                  input: {
                    startAdornment: <OtpIcon sx={{ mr: 1, color: 'action.active' }} />,
                  },
                }}
                variant="outlined"
                size="small"
                autoFocus
              />
            )}

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 2, textTransform: 'none', fontSize: '1rem', fontWeight: 600 }}
            >
              {loading ? <CircularProgress size={24} /> : step === 'email' ? 'Send OTP' : 'Verify & Sign In'}
            </Button>

            {step === 'otp' && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => handleSendOtp()}
                  disabled={loading || resendIn > 0}
                  sx={{ textTransform: 'none' }}
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                </Button>
                <Button size="small" onClick={handleCancel} disabled={loading} sx={{ textTransform: 'none' }}>
                  Use another email
                </Button>
              </Box>
            )}
          </Box>

          <Paper elevation={0} sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', textAlign: 'center' }}>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
              Password login is disabled.
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              Use an OTP-enabled account.
            </Typography>
          </Paper>
        </Card>
      </Container>
    </Box>
  );
};
