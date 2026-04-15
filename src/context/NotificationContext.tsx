/**
 * Notification Context
 * Global notification/toast management
 */

import React, { createContext, useState, useCallback } from 'react';
import type { UiNotification } from '../types';

interface NotificationContextType {
  notifications: UiNotification[];
  addNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
  removeNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<UiNotification[]>([]);

  const addNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 5000) => {
      const id = Date.now().toString();
      const notification: UiNotification = {
        id,
        message,
        type,
        duration,
      };

      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        setTimeout(() => removeNotification(id), duration);
      }
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};
