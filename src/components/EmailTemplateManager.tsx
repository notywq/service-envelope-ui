/**
 * Email Template Manager Component
 * Create, edit, and delete email templates
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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { useNotification } from '../hooks/useNotification';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  description?: string;
  variables?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface EditingTemplate extends EmailTemplate {
  isNew?: boolean;
}

export const EmailTemplateManager: React.FC = () => {
  const { addNotification } = useNotification();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.getEmailTemplates();
      setTemplates(response.templates || []);
    } catch (err) {
      addNotification('Failed to load email templates', 'error');
      console.error('Error loading templates:', err);
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
      isNew: true,
    });
    setDialogOpen(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate({
      ...template,
      isNew: false,
    });
    setDialogOpen(true);
  };

  const extractVariablesFromText = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    const variables = matches.map(match => match.replace(/\{\{|\}\}/g, ''));
    return [...new Set(variables)];
  };

  const getEditingTemplateVariables = (): string[] => {
    if (!editingTemplate) return [];
    const subjectVars = extractVariablesFromText(editingTemplate.subject);
    const bodyVars = extractVariablesFromText(editingTemplate.htmlBody);
    return [...new Set([...subjectVars, ...bodyVars])];
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
  };

  const sampleEmailTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Request Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
  <div style="background-color: #f5f7fa; padding: 40px 20px;">
    <!-- Email Container -->
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 600;">Service Request Notification</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Request ID: {{requestId}}</p>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px 30px; color: #333333;">
        
        <!-- Greeting -->
        <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
          Hello <strong>{{studentName}}</strong>,
        </p>

        <!-- Message -->
        <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 25px; border-radius: 4px;">
          <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #555555;">
            Your <strong>{{requestType}}</strong> request has been received and is currently being processed. 
            Thank you for using our service.
          </p>
        </div>

        <!-- Details Table -->
        <div style="margin-bottom: 30px;">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #333333;">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #666666; width: 120px;"><strong>Request ID:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #333333;">{{requestId}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #666666;"><strong>Type:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #333333;">{{requestType}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #666666;"><strong>Status:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #333333;">{{status}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #666666;"><strong>Submitted:</strong></td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #333333;">{{submittedDate}}</td>
            </tr>
          </table>
        </div>

        <!-- Action Section -->
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="{{approvalLink}}" style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 4px; font-weight: 600; font-size: 15px; transition: background-color 0.3s;">
            Review Request
          </a>
        </div>

        <!-- Next Steps -->
        <div style="background-color: #f0f4ff; padding: 20px; border-radius: 4px; margin-bottom: 25px;">
          <h3 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 600; color: #333333;">What You Need To Do</h3>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #555555;">
            <li>Click the "Review Request" button above to view the full request details</li>
            <li>Review the request information carefully</li>
            <li>Approve or deny the request with your feedback</li>
            <li>Your approval link will expire in 7 days</li>
          </ul>
        </div>

        <!-- Support -->
        <p style="margin: 0 0 25px 0; font-size: 14px; line-height: 1.6; color: #666666;">
          If you have any questions, please contact our support team at 
          <a href="mailto:support@example.com" style="color: #667eea; text-decoration: none;">support@example.com</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #777777;">
        <p style="margin: 0 0 10px 0;">
          <strong>Service Envelope Portal</strong><br>
          Mapua MultiCampus
        </p>
        <p style="margin: 0;">
          <a href="{{portalUrl}}" style="color: #667eea; text-decoration: none; margin: 0 10px;">Dashboard</a> • 
          <a href="{{supportUrl}}" style="color: #667eea; text-decoration: none; margin: 0 10px;">Help</a> • 
          <a href="{{privacyUrl}}" style="color: #667eea; text-decoration: none; margin: 0 10px;">Privacy</a>
        </p>
        <p style="margin: 15px 0 0 0; font-size: 11px; color: #999999;">
          This is an automated message from the Service Envelope Portal. Please do not reply to this email.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const handleLoadSampleTemplate = () => {
    setEditingTemplate({
      id: 'request-notification',
      name: 'Service Request Notification',
      subject: 'Service Request {{requestId}} - {{requestType}}',
      htmlBody: sampleEmailTemplate,
      description: 'Standard email template for service request notifications',
      isNew: true,
    });
    setDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;

    if (!editingTemplate.id.trim()) {
      addNotification('Template ID is required', 'error');
      return;
    }

    if (!editingTemplate.name.trim()) {
      addNotification('Template name is required', 'error');
      return;
    }

    if (!editingTemplate.subject.trim()) {
      addNotification('Email subject is required', 'error');
      return;
    }

    if (!editingTemplate.htmlBody.trim()) {
      addNotification('Email body is required', 'error');
      return;
    }

    try {
      setSaving(true);

      if (editingTemplate.isNew) {
        await api.createEmailTemplate({
          id: editingTemplate.id,
          name: editingTemplate.name,
          subject: editingTemplate.subject,
          htmlBody: editingTemplate.htmlBody,
          description: editingTemplate.description,
        });
        addNotification(`Template "${editingTemplate.name}" created successfully`, 'success');
      } else {
        await api.updateEmailTemplate(editingTemplate.id, {
          name: editingTemplate.name,
          subject: editingTemplate.subject,
          htmlBody: editingTemplate.htmlBody,
          description: editingTemplate.description,
        });
        addNotification(`Template "${editingTemplate.name}" updated successfully`, 'success');
      }

      handleCloseDialog();
      loadTemplates();
    } catch (err: any) {
      addNotification(
        err.response?.data?.error || 'Failed to save template',
        'error'
      );
      console.error('Error saving template:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${templateName}"?`)) {
      return;
    }

    try {
      await api.deleteEmailTemplate(templateId);
      addNotification(`Template "${templateName}" deleted successfully`, 'success');
      loadTemplates();
    } catch (err: any) {
      addNotification(
        err.response?.data?.error || 'Failed to delete template',
        'error'
      );
      console.error('Error deleting template:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Email Templates
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleLoadSampleTemplate}
          >
            Load Sample
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewTemplate}
            size="small"
          >
            New Template
          </Button>
        </Box>
      </Box>

      {/* Templates Table */}
      {templates.length === 0 ? (
        <Alert severity="info">
          No email templates yet. Create one to get started.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Variables</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id} hover>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {template.id}
                    </Typography>
                  </TableCell>
                  <TableCell>{template.name}</TableCell>
                  <TableCell sx={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {template.subject}
                  </TableCell>
                  <TableCell>
                    {template.variables && template.variables.length > 0 ? (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {template.variables.slice(0, 3).map((variable) => (
                          <Chip
                            key={variable}
                            label={`{{${variable}}}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {template.variables.length > 3 && (
                          <Chip
                            label={`+${template.variables.length - 3}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="textSecondary">
                        No variables
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleEditTemplate(template)}
                      title="Edit template"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteTemplate(template.id, template.name)}
                      title="Delete template"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: { sx: { height: '90vh', display: 'flex', flexDirection: 'column', maxWidth: '900px' } }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editingTemplate?.isNew ? 'Create Email Template' : 'Edit Email Template'}
            <IconButton size="small" onClick={handleCloseDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0, overflow: 'hidden', flex: 1, display: 'flex' }}>
          {/* Left Column - Form */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Template ID */}
            <TextField
              fullWidth
              label="Template ID"
              placeholder="e.g., approval-pending, request-submitted"
              value={editingTemplate?.id || ''}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate!, id: e.target.value })
              }
              disabled={!editingTemplate?.isNew || saving}
              size="small"
              helperText="Unique identifier used to reference this template"
            />

            {/* Template Name */}
            <TextField
              fullWidth
              label="Template Name"
              placeholder="e.g., Approval Pending Notification"
              value={editingTemplate?.name || ''}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate!, name: e.target.value })
              }
              disabled={saving}
              size="small"
            />

            {/* Email Subject */}
            <TextField
              fullWidth
              label="Email Subject"
              placeholder="e.g., Your request requires approval - {{requestId}}"
              value={editingTemplate?.subject || ''}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate!, subject: e.target.value })
              }
              disabled={saving}
              size="small"
              helperText="Supports variables like {{studentName}}, {{requestId}}, etc."
            />

            {/* Email Body */}
            <TextField
              fullWidth
              label="HTML Email Body"
              placeholder="HTML content with {{variableName}} placeholders"
              value={editingTemplate?.htmlBody || ''}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate!, htmlBody: e.target.value })
              }
              disabled={saving}
              multiline
              rows={6}
              size="small"
              helperText="Use {{variableName}} for placeholders. Basic HTML supported."
            />

            {/* Description */}
            <TextField
              fullWidth
              label="Description"
              placeholder="What is this template used for?"
              value={editingTemplate?.description || ''}
              onChange={(e) =>
                setEditingTemplate({ ...editingTemplate!, description: e.target.value })
              }
              disabled={saving}
              multiline
              rows={2}
              size="small"
            />
          </Box>

          {/* Right Column - Variables Preview */}
          <Box
            sx={{
              width: '280px',
              borderLeft: '1px solid #e0e0e0',
              p: 2,
              overflow: 'auto',
              bgcolor: '#f5f7fa',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#333', fontSize: '14px' }}>
                📋 Variables Preview
              </Typography>
              {getEditingTemplateVariables().length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {getEditingTemplateVariables().map((variable) => (
                    <Chip
                      key={variable}
                      label={`{{${variable}}}`}
                      size="small"
                      variant="outlined"
                      sx={{ justifyContent: 'flex-start' }}
                    />
                  ))}
                </Box>
              ) : (
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: '#fff',
                    border: '1px dashed #ccc',
                    borderRadius: 1,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="caption" color="textSecondary">
                    No variables detected yet
                  </Typography>
                </Box>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#333', fontSize: '14px' }}>
                ✨ Quick Reference
              </Typography>
              <Box sx={{ fontSize: '12px', color: '#666', lineHeight: 1.8 }}>
                <Box sx={{ mb: 0.5 }}>
                  <strong>Common Variables:</strong>
                </Box>
                <Box sx={{ fontFamily: 'monospace', fontSize: '11px', mb: 0.5 }}>
                  • studentName
                </Box>
                <Box sx={{ fontFamily: 'monospace', fontSize: '11px', mb: 0.5 }}>
                  • requestId
                </Box>
                <Box sx={{ fontFamily: 'monospace', fontSize: '11px', mb: 0.5 }}>
                  • requestType
                </Box>
                <Box sx={{ fontFamily: 'monospace', fontSize: '11px', mb: 0.5 }}>
                  • approverName
                </Box>
                <Box sx={{ fontFamily: 'monospace', fontSize: '11px' }}>
                  • status
                </Box>
              </Box>
            </Box>

            {editingTemplate?.subject && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#333', fontSize: '14px' }}>
                  👁️ Subject Preview
                </Typography>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    fontSize: '12px',
                    color: '#555',
                    wordBreak: 'break-word',
                    maxHeight: '100px',
                    overflow: 'auto',
                  }}
                >
                  {editingTemplate.subject}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1, position: 'sticky', bottom: 0, backgroundColor: '#fff', borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={handleCloseDialog} variant="outlined" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveTemplate}
            variant="contained"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
