/**
 * Dynamic Form Field Component
 * Renders appropriate form field based on parameter schema type
 * Supports: String, Number, Boolean, Date, Dropdown, Radio, Checkboxes
 */

import React, { useMemo } from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  Switch,
  FormControl,
  FormLabel,
  FormGroup,
  FormHelperText,
  Select,
  MenuItem,
  RadioGroup,
  Radio,
  Typography,
} from '@mui/material';
import type { ParameterSchema } from '../types';

interface DynamicFormFieldProps {
  fieldName: string;
  schema: ParameterSchema;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  fieldName,
  schema,
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const label = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');
  const isRequired = schema.required ?? false;
  const description = schema.description;
  const helperText = error || description;

  const renderField = useMemo(() => {
    switch (schema.type) {
      case 'String': {
        const stringSchema = schema as any;
        const isMultiline = stringSchema.maxLength && stringSchema.maxLength > 100;
        return (
          <TextField
            fullWidth
            label={label}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            required={isRequired}
            disabled={disabled}
            placeholder={stringSchema.placeholder}
            error={!!error}
            helperText={helperText}
            multiline={isMultiline}
            rows={isMultiline ? 4 : 1}
          />
        );
      }

      case 'Number': {
        return (
          <TextField
            fullWidth
            type="number"
            label={label}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')}
            required={isRequired}
            disabled={disabled}
            error={!!error}
            helperText={helperText}
          />
        );
      }

      case 'Boolean': {
        const booleanSchema = schema as any;
        return (
          <FormControlLabel
            control={
              <Switch
                checked={value ?? booleanSchema.default ?? false}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {label}
                  {isRequired && <span style={{ color: 'red' }}> *</span>}
                </Typography>
                {description && <Typography variant="caption">{description}</Typography>}
              </Box>
            }
          />
        );
      }

      case 'Date': {
        return (
          <TextField
            fullWidth
            type="date"
            label={label}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            required={isRequired}
            disabled={disabled}
            slotProps={{
              inputLabel: { shrink: true },
            }}
            error={!!error}
            helperText={helperText}
          />
        );
      }

      case 'Dropdown': {
        const dropdownSchema = schema as any;
        return (
          <FormControl fullWidth error={!!error} disabled={disabled}>
            <FormLabel required={isRequired}>{label}</FormLabel>
            <Select
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">
                <em>Select an option</em>
              </MenuItem>
              {dropdownSchema.options.map((option: any) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                  {option.description && ` - ${option.description}`}
                </MenuItem>
              ))}
            </Select>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
          </FormControl>
        );
      }

      case 'Radio': {
        const radioSchema = schema as any;
        return (
          <FormControl disabled={disabled} error={!!error} component="fieldset">
            <FormLabel component="legend" required={isRequired}>
              {label}
            </FormLabel>
            <RadioGroup
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
            >
              {radioSchema.options.map((option: any) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio />}
                  label={
                    <Box>
                      <Typography variant="body2">{option.label}</Typography>
                      {option.description && (
                        <Typography variant="caption" color="textSecondary">
                          {option.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
            {helperText && <FormHelperText>{helperText}</FormHelperText>}
          </FormControl>
        );
      }

      case 'Checkboxes': {
        const checkboxesSchema = schema as any;
        const selectedValues = Array.isArray(value) ? value : [];
        const handleChange = (optionValue: any) => {
          const newValues = selectedValues.includes(optionValue)
            ? selectedValues.filter((v) => v !== optionValue)
            : [...selectedValues, optionValue];
          
          // Check max selections
          if (checkboxesSchema.maxSelections && newValues.length > checkboxesSchema.maxSelections) {
            return;
          }
          onChange(newValues);
        };

        return (
          <FormControl disabled={disabled} error={!!error} component="fieldset">
            <FormLabel component="legend" required={isRequired}>
              {label}
            </FormLabel>
            {description && <FormHelperText>{description}</FormHelperText>}
            <FormGroup>
              {checkboxesSchema.options.map((option: any) => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      checked={selectedValues.includes(option.value)}
                      onChange={() => handleChange(option.value)}
                      disabled={
                        disabled ||
                        (checkboxesSchema.maxSelections &&
                          !selectedValues.includes(option.value) &&
                          selectedValues.length >= checkboxesSchema.maxSelections)
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">{option.label}</Typography>
                      {option.description && (
                        <Typography variant="caption" color="textSecondary">
                          {option.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              ))}
            </FormGroup>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );
      }

      default:
        return (
          <TextField
            fullWidth
            label={label}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            error={!!error}
            helperText={helperText}
          />
        );
    }
  }, [schema, fieldName, value, label, isRequired, description, error, disabled, onChange]);

  return <Box sx={{ mb: 2 }}>{renderField}</Box>;
};
