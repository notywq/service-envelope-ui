import React, { useState } from 'react';
import {
  Box,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { ApiClientManager } from './ApiClientManager';
import { AuthUserManager } from './AuthUserManager';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </Box>
  );
}

export const AccessManagement: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Box>
      <Box sx={{ mb: 1, textAlign: 'left' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Access Management</Typography>
      </Box>

      <Paper variant="outlined">
        <Tabs
          value={tabValue}
          onChange={(_, value) => setTabValue(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="OTP Users" />
          <Tab label="API Clients" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <AuthUserManager />
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <ApiClientManager />
      </TabPanel>
    </Box>
  );
};
