/**
 * Custom hook for notifications
 */

import { useContext } from 'react';
import { NotificationContext } from '../context/NotificationContextValue';

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
