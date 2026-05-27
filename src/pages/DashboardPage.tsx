/**
 * Dashboard Page
 * Main request tracking and management interface with Material UI
 */

import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  Button,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassTop as HourglassIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import type { ServiceRequest, RequestFilters } from '../types';

const StatusBadge: React.FC<{ status?: string }> = ({ status = 'unknown' }) => {
  const statusConfig: Record<string, { color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'; icon: React.ReactNode }> = {
    queued: { color: 'warning', icon: <ScheduleIcon sx={{ fontSize: 16, mr: -0.5 }} /> },
    processing: { color: 'info', icon: <HourglassIcon sx={{ fontSize: 16, mr: -0.5 }} /> },
    pending_external: { color: 'secondary', icon: <HourglassIcon sx={{ fontSize: 16, mr: -0.5 }} /> },
    completed: { color: 'success', icon: <CheckCircleIcon sx={{ fontSize: 16, mr: -0.5 }} /> },
    failed: { color: 'error', icon: <ErrorIcon sx={{ fontSize: 16, mr: -0.5 }} /> },
    cancelled: { color: 'default', icon: <CancelIcon sx={{ fontSize: 16, mr: -0.5 }} /> },
    unknown: { color: 'default', icon: <ScheduleIcon sx={{ fontSize: 16, mr: -0.5 }} /> },
  };

  const config = statusConfig[status] || statusConfig['cancelled'];

  return (
    <Chip
      icon={config.icon as React.ReactElement<any>}
      label={(status || 'unknown').replace(/_/g, ' ').toUpperCase()}
      color={config.color}
      variant="outlined"
      size="small"
    />
  );
};

export const DashboardPage: React.FC = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [filters, setFilters] = useState<RequestFilters>({ limit: 20, offset: 0 });
  const [total, setTotal] = useState(0);

  // Load services once on mount
  useEffect(() => {
    loadServices();
  }, []);

  // Load requests when filters change
  useEffect(() => {
    loadRequests();
  }, [filters]);

  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const response = await api.getServices();
      setServices(response.services || []);
    } catch (err) {
      console.error('Failed to load services:', err);
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await api.getRequests(filters);
      setRequests(response.requests);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilter = (status?: string) => {
    setFilters({ ...filters, status: status || undefined, offset: 0 });
  };

  const handleTypeFilter = (type?: string) => {
    setFilters({ ...filters, type: type || undefined, offset: 0 });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Service Requests
        </Typography>
        <Button
          component={RouterLink}
          to="/requests/new"
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ textTransform: 'none', fontSize: '1rem', px: 3 }}
        >
          New Request
        </Button>
      </Box>

      {/* Filters Card */}
      <Card sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          Filters
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2, maxWidth: '800px' }}>
          <Box>
            <Select
              fullWidth
              value={filters.status || ''}
              onChange={(e) => handleStatusFilter(e.target.value || undefined)}
              displayEmpty
              size="small"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="queued">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon fontSize="small" />
                  Queued
                </Box>
              </MenuItem>
              <MenuItem value="processing">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HourglassIcon fontSize="small" />
                  Processing
                </Box>
              </MenuItem>
              <MenuItem value="pending_external">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HourglassIcon fontSize="small" />
                  Pending External
                </Box>
              </MenuItem>
              <MenuItem value="completed">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon fontSize="small" />
                  Completed
                </Box>
              </MenuItem>
              <MenuItem value="failed">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ErrorIcon fontSize="small" />
                  Failed
                </Box>
              </MenuItem>
              <MenuItem value="cancelled">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CancelIcon fontSize="small" />
                  Cancelled
                </Box>
              </MenuItem>
            </Select>
          </Box>

          <Box>
            <Select
              fullWidth
              value={filters.type || ''}
              onChange={(e) => handleTypeFilter(e.target.value || undefined)}
              displayEmpty
              disabled={loadingServices}
              size="small"
            >
              <MenuItem value="">All Services</MenuItem>
              {services.map((service) => (
                <MenuItem key={service.id} value={service.type || service.id}>
                  {service.name} ({service.type})
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadRequests()}
              sx={{ textTransform: 'none', height: '40px' }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Results Card */}
      <Card>
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <CircularProgress />
          </Box>
        ) : requests.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="textSecondary">No requests found</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Initiator</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} hover>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {req.id.slice(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>{req.type}</TableCell>
                    <TableCell>{req.initiator}</TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        component={RouterLink}
                        to={`/requests/${req.id}`}
                        variant="outlined"
                        size="small"
                        endIcon={<OpenInNewIcon fontSize="small" />}
                        sx={{ textTransform: 'none' }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Pagination Info */}
        {!loading && requests.length > 0 && (
          <Box sx={{ p: 2, borderTop: '1px solid #eee', textAlign: 'center' }}>
            <Typography variant="caption" color="textSecondary">
              Showing {requests.length} of {total} requests
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
};
