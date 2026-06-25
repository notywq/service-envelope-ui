import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Block as DeactivateIcon,
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Autorenew as RotateIcon,
  Save as SaveIcon,
  VpnKey as SecretIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import type { ApiClientCredentials, ApiClientRecord, ApiClientScopeGroup } from '../types';

const emptyForm = {
  name: '',
  role: 'orchestrator',
  scopes: [] as string[],
  isActive: true,
  metadataText: '{}',
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export const ApiClientManager: React.FC = () => {
  const { addNotification } = useNotification();
  const [clients, setClients] = useState<ApiClientRecord[]>([]);
  const [scopeGroups, setScopeGroups] = useState<ApiClientScopeGroup[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingScopes, setLoadingScopes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scopeError, setScopeError] = useState('');
  const [secretReveal, setSecretReveal] = useState<{
    credentials: ApiClientCredentials;
    clientName: string;
    message?: string;
  } | null>(null);
  const [secretAcknowledged, setSecretAcknowledged] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<ApiClientRecord | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ApiClientRecord | null>(null);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getApiClients();
      setClients(response.clients || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load API clients');
    } finally {
      setLoading(false);
    }
  };

  const loadScopes = async () => {
    try {
      setLoadingScopes(true);
      setScopeError('');
      const response = await api.getApiClientScopes();
      setScopeGroups(response.scopeGroups || []);
    } catch (err: any) {
      setScopeError(err.response?.data?.error || 'Failed to load API client scopes');
    } finally {
      setLoadingScopes(false);
    }
  };

  useEffect(() => {
    loadClients();
    loadScopes();
  }, []);

  const knownScopes = useMemo(
    () => scopeGroups.flatMap((group) => group.scopes.map((scope) => scope.scope)),
    [scopeGroups]
  );

  const allKnownScopesSelected = knownScopes.length > 0 && knownScopes.every((scope) => form.scopes.includes(scope));

  const resetForm = () => {
    setSelectedClientId('');
    setForm(emptyForm);
    setEditorOpen(false);
  };

  const openCreateForm = () => {
    setSelectedClientId('');
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const toggleScope = (scope: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      scopes: checked
        ? Array.from(new Set([...current.scopes, scope]))
        : current.scopes.filter((item) => item !== scope),
    }));
  };

  const toggleScopeGroup = (scopes: string[], checked: boolean) => {
    setForm((current) => ({
      ...current,
      scopes: checked
        ? Array.from(new Set([...current.scopes, ...scopes]))
        : current.scopes.filter((scope) => !scopes.includes(scope)),
    }));
  };

  const toggleAllKnownScopes = (checked: boolean) => {
    setForm((current) => ({
      ...current,
      scopes: checked
        ? Array.from(new Set([...current.scopes, ...knownScopes]))
        : current.scopes.filter((scope) => !knownScopes.includes(scope)),
    }));
  };

  const removeScope = (scope: string) => {
    setForm((current) => ({ ...current, scopes: current.scopes.filter((item) => item !== scope) }));
  };

  const editClient = (client: ApiClientRecord) => {
    setSelectedClientId(client.clientId);
    setForm({
      name: client.name || '',
      role: 'orchestrator',
      scopes: client.scopes || [],
      isActive: client.isActive !== false,
      metadataText: JSON.stringify(client.metadata || {}, null, 2),
    });
    setEditorOpen(true);
  };

  const parseMetadata = () => {
    try {
      const parsed = form.metadataText.trim() ? JSON.parse(form.metadataText) : {};
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        addNotification('Metadata must be a JSON object', 'warning');
        return null;
      }
      return parsed;
    } catch {
      addNotification('Metadata must be valid JSON', 'warning');
      return null;
    }
  };

  const saveClient = async () => {
    if (!form.name.trim()) {
      addNotification('Client name is required', 'warning');
      return;
    }

    const metadata = parseMetadata();
    if (!metadata) return;

    const payload = {
      name: form.name.trim(),
      role: 'orchestrator',
      scopes: form.scopes,
      isActive: form.isActive,
      metadata,
    };

    try {
      setSaving(true);
      if (selectedClientId) {
        await api.updateApiClient(selectedClientId, payload);
        addNotification('API client updated', 'success');
      } else {
        const response = await api.createApiClient(payload);
        addNotification('API client created', 'success');
        setSecretReveal({
          credentials: response.credentials,
          clientName: response.client?.name || payload.name,
          message: response.message,
        });
        setSecretAcknowledged(false);
      }
      resetForm();
      loadClients();
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Failed to save API client', 'error');
    } finally {
      setSaving(false);
    }
  };

  const rotateSecret = async () => {
    if (!rotateTarget) return;
    try {
      setSaving(true);
      const response = await api.rotateApiClientSecret(rotateTarget.clientId);
      addNotification('API client secret rotated', 'success');
      setRotateTarget(null);
      setSecretReveal({
        credentials: response.credentials,
        clientName: response.client?.name || rotateTarget.name,
        message: response.message,
      });
      setSecretAcknowledged(false);
      loadClients();
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Failed to rotate client secret', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deactivateClient = async () => {
    if (!deactivateTarget) return;
    try {
      setSaving(true);
      await api.deleteApiClient(deactivateTarget.clientId);
      addNotification('API client deactivated', 'success');
      if (selectedClientId === deactivateTarget.clientId) resetForm();
      setDeactivateTarget(null);
      loadClients();
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Failed to deactivate API client', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copyValue = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    addNotification(`${label} copied`, 'info');
  };

  const refreshData = () => {
    loadClients();
    loadScopes();
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>API Clients</Typography>
        <Typography variant="body2" color="textSecondary">
          Issue machine credentials for trusted integrations. Client secrets are shown only once on create or rotation.
        </Typography>
      </Box>

      <Accordion
        sx={{
          bgcolor: '#eef6ff',
          border: '1px solid #90caf9',
          borderLeft: '5px solid #1976d2',
          boxShadow: 'none',
          overflow: 'hidden',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon sx={{ color: '#0d47a1' }} />}
          sx={{
            alignItems: 'center',
            bgcolor: '#dbeeff',
            minHeight: 56,
            '& .MuiAccordionSummary-content': { my: 1, alignItems: 'center' },
            '& .MuiAccordionSummary-expandIconWrapper': { alignSelf: 'center' },
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', textAlign: 'left' }}>
            <SecretIcon fontSize="small" sx={{ color: '#0d47a1' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#0d47a1' }}>
              How to: Use API Clients
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ bgcolor: '#f7fbff' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
            <Typography variant="body2">
              API clients are for machine-to-machine integrations. Human admins still sign in with OTP; backend systems use a client ID and secret to request a bearer token.
            </Typography>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>1. Create and store the credentials</Typography>
              <Box component="ul" sx={{ pl: 2.5, m: 0, display: 'grid', gap: 0.5 }}>
                <Typography component="li" variant="body2">Choose a clear name, endpoint scopes, and optional metadata for the integration owner.</Typography>
                <Typography component="li" variant="body2">After create, copy the <code>clientId</code> and <code>clientSecret</code> immediately. The secret is shown once and cannot be recovered later.</Typography>
                <Typography component="li" variant="body2">If a secret is lost or exposed, rotate it. The old secret stops working immediately.</Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>2. Exchange credentials for a token</Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  bgcolor: '#f6f8fa',
                  border: '1px solid #e6eefc',
                  borderRadius: 1,
                  fontSize: '0.78rem',
                  overflow: 'auto',
                }}
              >{`POST /api/auth/client-token
Content-Type: application/json

{
  "clientId": "cli_...",
  "clientSecret": "sec_..."
}`}</Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                OAuth-style fields are also accepted: <code>grant_type</code>, <code>client_id</code>, and <code>client_secret</code>.
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>3. Call the API with bearer auth</Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  bgcolor: '#f6f8fa',
                  border: '1px solid #e6eefc',
                  borderRadius: 1,
                  fontSize: '0.78rem',
                  overflow: 'auto',
                }}
              >{`Authorization: Bearer <accessToken>`}</Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                API clients use the orchestrator role for machine auth. Scopes should limit which endpoint groups the client can use. They cannot manage admin routes, mock routes, OTP users, or other API clients.
              </Typography>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {error && <Alert severity="error">{error}</Alert>}
      {scopeError && <Alert severity="warning">{scopeError}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refreshData}
          disabled={saving || loading || loadingScopes}
        >
          Refresh
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateForm}
          disabled={saving}
        >
          Create API Client
        </Button>
      </Box>

      <Collapse in={editorOpen} unmountOnExit>
        <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {selectedClientId ? 'Edit API Client' : 'Create API Client'}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
              <TextField
                label="Name"
                size="small"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Student Portal Backend"
              />
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  px: 1.5,
                  py: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="caption" color="textSecondary">Role</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>orchestrator</Typography>
                </Box>
                <Chip label="Machine auth" size="small" variant="outlined" />
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                Scopes
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
                Choose the endpoint groups this client can use.
              </Typography>
              {loadingScopes ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : scopeGroups.length === 0 ? (
                <Alert severity="info">
                  No scope catalog was returned by the API.
                </Alert>
              ) : (
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="textSecondary">
                      {form.scopes.filter((scope) => knownScopes.includes(scope)).length} of {knownScopes.length} catalog scopes selected
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => toggleAllKnownScopes(!allKnownScopesSelected)}
                    >
                      {allKnownScopesSelected ? 'Clear all' : 'Select all'}
                    </Button>
                  </Box>

                  {scopeGroups.map((group) => {
                    const groupScopes = group.scopes.map((scope) => scope.scope);
                    const selectedCount = groupScopes.filter((scope) => form.scopes.includes(scope)).length;
                    const groupChecked = groupScopes.length > 0 && selectedCount === groupScopes.length;
                    const groupIndeterminate = selectedCount > 0 && selectedCount < groupScopes.length;

                    return (
                      <Accordion
                        key={group.id}
                        disableGutters
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          boxShadow: 'none',
                          bgcolor: '#fff',
                          '&:before': { display: 'none' },
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            px: 1.5,
                            py: 0.75,
                            '& .MuiAccordionSummary-content': { my: 0.5, minWidth: 0 },
                          }}
                        >
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                              gap: 1,
                              alignItems: 'center',
                              width: '100%',
                              minWidth: 0,
                              pr: 1,
                              textAlign: 'left',
                            }}
                          >
                            <Checkbox
                              size="small"
                              checked={groupChecked}
                              indeterminate={groupIndeterminate}
                              onClick={(event) => event.stopPropagation()}
                              onFocus={(event) => event.stopPropagation()}
                              onChange={(event) => toggleScopeGroup(groupScopes, event.target.checked)}
                              sx={{ p: 0.25 }}
                            />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{group.label}</Typography>
                              {group.description && (
                                <Typography variant="body2" color="textSecondary" sx={{ overflowWrap: 'anywhere' }}>
                                  {group.description}
                                </Typography>
                              )}
                            </Box>
                            <Chip
                              label={`${selectedCount}/${group.scopes.length}`}
                              size="small"
                              variant="outlined"
                              sx={{ flexShrink: 0 }}
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1.5 }}>
                          <Stack spacing={1}>
                            {group.scopes.map((scope) => (
                              <Box
                                key={scope.scope}
                                sx={{
                                  display: 'grid',
                                  gridTemplateColumns: 'auto minmax(0, 1fr)',
                                  gap: 1,
                                  alignItems: 'flex-start',
                                  borderTop: '1px solid',
                                  borderColor: 'divider',
                                  pt: 1,
                                  textAlign: 'left',
                                }}
                              >
                                <Checkbox
                                  size="small"
                                  checked={form.scopes.includes(scope.scope)}
                                  onChange={(event) => toggleScope(scope.scope, event.target.checked)}
                                  sx={{ p: 0.25, mt: 0.25 }}
                                />
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{scope.label}</Typography>
                                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontFamily: 'Courier New, monospace', overflowWrap: 'anywhere' }}>
                                    {scope.scope}
                                  </Typography>
                                  {scope.description && (
                                    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.25, overflowWrap: 'anywhere' }}>
                                      {scope.description}
                                    </Typography>
                                  )}
                                  {scope.endpoints && scope.endpoints.length > 0 && (
                                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.75, flexWrap: 'wrap' }}>
                                      {scope.endpoints.map((endpoint) => (
                                        <Chip
                                          key={endpoint}
                                          label={endpoint}
                                          size="small"
                                          variant="outlined"
                                          sx={{ fontFamily: 'Courier New, monospace', maxWidth: '100%' }}
                                        />
                                      ))}
                                    </Stack>
                                  )}
                                </Box>
                              </Box>
                            ))}
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Stack>
              )}

              <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
                {form.scopes.map((scope) => (
                  <Chip
                    key={scope}
                    label={scope}
                    size="small"
                    color={knownScopes.includes(scope) ? 'primary' : 'default'}
                    variant={knownScopes.includes(scope) ? 'filled' : 'outlined'}
                    onDelete={() => removeScope(scope)}
                    sx={knownScopes.includes(scope) ? { color: 'white' } : undefined}
                  />
                ))}
                {form.scopes.length === 0 && (
                  <Typography variant="caption" color="textSecondary">No scopes selected.</Typography>
                )}
              </Stack>
            </Box>

            <TextField
              fullWidth
              multiline
              minRows={3}
              size="small"
              label="Metadata JSON"
              value={form.metadataText}
              onChange={(event) => setForm({ ...form, metadataText: event.target.value })}
              sx={{ '& textarea': { fontFamily: 'Courier New, monospace' } }}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />}
                label="Active"
              />
              <Box sx={{ flex: 1 }} />
              <Button onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={saveClient} disabled={saving}>
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
        </Card>
      </Collapse>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : clients.length === 0 ? (
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: '#fbfbfb',
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography color="textSecondary">No API clients found.</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {clients.map((client) => {
            const isActive = client.isActive !== false;
            const scopeCount = (client.scopes || []).length;
            const hasMetadata = client.metadata && Object.keys(client.metadata).length > 0;

            return (
              <Accordion
                key={client.clientId}
                disableGutters
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  boxShadow: 'none',
                  overflow: 'hidden',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { borderColor: 'primary.light' },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: '#fff',
                    '& .MuiAccordionSummary-content': { my: 0.5, minWidth: 0 },
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        md: 'minmax(220px, 1.3fr) minmax(210px, auto) minmax(170px, auto) auto',
                      },
                      gap: 1.5,
                      alignItems: 'center',
                      width: '100%',
                      minWidth: 0,
                      pr: 1.5,
                    }}
                  >
                    <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                      <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                        {client.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ display: 'block', fontFamily: 'Courier New, monospace', overflowWrap: 'anywhere' }}
                      >
                        {client.clientId}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                      <Chip label={client.role} size="small" variant="outlined" />
                      <Chip
                        label={isActive ? 'Active' : 'Inactive'}
                        color={isActive ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                      <Chip label={`${scopeCount} scope${scopeCount === 1 ? '' : 's'}`} size="small" variant="outlined" />
                    </Stack>

                    <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                        Last used
                      </Typography>
                      <Typography variant="body2">{formatDate(client.lastUsedAt)}</Typography>
                    </Box>

                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' } }}
                      onClick={(event) => event.stopPropagation()}
                      onFocus={(event) => event.stopPropagation()}
                    >
                      <Tooltip title="Edit API client">
                        <IconButton size="small" onClick={() => editClient(client)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Rotate secret">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => setRotateTarget(client)}
                            disabled={saving || !isActive}
                          >
                            <RotateIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Deactivate API client">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeactivateTarget(client)}
                            disabled={saving || !isActive}
                          >
                            <DeactivateIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Box>
                </AccordionSummary>

                <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
                        gap: 2,
                      }}
                    >
                      {[
                        ['Client ID', client.clientId],
                        ['Role', client.role],
                        ['Created', formatDate(client.createdAt)],
                        ['Rotated', formatDate(client.rotatedAt)],
                      ].map(([label, value]) => (
                        <Box key={label} sx={{ minWidth: 0, textAlign: 'left' }}>
                          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            {label}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: label === 'Client ID' ? 'Courier New, monospace' : undefined, overflowWrap: 'anywhere' }}
                          >
                            {value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    <Box sx={{ mt: 2, textAlign: 'left' }}>
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                        Scopes
                      </Typography>
                      <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.75, flexWrap: 'wrap' }}>
                        {scopeCount > 0 ? (
                          client.scopes.map((scope) => <Chip key={scope} label={scope} size="small" variant="outlined" />)
                        ) : (
                          <Typography variant="body2" color="textSecondary">No scopes</Typography>
                        )}
                      </Stack>
                    </Box>

                    {hasMetadata && (
                      <Box sx={{ mt: 2, textAlign: 'left' }}>
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                          Metadata
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            mt: 0.75,
                            m: 0,
                            p: 1.5,
                            bgcolor: '#f6f8fa',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            fontSize: '0.78rem',
                            overflow: 'auto',
                          }}
                        >
                          {JSON.stringify(client.metadata, null, 2)}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}

      <Dialog
        open={Boolean(secretReveal)}
        onClose={() => {
          if (secretAcknowledged) setSecretReveal(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary', fontWeight: 700 }}>
          <SecretIcon sx={{ color: 'primary.main' }} />
          Store API Client Secret
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              {secretReveal?.message || 'Store this clientSecret now. It cannot be retrieved again after this dialog is closed.'}
            </Alert>
            <Typography variant="body2">
              Credentials for <strong>{secretReveal?.clientName}</strong>
            </Typography>
            <TextField
              label="Client ID"
              value={secretReveal?.credentials.clientId || ''}
              fullWidth
              size="small"
              slotProps={{ input: { readOnly: true } }}
            />
            <Button
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={() => secretReveal && copyValue('Client ID', secretReveal.credentials.clientId)}
            >
              Copy Client ID
            </Button>
            <TextField
              label="Client Secret"
              value={secretReveal?.credentials.clientSecret || ''}
              fullWidth
              size="small"
              slotProps={{ input: { readOnly: true } }}
            />
            <Button
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={() => secretReveal && copyValue('Client secret', secretReveal.credentials.clientSecret)}
            >
              Copy Client Secret
            </Button>
            <FormControlLabel
              control={<Checkbox checked={secretAcknowledged} onChange={(event) => setSecretAcknowledged(event.target.checked)} />}
              label="I have stored this secret securely"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSecretReveal(null)} disabled={!secretAcknowledged} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(rotateTarget)} onClose={() => setRotateTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Rotate API Client Secret?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography>
              The old secret for <strong>{rotateTarget?.name}</strong> will stop working immediately. A new secret will be shown once.
            </Typography>
            <Alert severity="warning">
              Make sure the integration owner is ready to update their stored credential.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRotateTarget(null)} disabled={saving}>Cancel</Button>
          <Button onClick={rotateSecret} variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={20} /> : <SecretIcon />}>
            Rotate Secret
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deactivateTarget)} onClose={() => setDeactivateTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Deactivate API Client?</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography>
              New token exchanges for <strong>{deactivateTarget?.name}</strong> will fail after deactivation.
            </Typography>
            <Alert severity="info">
              Existing JWTs already issued before deactivation remain valid until they expire.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateTarget(null)} disabled={saving}>Cancel</Button>
          <Button onClick={deactivateClient} color="error" variant="contained" disabled={saving}>
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};
