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
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Paper,
  Divider,
} from '@mui/material';
import {
  ThumbUpAlt as ThumbUpIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import type { FeedbackResponse, FeedbackSubmitRequest } from '../types';

export const FeedbackPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [feedbackData, setFeedbackData] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | number | string[]>>({});

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
        
        // Check if expired
        if (response.status === 'expired') {
          setError('This feedback survey has expired. Please contact support for assistance.');
          setFeedbackData(response);
          return;
        }

        setFeedbackData(response);
        // Initialize answers with empty values
        const initialAnswers: Record<string, string | number | string[]> = {};
        response.questions.forEach((q) => {
          if (q.type === 'multiple-choice') {
            initialAnswers[q.id] = [];
          } else {
            initialAnswers[q.id] = '';
          }
        });
        setAnswers(initialAnswers);
      } catch (err: any) {
        console.error('Error loading feedback:', err);
        setError(err.response?.data?.error || 'Failed to load feedback survey. The link may have expired.');
      } finally {
        setLoading(false);
      }
    };

    loadFeedback();
  }, [token]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleMultipleChoiceChange = (questionId: string, optionValue: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] as string[] : [];
      const newValue = current.includes(optionValue)
        ? current.filter((v) => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [questionId]: newValue };
    });
  };

  const validateAnswers = (): boolean => {
    if (!feedbackData) return false;

    for (const question of feedbackData.questions) {
      if (question.required) {
        const answer = answers[question.id];
        if (answer === '' || answer === null || (Array.isArray(answer) && answer.length === 0)) {
          addNotification(`Please answer: ${question.question}`, 'warning');
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAnswers()) return;

    if (!feedbackData || !token) {
      setError('Missing required data');
      return;
    }

    try {
      setSubmitting(true);
      const submitRequest: FeedbackSubmitRequest = {
        requestId: feedbackData.requestId,
        token,
        answers,
      };
      await api.submitFeedback(submitRequest);
      setSubmitted(true);
      addNotification('Thank you! Your feedback has been submitted successfully.', 'success');
      setTimeout(() => navigate('/'), 5000); // Redirect after 5 seconds
    } catch (err: any) {
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
              A confirmation email has been sent to you. You will be redirected shortly...
            </Typography>
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
  const expiresDate = new Date(feedbackData.expiresAt);
  const today = new Date();
  const daysUntilExpiry = Math.ceil((expiresDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
      {/* Header Card */}
      <Paper elevation={1} sx={{ p: 3, mb: 3, backgroundColor: 'primary.light' }}>
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
              This survey has expired. We can no longer accept feedback for this request.
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Feedback Form */}
      <Card>
        <CardContent>
          <Stack spacing={4}>
            {feedbackData.questions.map((question) => (
              <Box key={question.id}>
                <FormControl fullWidth disabled={isExpired}>
                  <FormLabel required={question.required ?? false} sx={{ mb: 2 }}>
                    {question.question}
                  </FormLabel>

                  {/* Rating Question */}
                  {question.type === 'rating' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Rating
                        {...({
                          value: answers[question.id] || 0,
                          onChange: (_, value: any) => handleAnswerChange(question.id, value),
                          size: 'large',
                          disabled: isExpired,
                        } as any)}
                      />
                      {question.scale?.maxLabel && (
                        <Typography variant="caption" color="textSecondary">
                          {question.scale.minLabel} - {question.scale.maxLabel}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Text Question */}
                  {question.type === 'text' && (
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Please share your feedback..."
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      disabled={isExpired}
                    />
                  )}

                  {/* Multiple Choice Question */}
                  {question.type === 'multiple-choice' && (
                    <RadioGroup
                      value={
                        Array.isArray(answers[question.id]) && (answers[question.id] as any[]).length === 1
                          ? (answers[question.id] as any[])[0]
                          : ''
                      }
                      onChange={(e) => handleMultipleChoiceChange(question.id, e.target.value)}
                    >
                      {question.options?.map((option) => (
                        <FormControlLabel
                          key={option}
                          value={option}
                          control={<Radio disabled={isExpired} />}
                          label={option}
                        />
                      ))}
                    </RadioGroup>
                  )}
                </FormControl>
              </Box>
            ))}

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
                disabled={isExpired || submitting}
                sx={{
                  background: isExpired
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
