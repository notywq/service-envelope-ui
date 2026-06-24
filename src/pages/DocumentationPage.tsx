/**
 * Documentation Page
 * Interactive guide for SERVICE_DEFINITION_RULES.yaml
 * Displays learning guides and YAML code blocks organized by sections
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Stack,
  ButtonGroup,
  Card,
  CardContent,
  Divider,
  Alert,
  Chip,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  NavigateBefore as NavigateBeforeIcon,
  Code as CodeIcon,
  MenuBook as MenuBookIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { parseDocumentation } from '../utils/documentationParser';
import '../styles/documentation.css';

export const DocumentationPage: React.FC = () => {
  const sections = parseDocumentation();
  const [currentSectionId, setCurrentSectionId] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const currentSection = sections[currentSectionId];
  const yamlBlocks =
    currentSection.yamlBlocks && currentSection.yamlBlocks.length > 0
      ? currentSection.yamlBlocks
      : currentSection.yamlContent
      ? [{ title: 'YAML Configuration', content: currentSection.yamlContent }]
      : [];

  const handleNext = () => {
    if (currentSectionId < sections.length - 1) {
      setCurrentSectionId(currentSectionId + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSectionId > 0) {
      setCurrentSectionId(currentSectionId - 1);
    }
  };

  const handleCopyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  /**
   * Parse learning guide text and apply smart typography
   * Handles ALL CAPS, parentheses, colons, status codes, etc.
   */
  const parseGuideWithTypography = (text: string): React.ReactNode => {
    // Pattern for status codes (0 = , 1 = , 2 = , 3 = )
    const statusCodePattern = /^(\d+\s*=\s*)(.*)$/;
    const statusMatch = text.match(statusCodePattern);

    if (statusMatch) {
      const [, code, description] = statusMatch;
      return (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Typography
            component="span"
            sx={{
              fontWeight: 700,
              color: '#d19a66',
              fontFamily: 'Fira Code, monospace',
              fontSize: '0.95em',
            }}
          >
            {code}
          </Typography>
          <Typography component="span" sx={{ textAlign: 'left', flex: 1 }}>
            {parseGuideText(description)}
          </Typography>
        </Box>
      );
    }

    return parseGuideText(text);
  };

  /**
   * Helper to parse guide text for formatting opportunities
   * Handles ALL_CAPS, parentheses, and regular text
   */
  const parseGuideText = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Match: (parentheses) or ALL_CAPS_WORDS (at least 2 consecutive uppercase letters)
    const regex = /\(([^)]+)\)|([A-Z]{2,}[A-Z0-9_]*)/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      if (match[1]) {
        // Parentheses content - italic and semi-bold
        parts.push(
          <Typography
            key={`paren-${match.index}`}
            component="span"
            sx={{ fontStyle: 'italic', fontWeight: 500, color: '#888' }}
          >
            ({match[1]})
          </Typography>
        );
      } else if (match[2]) {
        // ALL_CAPS word - bold and green
        parts.push(
          <Typography
            key={`caps-${match.index}`}
            component="span"
            sx={{ fontWeight: 700, color: '#27ae60' }}
          >
            {match[2]}
          </Typography>
        );
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return (
      <Typography component="span" sx={{ textAlign: 'left' }}>
        {parts}
      </Typography>
    );
  };

  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 0, md: 0 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <MenuBookIcon sx={{ fontSize: 40, color: '#1976d2' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Service Envelope Documentation
            </Typography>
            <Typography color="textSecondary">
              Learn how to create and configure Service Envelope YAML definitions
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Section Navigation Tabs */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: '#f5f5f5' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 3, textAlign: 'left' }}>
          Select a Section:
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 2,
          }}
        >
          {sections.map((section, idx) => (
            <Chip
              key={section.id}
              label={`${section.id}. ${section.title}`}
              onClick={() => setCurrentSectionId(idx)}
              color={currentSectionId === idx ? 'primary' : 'default'}
              variant={currentSectionId === idx ? 'filled' : 'outlined'}
              sx={{
                cursor: 'pointer',
                fontWeight: currentSectionId === idx ? 600 : 400,
                justifyContent: 'center',
              }}
            />
          ))}
        </Box>
      </Paper>

      {/* Current Section Display */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 3,
          mb: 4,
        }}
      >
        {/* Top: YAML Code Block */}
        <Box>
          {yamlBlocks.length > 0 && (
            <Stack spacing={2}>
              {yamlBlocks.map((block, blockIndex) => (
                <Card key={`${currentSection.id}-${blockIndex}`}>
                  <CardContent sx={{ p: 0 }}>
                    {/* Code Block Header */}
                    <Box
                      sx={{
                        bgcolor: '#282c34',
                        color: '#abb2bf',
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CodeIcon sx={{ fontSize: 20, color: '#61dafb' }} />
                        <Typography
                          sx={{
                            fontFamily: 'Fira Code, monospace',
                            fontSize: 14,
                            color: '#61dafb',
                            fontWeight: 600,
                          }}
                        >
                          {block.title || 'YAML Configuration'}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleCopyCode(block.content, blockIndex)}
                        sx={{
                          borderColor: '#61dafb',
                          color: '#61dafb',
                          '&:hover': {
                            borderColor: '#61dafb',
                            bgcolor: 'rgba(97, 218, 251, 0.1)',
                          },
                        }}
                      >
                        {copiedIndex === blockIndex ? '✓ Copied' : 'Copy'}
                      </Button>
                    </Box>

                    {/* Code Content */}
                    <Box
                      sx={{
                        bgcolor: '#282c34',
                        p: 3,
                        overflow: 'auto',
                        maxHeight: 600,
                        fontFamily: 'Fira Code, monospace',
                        fontSize: 13,
                        color: '#abb2bf',
                        lineHeight: 1.8,
                        textAlign: 'left',
                        '&::-webkit-scrollbar': {
                          width: 8,
                        },
                        '&::-webkit-scrollbar-track': {
                          bgcolor: '#1e2227',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          bgcolor: '#61dafb',
                          borderRadius: 4,
                        },
                      }}
                    >
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word',
                          textAlign: 'left',
                        }}
                      >
                        {block.content}
                      </pre>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>

        {/* Bottom: Section Info */}
        <Box>
          <Paper sx={{ p: 3, height: '100%', bgcolor: '#f0f4ff' }}>
            <Box sx={{ mb: 2, textAlign: 'left' }}>
              <Chip
                label={`Section ${currentSection.id}`}
                color="primary"
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {currentSection.title}
              </Typography>
              <Typography color="textSecondary" sx={{ mb: 3, textAlign: 'left' }}>
                {currentSection.description}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Learning Guides */}
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon fontSize="small" color="primary" />
                Key Learning Points:
              </Typography>
              <Stack spacing={1}>
                {currentSection.learningGuides.map((guide, idx) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Typography
                      sx={{
                        color: '#1976d2',
                        fontWeight: 600,
                        minWidth: 20,
                        mt: 0.5,
                      }}
                    >
                      •
                    </Typography>
                    <Box sx={{ lineHeight: 1.6, textAlign: 'left', flex: 1 }}>
                      {parseGuideWithTypography(guide)}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <ButtonGroup variant="outlined">
          <Button
            onClick={handlePrevious}
            disabled={currentSectionId === 0}
            startIcon={<NavigateBeforeIcon />}
          >
            Previous Section
          </Button>
          <Button disabled sx={{ cursor: 'default' }}>
            {currentSectionId + 1} / {sections.length}
          </Button>
          <Button
            onClick={handleNext}
            disabled={currentSectionId === sections.length - 1}
            endIcon={<NavigateNextIcon />}
          >
            Next Section
          </Button>
        </ButtonGroup>
      </Box>

      {/* Info Alert */}
      <Alert
        severity="info"
        sx={{ mt: 4, textAlign: 'left' }}
        icon={<InfoIcon />}
      >
        <Typography variant="body2" sx={{ textAlign: 'left' }}>
          <strong>💡 Tip:</strong> Use the section chips above to jump directly to any topic. Each section contains learning guides (key concepts) and YAML code examples for practical reference.
        </Typography>
      </Alert>
    </Container>
  );
};
