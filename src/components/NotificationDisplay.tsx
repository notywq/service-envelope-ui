/**
 * Notification Toast Display Component
 */

import React from 'react';
import {
  Alert,
  Box,
  Stack,
} from '@mui/material';
import { useNotification } from '../hooks/useNotification';

export const NotificationDisplay: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <Stack
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {notifications.map((notif) => (
        <Box
          key={notif.id}
          sx={{
            mb: 1,
            pointerEvents: 'auto',
          }}
        >
          <Alert
            severity={notif.type}
            onClose={() => removeNotification(notif.id)}
            variant="filled"
            sx={{
              minWidth: '300px',
              maxWidth: '500px',
            }}
          >
            {notif.message}
          </Alert>
        </Box>
      ))}
    </Stack>
  );
};
