import { createContext } from 'react';
import type { UiNotification } from '../types';

export interface NotificationContextType {
  notifications: UiNotification[];
  addNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
  removeNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);
