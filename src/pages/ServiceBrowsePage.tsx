/**
 * Service Browse Page
 * Displays all available services in a browsable UI
 * Allows users to view service details and start a new request
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Stack,
  Chip,
  Paper,
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowForward as ArrowForwardIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import YAML from 'js-yaml';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import type { ServiceDefinition } from '../types';

interface ServiceWithDetails extends ServiceDefinition {
  parameterCount?: number;
  hasDelivery?: boolean;
  hasPayment?: boolean;
}

export const ServiceBrowsePage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const [services, setServices] = useState<ServiceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.getServices();
        
        // Parse YAML to extract additional details
        const servicesWithDetails = (response.services || []).map((service) => {
          let parameterCount = 0;
          let hasDelivery = false;
          let hasPayment = false;

          try {
            if (service.yaml) {
              const parsed = YAML.load(service.yaml) as any;
              parameterCount = Object.keys(
                parsed?.envelopes?.request?.parameters || {}
              ).length;
              hasDelivery = !!parsed?.envelopes?.delivery;
              hasPayment = !!parsed?.envelopes?.payment;
            }
          } catch (err) {
            console.error('Error parsing service YAML:', err);
          }

          return {
            ...service,
            parameterCount,
            hasDelivery,
            hasPayment,
          };
        });

        setServices(servicesWithDetails);
      } catch (err: any) {
        console.error('Error loading services:', err);
        setError(err.response?.data?.error || 'Failed to load services');
        addNotification('Failed to load services', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, [addNotification]);

  const filteredServices = services.filter((service) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      service.name.toLowerCase().includes(searchLower) ||
      service.description?.toLowerCase().includes(searchLower) ||
      service.serviceId?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 0, md: 0 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Available Services
        </Typography>
        <Typography color="textSecondary">
          Browse and submit requests for any of our available services
        </Typography>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search services by name, description, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
          size="small"
        />
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* No Services */}
      {!loading && services.length === 0 && (
        <Alert severity="info">
          No services available at this time. Please check back later.
        </Alert>
      )}

      {/* Services Table */}
      {!loading && filteredServices.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Service</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Details</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Tags</TableCell>
                <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredServices.map((service) => (
                <TableRow key={service.id} hover>
                  {/* Service Name */}
                  <TableCell sx={{ fontWeight: 500 }}>{service.name}</TableCell>

                  {/* Service ID */}
                  <TableCell>
                    <Typography variant="caption" color="textSecondary">
                      {service.serviceId || service.id}
                    </Typography>
                  </TableCell>

                  {/* Description */}
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={service.description}
                    >
                      {service.description || 'No description'}
                    </Typography>
                  </TableCell>

                  {/* Tags/Chips */}
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {service.parameterCount && service.parameterCount > 0 && (
                        <Chip
                          size="small"
                          label={`${service.parameterCount} field${service.parameterCount !== 1 ? 's' : ''}`}
                          variant="outlined"
                        />
                      )}
                      {service.hasDelivery && (
                        <Chip
                          size="small"
                          label="Delivery"
                          color="primary"
                          variant="filled"
                          sx={{ color: 'white' }}
                        />
                      )}
                      {service.hasPayment && (
                        <Chip
                          size="small"
                          label="Payment"
                          color="warning"
                          variant="filled"
                          sx={{ color: 'white' }}
                        />
                      )}
                    </Stack>
                  </TableCell>

                  {/* Actions */}
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => navigate(`/requests/new?serviceId=${encodeURIComponent(service.serviceId || service.id)}`)}
                      title="Request this service"
                    >
                      <ArrowForwardIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* No Results */}
      {!loading && services.length > 0 && filteredServices.length === 0 && (
        <Alert severity="info" icon={<InfoIcon />}>
          No services match your search. Try a different search term.
        </Alert>
      )}
    </Container>
  );
};
