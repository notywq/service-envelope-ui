/**
 * Enhanced Email Template Manager Component
 * Improved WYSIWYG editor with placeholder browser and live preview
 * Supports dynamic template variable substitution
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Typography,
  Stack,
  Tabs,
  Tab,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';
import type { EmailTemplate } from '../types';

interface EditingTemplate extends EmailTemplate {
  isNew?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const AVAILABLE_VARIABLES = [
  { category: 'System', variables: ['{{requestId}}', '{{currentTimestamp}}', '{{frontendBaseUrl}}'] },
  { category: 'Request', variables: ['{{firstName}}', '{{lastName}}', '{{email}}', '{{initiatorName}}'] },
  { category: 'Approval', variables: ['{{approvalDeadline}}', '{{requiredApprovers}}', '{{approvalLink}}'] },
  { category: 'Payment', variables: ['{{totalAmount}}', '{{paymentLink}}', '{{currency}}'] },
  { category: 'Delivery', variables: ['{{deliveryMethod}}', '{{trackingNumber}}', '{{estimatedDelivery}}'] },
  { category: 'Feedback', variables: ['{{feedbackLink}}', '{{surveyExpiryDate}}', '{{npsQuestion}}'] },
];

export const EnhancedEmailTemplateManager: React.FC = () => {
  const { addNotification } = useNotification();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.getEmailTemplates();
      setTemplates(response.templates || []);
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError(err.response?.data?.error || 'Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplate({
      id: '',
      name: '',
      subject: '',
      htmlBody: '',
      description: '',
      envelopeType: 'request',
      phase: 'start',
      isNew: true,
    });
    setTabValue(0);
    setShowDialog(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate({ ...template, isNew: false });
    setTabValue(0);
    setShowDialog(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      setSubmitting(true);
      await api.deleteEmailTemplate(templateId);
      addNotification('Template deleted successfully', 'success');
      loadTemplates();
    } catch (err: any) {
      addNotification(
        err.response?.data?.error || 'Failed to delete template',
        'error'
      );
    } finally {
      setSubmitting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;

    if (!editingTemplate.name || !editingTemplate.subject || !editingTemplate.htmlBody) {
      addNotification('Please fill in all required fields', 'warning');
      return;
    }

    try {
      setSubmitting(true);

      if (editingTemplate.isNew) {
        await api.createEmailTemplate({
          id: editingTemplate.name.toLowerCase().replace(/\s+/g, '-'),
          name: editingTemplate.name,
          subject: editingTemplate.subject,
          htmlBody: editingTemplate.htmlBody,
          description: editingTemplate.description,
        });
        addNotification('Template created successfully', 'success');
      } else {
        await api.updateEmailTemplate(editingTemplate.id, {
          name: editingTemplate.name,
          subject: editingTemplate.subject,
          htmlBody: editingTemplate.htmlBody,
          description: editingTemplate.description,
        });
        addNotification('Template updated successfully', 'success');
      }

      setShowDialog(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (err: any) {
      addNotification(
        err.response?.data?.error || 'Failed to save template',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const insertVariable = (variable: string) => {
    if (!editingTemplate) return;
    const textarea = document.getElementById('htmlBody') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody =
        editingTemplate.htmlBody.substring(0, start) +
        variable +
        editingTemplate.htmlBody.substring(end);
      setEditingTemplate({ ...editingTemplate, htmlBody: newBody });
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }
  };

  const handleCopyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    addNotification('Variable copied to clipboard', 'info');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header with Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Email Templates</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewTemplate}
        >
          New Template
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Templates Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Envelope Type</TableCell>
              <TableCell>Phase</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  <Typography color="textSecondary">No templates yet. Create one to get started.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {template.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary" noWrap>
                      {template.subject}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={template.envelopeType || 'custom'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={template.phase || 'N/A'}
                      size="small"
                      color={template.phase === 'start' ? 'primary' : 'secondary'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEditTemplate(template)}
                      title="Edit"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setDeleteConfirmId(template.id)}
                      title="Delete"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit/Create Template Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editingTemplate?.isNew ? 'Create New Template' : 'Edit Template'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {editingTemplate && (
            <Stack spacing={2}>
              {/* Basic Info */}
              <TextField
                fullWidth
                label="Template Name"
                value={editingTemplate.name}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                placeholder="e.g., Approval Start Email"
              />

              <TextField
                fullWidth
                label="Subject Line"
                value={editingTemplate.subject}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                placeholder="e.g., {{requestId}} - Approval Required"
              />

              <TextField
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={editingTemplate.description || ''}
                onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                placeholder="Brief description of when this template is used"
              />

              {/* Envelope & Phase Selection */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <FormControl fullWidth>
                    <FormLabel>Envelope Type</FormLabel>
                    <RadioGroup
                      value={editingTemplate.envelopeType || 'request'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, envelopeType: e.target.value as any })}
                    >
                      <FormControlLabel value="request" control={<Radio />} label="Request" />
                      <FormControlLabel value="approval" control={<Radio />} label="Approval" />
                      <FormControlLabel value="payment" control={<Radio />} label="Payment" />
                      <FormControlLabel value="processing" control={<Radio />} label="Processing" />
                      <FormControlLabel value="delivery" control={<Radio />} label="Delivery" />
                      <FormControlLabel value="feedback" control={<Radio />} label="Feedback" />
                    </RadioGroup>
                  </FormControl>
                </Box>
                <Box>
                  <FormControl fullWidth>
                    <FormLabel>Phase</FormLabel>
                    <RadioGroup
                      value={editingTemplate.phase || 'start'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, phase: e.target.value as any })}
                    >
                      <FormControlLabel value="start" control={<Radio />} label="Start (Process Begins)" />
                      <FormControlLabel value="end" control={<Radio />} label="End (Process Completes)" />
                    </RadioGroup>
                  </FormControl>
                </Box>
              </Box>

              {/* Template Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(_e, newValue) => setTabValue(newValue)}>
                  <Tab label="HTML Body" />
                  <Tab label="Variables" />
                  <Tab label="Preview" />
                </Tabs>
              </Box>

              {/* HTML Body Tab */}
              <TabPanel value={tabValue} index={0}>
                <TextField
                  id="htmlBody"
                  fullWidth
                  multiline
                  rows={8}
                  label="Email HTML"
                  value={editingTemplate.htmlBody}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, htmlBody: e.target.value })}
                  placeholder='<h1>Hello {{firstName}}</h1><p>Your request ({{requestId}}) needs approval.</p>'
                  font-family="monospace"
                  sx={{ fontFamily: 'monospace' }}
                />
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  Enter HTML content. Use {'{'}variable{'}'} placeholders to insert dynamic content.
                </Typography>
              </TabPanel>

              {/* Variables Tab */}
              <TabPanel value={tabValue} index={1}>
                <Stack spacing={3}>
                  {AVAILABLE_VARIABLES.map((group) => (
                    <Box key={group.category}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                        {group.category}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        {group.variables.map((variable) => (
                          <Chip
                            key={variable}
                            label={variable}
                            onClick={() => insertVariable(variable)}
                            onDelete={() => handleCopyVariable(variable)}
                            deleteIcon={<CopyIcon />}
                            variant="outlined"
                            size="small"
                          />
                        ))}
                      </Stack>
                    </Box>
                  ))}
                  <Alert severity="info">
                    Click a variable to insert it at the cursor position. Click the copy icon to copy it.
                  </Alert>
                </Stack>
              </TabPanel>

              {/* Preview Tab */}
              <TabPanel value={tabValue} index={2}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Subject:</Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="body2">
                      {editingTemplate.subject || '(No subject)'}
                    </Typography>
                  </Paper>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Body Preview:</Typography>
                  <Paper
                    sx={{
                      p: 2,
                      backgroundColor: '#f5f5f5',
                      minHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    <Box
                      dangerouslySetInnerHTML={{
                        __html: editingTemplate.htmlBody || '<p>(No content)</p>',
                      }}
                      sx={{
                        '& h1, & h2, & h3': { color: '#1976d2' },
                        '& p': { margin: '8px 0' },
                      }}
                    />
                  </Paper>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    This is a preview. Variable placeholders are shown as-is.
                  </Alert>
                </Box>
              </TabPanel>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveTemplate}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Save Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Delete Template?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this template? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button
            onClick={() => deleteConfirmId && handleDeleteTemplate(deleteConfirmId)}
            color="error"
            variant="contained"
            disabled={submitting}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
