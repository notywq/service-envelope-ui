/**
 * Feedback Survey Page
 * Public access page (no authentication required)
 * Accessed via token from email: /feedback/:token
 * Allows users to submit feedback on completed service requests
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
  Rating,
  TextField,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import {
  ThumbUpAlt as ThumbUpIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import type { FeedbackResponse, FeedbackSubmitRequest } from '../types';

const feedbackMetrics = [
  { key: 'overall', label: 'Overall Experience', hint: 'How satisfied are you with the service overall?' },
  { key: 'speed', label: 'Speed', hint: 'How fast was the end-to-end processing?' },
  { key: 'clarity_of_instructions', label: 'Instruction Clarity', hint: 'Were the instructions clear and easy to follow?' },
] as const;

export const FeedbackPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [feedbackData, setFeedbackData] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [closingInSeconds, setClosingInSeconds] = useState(10);
  const [ratings, setRatings] = useState<Record<string, number>>({
    overall: 0,
    speed: 0,
    clarity_of_instructions: 0,
  });
  const [comments, setComments] = useState('');

  useEffect(() => {
    const loadFeedback = async () => {
      if (!token) {
        setError('No feedback token provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        // Fetch feedback using token
        const response = await api.getFeedbackByToken(token);

        const tokenStatus = response.tokenStatus || {};
        const tokenIsUsed = tokenStatus.isUsed === true;
        const tokenIsExpired = tokenStatus.isExpired === true;
        const normalizedStatus: FeedbackResponse['status'] = tokenIsExpired
          ? 'expired'
          : tokenIsUsed
          ? 'submitted'
          : response.status === 'expired' || response.status === 'submitted'
          ? response.status
          : 'pending';

        const fallbackQuestions = [
          {
            id: 'rating',
            type: 'rating' as const,
            question: 'How satisfied are you with this service?',
            required: true,
            scale: { min: 1, max: 5, minLabel: 'Poor', maxLabel: 'Excellent' },
          },
          {
            id: 'comment',
            type: 'text' as const,
            question: 'Tell us more about your experience',
            required: false,
          },
        ];

        const normalizedResponse: FeedbackResponse = {
          requestId: response.requestId || tokenStatus.requestId || 'Unknown Request',
          token,
          expiresAt:
            tokenStatus.expiresAt ||
            response.expiresAt ||
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          questions: Array.isArray(response.questions) && response.questions.length > 0 ? response.questions : fallbackQuestions,
          answers: response.answers || tokenStatus.submittedFeedback || undefined,
          submittedAt: response.submittedAt,
          status: normalizedStatus,
        };
        
        // Check if expired
        if (normalizedResponse.status === 'expired') {
          setError('This feedback survey has expired. Please contact support for assistance.');
          setFeedbackData(normalizedResponse);
          return;
        }

        if (normalizedResponse.status === 'submitted') {
          setError('This feedback link has already been used.');
          setFeedbackData(normalizedResponse);
          return;
        }

        setFeedbackData(normalizedResponse);

        const existingRatings = response.ratings || tokenStatus.submittedFeedback?.ratings || {};
        setRatings({
          overall: typeof existingRatings.overall === 'number' ? existingRatings.overall : 0,
          speed: typeof existingRatings.speed === 'number' ? existingRatings.speed : 0,
          clarity_of_instructions:
            typeof existingRatings.clarity_of_instructions === 'number'
              ? existingRatings.clarity_of_instructions
              : 0,
        });

        const existingComments =
          typeof response.comments === 'string'
            ? response.comments
            : typeof tokenStatus.submittedFeedback?.comments === 'string'
            ? tokenStatus.submittedFeedback.comments
            : '';
        setComments(existingComments);
      } catch (err: any) {
        console.error('Error loading feedback:', err);
        const status = err.response?.status;
        if (status === 404) {
          setError('This feedback link is invalid or no longer exists.');
        } else if (status === 410) {
          setError('This feedback link has expired.');
        } else if (status === 409) {
          setError('This feedback link has already been used.');
        } else {
          setError(err.response?.data?.error || 'Failed to load feedback survey.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadFeedback();
  }, [token]);

  useEffect(() => {
    if (!submitted) return;

    setClosingInSeconds(10);
    const interval = setInterval(() => {
      setClosingInSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // May be blocked by browser unless opened by script; still attempt.
          window.close();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [submitted]);

  const handleRatingChange = (key: string, value: number | null) => {
    setRatings((prev) => ({
      ...prev,
      [key]: value || 0,
    }));
  };

  const validateAnswers = (): boolean => {
    if (ratings.overall <= 0) {
      addNotification('Please provide an overall rating before submitting.', 'warning');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAnswers()) return;

    if (!feedbackData || !token) {
      setError('Missing required data');
      return;
    }

    if (feedbackData.status === 'expired') {
      setError('This feedback token is already expired. Feedback cannot be submitted.');
      addNotification('Feedback token expired', 'error');
      return;
    }

    if (feedbackData.status === 'submitted') {
      setError('This feedback token has already been used.');
      addNotification('Feedback already submitted for this token', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const submitRequest: FeedbackSubmitRequest = {
        token,
        ratings,
        comments,
      };
      await api.submitFeedback(submitRequest);
      setSubmitted(true);
      addNotification('Thank you! Your feedback has been submitted successfully.', 'success');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404) {
        setError('This feedback link is invalid or no longer exists.');
      } else if (status === 410) {
        setError('This feedback link has expired.');
      } else if (status === 409) {
        setError('This feedback has already been submitted using this link.');
      }
      addNotification(
        err.response?.data?.error || 'Failed to submit feedback. Please try again.',
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

  if (submitted) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', py: 4 }}>
        <Card sx={{ textAlign: 'center', py: 4 }}>
          <CardContent>
            <CheckIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Thank You!
            </Typography>
            <Typography color="textSecondary" gutterBottom>
              Your feedback has been submitted successfully.
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              This page is token-only and will close automatically.
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 3 }}>
              Closes automatically after {closingInSeconds} second{closingInSeconds === 1 ? '' : 's'}.
            </Typography>
            <Button variant="contained" onClick={() => window.close()}>
              Close This Window
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (error && !feedbackData) {
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

  if (!feedbackData) {
    return <Typography>No feedback data available</Typography>;
  }

  const isExpired = feedbackData.status === 'expired';
  const isAlreadySubmitted = feedbackData.status === 'submitted';
  const expiresDate = new Date(feedbackData.expiresAt);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
      {/* Header Card */}
      <Paper
        elevation={1}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(120deg, #e3f2fd 0%, #f3e5f5 100%)',
          border: '1px solid #d0e2ff',
        }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Service Feedback Survey
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Help us improve by sharing your experience
            </Typography>
          </Box>
          <Divider />
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" color="textSecondary">
                Request ID
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {feedbackData.requestId}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="textSecondary">
                Survey Expires
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: daysUntilExpiry <= 3 ? 'warning.main' : 'inherit',
                }}
              >
                {expiresDate.toLocaleDateString()} {daysUntilExpiry > 0 && `(${daysUntilExpiry} days)`}
              </Typography>
            </Box>
          </Stack>

          {/* Expiry Warning */}
          {daysUntilExpiry <= 3 && (
            <Alert severity="warning">
              This survey expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}. Please complete it soon.
            </Alert>
          )}

          {isExpired && (
            <Alert severity="error">
              This feedback token is already expired. We can no longer accept feedback for this request.
            </Alert>
          )}

          {isAlreadySubmitted && (
            <Alert severity="warning">
              This feedback link has already been used. Thank you for your earlier response.
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Feedback Form */}
      <Card>
        <CardContent>
          <Stack spacing={4}>
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Quick Service Ratings
              </Typography>
              <Stack spacing={2}>
                {feedbackMetrics.map((metric) => (
                  <Card
                    key={metric.key}
                    variant="outlined"
                    sx={{
                      borderColor: '#d9e4ff',
                      background: 'linear-gradient(180deg, #ffffff 0%, #f9fbff 100%)',
                    }}
                  >
                    <CardContent sx={{ py: 2 }}>
                      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {metric.label}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {metric.hint}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Rating
                            value={ratings[metric.key] || 0}
                            onChange={(_, value) => handleRatingChange(metric.key, value)}
                            size="large"
                            disabled={isExpired || isAlreadySubmitted || submitting}
                          />
                          <Chip label={`${ratings[metric.key] || 0}/5`} size="small" color="primary" variant="outlined" />
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                Comments
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={4}
                placeholder="Process was smooth and quick. Delivery instructions were clear..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={isExpired || isAlreadySubmitted || submitting}
              />
            </Box>

            <Divider />

            {/* Action Buttons */}
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => navigate('/')} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={submitting ? undefined : <ThumbUpIcon />}
                onClick={handleSubmit}
                disabled={isExpired || isAlreadySubmitted || submitting}
                sx={{
                  background: isExpired || isAlreadySubmitted
                    ? 'grey.400'
                    : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                }}
              >
                {submitting ? <CircularProgress size={24} /> : 'Submit Feedback'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <Typography variant="caption" color="textSecondary" sx={{ mt: 3, display: 'block' }}>
        Your feedback is valuable to us and will help us improve our services. All responses are
        confidential and will be used only for quality improvement purposes.
      </Typography>
    </Box>
  );
};
