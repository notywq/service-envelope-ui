import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  PersonOff as DeactivateIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import type { AuthUser } from '../types';

const emptyForm = {
  email: '',
  name: '',
  role: 'requester',
  isActive: true,
  allowedForOtp: true,
};

export const AuthUserManager: React.FC = () => {
  const { addNotification } = useNotification();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getAuthUsers();
      setUsers(response.users || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load OTP users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const editUser = (user: AuthUser) => {
    setSelectedEmail(user.email);
    setForm({
      email: user.email,
      name: user.name || '',
      role: user.role || 'requester',
      isActive: user.isActive !== false,
      allowedForOtp: user.allowedForOtp !== false,
    });
  };

  const resetForm = () => {
    setSelectedEmail('');
    setForm(emptyForm);
  };

  const saveUser = async () => {
    if (!form.email.trim()) {
      addNotification('Email is required', 'warning');
      return;
    }

    try {
      setSaving(true);
      if (selectedEmail) {
        await api.updateAuthUser(selectedEmail, {
          name: form.name,
          role: form.role,
          isActive: form.isActive,
          allowedForOtp: form.allowedForOtp,
        });
        addNotification('OTP user updated', 'success');
      } else {
        await api.createAuthUser({
          email: form.email.trim(),
          name: form.name,
          role: form.role,
          isActive: form.isActive,
          allowedForOtp: form.allowedForOtp,
        });
        addNotification('OTP user created', 'success');
      }
      resetForm();
      loadUsers();
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Failed to save OTP user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deactivateUser = async (email: string) => {
    try {
      setSaving(true);
      await api.deleteAuthUser(email);
      addNotification('OTP access deactivated', 'success');
      loadUsers();
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Failed to deactivate OTP access', 'error');
    } finally {
      setSaving(false);
    }
  };

  const flushOtp = async () => {
    try {
      setSaving(true);
      await api.flushOtpChallenges();
      addNotification('Stale OTP challenges flushed', 'success');
    } catch (err: any) {
      addNotification(err.response?.data?.error || 'Failed to flush OTP challenges', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>OTP Users & Roles</Typography>
        <Typography variant="body2" color="textSecondary">
          Manage Mongo-backed users allowed to receive login OTPs. This area is restricted to super_admin.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {selectedEmail ? 'Edit OTP User' : 'Create OTP User'}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 2fr 1fr' }, gap: 2 }}>
              <TextField
                label="Email"
                size="small"
                value={form.email}
                disabled={Boolean(selectedEmail)}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <TextField
                label="Name"
                size="small"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <FormControl size="small">
                <InputLabel id="role-label">Role</InputLabel>
                <Select
                  labelId="role-label"
                  label="Role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <MenuItem value="requester">requester</MenuItem>
                  <MenuItem value="admin">admin</MenuItem>
                  <MenuItem value="orchestrator">orchestrator</MenuItem>
                  <MenuItem value="super_admin">super_admin</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
                label="Active"
              />
              <FormControlLabel
                control={<Switch checked={form.allowedForOtp} onChange={(e) => setForm({ ...form, allowedForOtp: e.target.checked })} />}
                label="Allowed for OTP"
              />
              <Box sx={{ flex: 1 }} />
              {selectedEmail && (
                <Button onClick={resetForm} disabled={saving}>
                  New User
                </Button>
              )}
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={flushOtp} disabled={saving}>
                Flush OTP
              </Button>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={saveUser} disabled={saving}>
                {saving ? <CircularProgress size={20} /> : 'Save'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>OTP</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No OTP users found.</TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.email} hover>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.name || '-'}</TableCell>
                  <TableCell><Chip label={user.role} size="small" /></TableCell>
                  <TableCell>{user.isActive !== false ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell>{user.allowedForOtp !== false ? 'Allowed' : 'Blocked'}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Edit OTP user">
                      <IconButton size="small" onClick={() => editUser(user)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Deactivate OTP access">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deactivateUser(user.email)}
                          disabled={saving}
                        >
                          <DeactivateIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};
